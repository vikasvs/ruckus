-- Enable the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    push_token TEXT,
    device_platform TEXT
);

-- Create the groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (char_length(name) <= 100),
    invite_code TEXT NOT NULL UNIQUE CHECK (char_length(invite_code) = 8),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- Create the group_members table
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_admin BOOLEAN DEFAULT FALSE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    current_status TEXT CHECK (current_status IN ('rucked', 'ricked')),
    status_updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(group_id, user_id)
);

-- Create the status_events table
CREATE TABLE IF NOT EXISTS status_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    status_type TEXT NOT NULL CHECK (status_type IN ('rucked', 'ricked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    previous_status TEXT CHECK (previous_status IN ('rucked', 'ricked'))
);

-- Create the notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    triggered_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status_type TEXT NOT NULL CHECK (status_type IN ('rucked', 'ricked')),
    recipient_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (only if they don't exist)
DO $$ 
BEGIN
    -- Users indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_phone') THEN
        CREATE INDEX idx_users_phone ON users(phone);
    END IF;

    -- Groups indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_groups_invite_code') THEN
        CREATE INDEX idx_groups_invite_code ON groups(invite_code);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_groups_created_by') THEN
        CREATE INDEX idx_groups_created_by ON groups(created_by);
    END IF;

    -- Group members indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_group_members_group_id') THEN
        CREATE INDEX idx_group_members_group_id ON group_members(group_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_group_members_user_id') THEN
        CREATE INDEX idx_group_members_user_id ON group_members(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_group_members_current_status') THEN
        CREATE INDEX idx_group_members_current_status ON group_members(current_status) WHERE current_status IS NOT NULL;
    END IF;

    -- Status events indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_status_events_group_id') THEN
        CREATE INDEX idx_status_events_group_id ON status_events(group_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_status_events_user_id') THEN
        CREATE INDEX idx_status_events_user_id ON status_events(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_status_events_created_at') THEN
        CREATE INDEX idx_status_events_created_at ON status_events(created_at);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_status_events_expires_at') THEN
        CREATE INDEX idx_status_events_expires_at ON status_events(expires_at);
    END IF;

    -- Notification logs indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notification_logs_group_id') THEN
        CREATE INDEX idx_notification_logs_group_id ON notification_logs(group_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notification_logs_created_at') THEN
        CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at);
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to avoid RLS recursion on group_members
CREATE OR REPLACE FUNCTION get_user_group_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT group_id FROM group_members WHERE user_id = uid;
$$;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
    -- Users policies
    DROP POLICY IF EXISTS "Users can view own profile" ON users;
    DROP POLICY IF EXISTS "Authenticated users can view profiles" ON users;
    DROP POLICY IF EXISTS "Users can insert own profile" ON users;
    DROP POLICY IF EXISTS "Users can update own profile" ON users;

    -- Groups policies
    DROP POLICY IF EXISTS "Users can view groups they're members of" ON groups;
    DROP POLICY IF EXISTS "Authenticated users can view groups" ON groups;
    DROP POLICY IF EXISTS "Users can create groups" ON groups;
    DROP POLICY IF EXISTS "Group creators can update their groups" ON groups;

    -- Group members policies
    DROP POLICY IF EXISTS "Users can view members of their groups" ON group_members;
    DROP POLICY IF EXISTS "Users can join groups" ON group_members;
    DROP POLICY IF EXISTS "Users can update their own membership" ON group_members;

    -- Status events policies
    DROP POLICY IF EXISTS "Users can view status events in their groups" ON status_events;
    DROP POLICY IF EXISTS "Users can create their own status events" ON status_events;

    -- Notification logs policies
    DROP POLICY IF EXISTS "Users can view notification logs for their groups" ON notification_logs;
    DROP POLICY IF EXISTS "Users can create notification logs" ON notification_logs;
END $$;

-- Users: all authenticated users can view profiles (needed for name resolution)
CREATE POLICY "Authenticated users can view profiles" ON users
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Groups: all authenticated users can view (needed for invite code lookup)
CREATE POLICY "Authenticated users can view groups" ON groups
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create groups" ON groups
    FOR INSERT WITH CHECK (auth.uid()::text = created_by::text);

CREATE POLICY "Group creators can update their groups" ON groups
    FOR UPDATE USING (auth.uid()::text = created_by::text);

-- Group members: users can see their own rows + members of their groups
CREATE POLICY "Users can view members of their groups" ON group_members
    FOR SELECT USING (
        auth.uid()::text = user_id::text
        OR group_id IN (SELECT get_user_group_ids(auth.uid()))
    );

CREATE POLICY "Users can join groups" ON group_members
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own membership" ON group_members
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Status events: use security definer function to avoid recursion
CREATE POLICY "Users can view status events in their groups" ON status_events
    FOR SELECT USING (
        group_id IN (SELECT get_user_group_ids(auth.uid()))
    );

CREATE POLICY "Users can create their own status events" ON status_events
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id::text AND
        group_id IN (SELECT get_user_group_ids(auth.uid()))
    );

-- Notification logs: use security definer function to avoid recursion
CREATE POLICY "Users can view notification logs for their groups" ON notification_logs
    FOR SELECT USING (
        group_id IN (SELECT get_user_group_ids(auth.uid()))
    );

CREATE POLICY "Users can create notification logs" ON notification_logs
    FOR INSERT WITH CHECK (
        group_id IN (SELECT get_user_group_ids(auth.uid()))
    );

-- Functions for cleanup and utilities

-- Function to cleanup expired statuses
CREATE OR REPLACE FUNCTION cleanup_expired_statuses()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Clear expired statuses from group_members
    UPDATE group_members 
    SET current_status = NULL, status_updated_at = NULL
    WHERE current_status IS NOT NULL 
    AND status_updated_at < NOW() - INTERVAL '4 hours';
    
    -- Optionally delete very old status_events (older than 30 days)
    DELETE FROM status_events 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Optionally delete old notification logs (older than 90 days)
    DELETE FROM notification_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Function to generate invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    characters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(characters, floor(random() * length(characters) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- Function to check if a user can perform an action (rate limiting check)
CREATE OR REPLACE FUNCTION check_rate_limit(
    user_id_param UUID,
    action_type TEXT,
    time_window INTERVAL,
    max_count INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    action_count INTEGER;
BEGIN
    IF action_type = 'status_update' THEN
        SELECT COUNT(*) INTO action_count
        FROM status_events
        WHERE user_id = user_id_param 
        AND created_at > NOW() - time_window;
    ELSIF action_type = 'group_join' THEN
        SELECT COUNT(*) INTO action_count
        FROM group_members
        WHERE user_id = user_id_param 
        AND joined_at > NOW() - time_window;
    ELSIF action_type = 'group_create' THEN
        SELECT COUNT(*) INTO action_count
        FROM groups
        WHERE created_by = user_id_param 
        AND created_at > NOW() - time_window;
    ELSE
        RETURN FALSE;
    END IF;
    
    RETURN action_count < max_count;
END;
$$;

-- Create views for common queries
DROP VIEW IF EXISTS active_group_members;
CREATE VIEW active_group_members AS
SELECT 
    gm.*,
    u.first_name,
    g.name as group_name,
    g.invite_code
FROM group_members gm
JOIN users u ON gm.user_id = u.id
JOIN groups g ON gm.group_id = g.id
WHERE g.is_active = true;

DROP VIEW IF EXISTS recent_activity;
CREATE VIEW recent_activity AS
SELECT 
    se.*,
    u.first_name,
    g.name as group_name
FROM status_events se
JOIN users u ON se.user_id = u.id
JOIN groups g ON se.group_id = g.id
WHERE g.is_active = true
ORDER BY se.created_at DESC;