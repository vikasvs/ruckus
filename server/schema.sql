CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT,
    first_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    push_token TEXT,
    device_platform TEXT
);

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

CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_admin BOOLEAN DEFAULT FALSE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    notification_mode TEXT NOT NULL DEFAULT 'all_activity' CHECK (notification_mode IN ('all_activity', 'ruckus_only', 'watch_threshold', 'muted')),
    watch_threshold INTEGER CHECK (watch_threshold IN (2, 3)),
    watch_until TIMESTAMP WITH TIME ZONE,
    current_status TEXT CHECK (current_status IN ('rucked', 'ricked')),
    status_updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS status_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    status_type TEXT NOT NULL CHECK (status_type IN ('rucked', 'ricked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    previous_status TEXT CHECK (previous_status IN ('rucked', 'ricked')),
    source_event_id UUID REFERENCES status_events(id) ON DELETE SET NULL,
    ritual_instance_id UUID
);

CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    triggered_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status_type TEXT NOT NULL CHECK (status_type IN ('rucked', 'ricked')),
    recipient_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_ruckus_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    trigger_event_id UUID NOT NULL REFERENCES status_events(id) ON DELETE CASCADE,
    triggered_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    window_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    window_ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
    distinct_member_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_invite_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS status_event_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('status_event', 'burst')),
    target_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (emoji IN ('⚡', '🔥', '🍻', '🫡', '💀')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(target_type, target_id, user_id)
);

CREATE TABLE IF NOT EXISTS burst_roll_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    burst_id UUID NOT NULL UNIQUE REFERENCES group_ruckus_notifications(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS burst_roll_call_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roll_call_id UUID NOT NULL REFERENCES burst_roll_calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    response TEXT NOT NULL CHECK (response IN ('pulling_up', 'maybe', 'dead')),
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(roll_call_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_rituals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label TEXT NOT NULL CHECK (char_length(label) <= 40),
    prompt_template TEXT NOT NULL CHECK (char_length(prompt_template) <= 140),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    time_of_day TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ritual_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    ritual_id UUID NOT NULL REFERENCES group_rituals(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    notified_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(ritual_id, scheduled_for)
);

CREATE TABLE IF NOT EXISTS burst_recaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    burst_id UUID NOT NULL UNIQUE REFERENCES group_ruckus_notifications(id) ON DELETE CASCADE,
    roll_call_id UUID REFERENCES burst_roll_calls(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    caption TEXT,
    top_reaction TEXT CHECK (top_reaction IN ('⚡', '🔥', '🍻', '🫡', '💀')),
    reaction_total INTEGER NOT NULL DEFAULT 0,
    turnout_pulling_up INTEGER NOT NULL DEFAULT 0,
    turnout_maybe INTEGER NOT NULL DEFAULT 0,
    turnout_dead INTEGER NOT NULL DEFAULT 0,
    photo_count INTEGER NOT NULL DEFAULT 0,
    share_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE group_members ADD COLUMN IF NOT EXISTS notification_mode TEXT NOT NULL DEFAULT 'all_activity';
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS watch_threshold INTEGER;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS watch_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE status_events ADD COLUMN IF NOT EXISTS source_event_id UUID REFERENCES status_events(id) ON DELETE SET NULL;
ALTER TABLE status_events ADD COLUMN IF NOT EXISTS ritual_instance_id UUID;

CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_current_status ON group_members(current_status) WHERE current_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_members_notification_mode ON group_members(notification_mode);
CREATE INDEX IF NOT EXISTS idx_status_events_group_id ON status_events(group_id);
CREATE INDEX IF NOT EXISTS idx_status_events_user_id ON status_events(user_id);
CREATE INDEX IF NOT EXISTS idx_status_events_created_at ON status_events(created_at);
CREATE INDEX IF NOT EXISTS idx_status_events_source_event_id ON status_events(source_event_id);
CREATE INDEX IF NOT EXISTS idx_group_ruckus_notifications_group_id ON group_ruckus_notifications(group_id);
CREATE INDEX IF NOT EXISTS idx_group_ruckus_notifications_created_at ON group_ruckus_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_group_invite_links_group_id ON group_invite_links(group_id);
CREATE INDEX IF NOT EXISTS idx_status_event_reactions_target ON status_event_reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_burst_roll_calls_group_id ON burst_roll_calls(group_id);
CREATE INDEX IF NOT EXISTS idx_burst_roll_call_responses_roll_call_id ON burst_roll_call_responses(roll_call_id);
CREATE INDEX IF NOT EXISTS idx_group_rituals_group_id ON group_rituals(group_id);
CREATE INDEX IF NOT EXISTS idx_ritual_instances_group_id ON ritual_instances(group_id);
CREATE INDEX IF NOT EXISTS idx_burst_recaps_group_id ON burst_recaps(group_id);
