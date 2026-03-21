-- Fix RLS policies for Ruckus MVP
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/ysvhqyehxwyeysptubcx/sql)
--
-- This migration fixes:
-- 1. Infinite recursion in group_members SELECT policy (self-referencing subquery)
-- 2. Users unable to look up groups by invite code (needed for joining)
-- 3. Users unable to see their own group_members rows before joining any group
-- 4. Users unable to see other users' names (needed for activity feed + member list)
-- 5. Missing INSERT policy on users table (needed for sign-up profile creation)

-- Step 1: Create a security definer function that bypasses RLS
-- This function runs as the database owner, so it won't trigger RLS policies
CREATE OR REPLACE FUNCTION get_user_group_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT group_id FROM group_members WHERE user_id = uid;
$$;

-- Step 2: Drop all existing policies that need updating
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view members of their groups" ON group_members;
DROP POLICY IF EXISTS "Users can view groups they're members of" ON groups;
DROP POLICY IF EXISTS "Authenticated users can view groups" ON groups;
DROP POLICY IF EXISTS "Users can view status events in their groups" ON status_events;
DROP POLICY IF EXISTS "Users can create their own status events" ON status_events;
DROP POLICY IF EXISTS "Users can view notification logs for their groups" ON notification_logs;
DROP POLICY IF EXISTS "Users can create notification logs" ON notification_logs;

-- Step 3: Recreate policies with all fixes applied

-- Users: all authenticated users can view profiles (for name resolution in feeds)
CREATE POLICY "Authenticated users can view profiles" ON users
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users: can insert their own profile on sign-up
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Groups: all authenticated users can view (needed for invite code lookup when joining)
CREATE POLICY "Authenticated users can view groups" ON groups
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Group members: users can see their own rows + members of groups they belong to
-- The auth.uid() = user_id check allows users to see their own membership even
-- before get_user_group_ids returns results (fixes join flow chicken-and-egg)
CREATE POLICY "Users can view members of their groups" ON group_members
    FOR SELECT USING (
        auth.uid()::text = user_id::text
        OR group_id IN (SELECT get_user_group_ids(auth.uid()))
    );

-- Status events: use security definer function (no recursion)
CREATE POLICY "Users can view status events in their groups" ON status_events
    FOR SELECT USING (
        group_id IN (SELECT get_user_group_ids(auth.uid()))
    );

CREATE POLICY "Users can create their own status events" ON status_events
    FOR INSERT WITH CHECK (
        auth.uid()::text = user_id::text AND
        group_id IN (SELECT get_user_group_ids(auth.uid()))
    );

-- Notification logs: use security definer function (no recursion)
CREATE POLICY "Users can view notification logs for their groups" ON notification_logs
    FOR SELECT USING (
        group_id IN (SELECT get_user_group_ids(auth.uid()))
    );

CREATE POLICY "Users can create notification logs" ON notification_logs
    FOR INSERT WITH CHECK (
        group_id IN (SELECT get_user_group_ids(auth.uid()))
    );
