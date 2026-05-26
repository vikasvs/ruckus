# Ruckus - Product Specification v4.1

> This spec separates shipped behavior from planned enhancements so product, design, and engineering can reason from one truthful baseline without losing roadmap intent.

## 1. Product Overview

### Vision
Ruckus is a dead-simple vibe broadcast app that lets you tell your crew how you're feeling with a single tap. When people in a group are rucked up or ricked up, everyone else can see it immediately and get notified.

### Product Principles
- One tap is more important than feature depth
- First names only
- Group-only visibility
- Push notifications are a core product surface
- Shipped behavior and roadmap behavior should be documented separately

### Target Users
- Friend groups who want ambient awareness of each other's vibes
- Festival and concert crews
- College social groups
- Bachelor and bachelorette groups
- Any small crew that wants a lightweight way to keep tabs on each other

## 2. Shipped Product Behavior

### 2.1 Identity and Session
- First launch asks only for a first name
- The app creates a lightweight user record and stores the returned `userId` locally
- The shipped app does not currently use SMS, passwords, or verified phone auth
- Sign out clears the local session and returns the user to onboarding
- Users are visible to other group members only by first name

### 2.2 Home Experience
- Home shows the current user's groups
- Each group card shows:
  - Group name
  - Member count
  - Count of active rucked members
  - Count of active ricked members
- Users can create a group or join a group from the home screen
- Group cards support quick invite-code copy from the list
- Empty state messaging pushes users toward create or join

### 2.3 Group Creation and Joining
- Group names support 1-100 characters
- Each group gets an 8-character alphanumeric invite code
- Invite code entry is case-insensitive on input
- Groups are capped at 50 members
- The creator becomes the first admin
- After group creation, the app opens the group and shows a temporary invite banner with copy and share actions

### 2.4 Group Screen
- The group screen has two tabs:
  - `Activity`
  - `Members`
- The `Activity` tab shows:
  - The current user's active status
  - The two primary status buttons
  - Cooldown state and timer
  - Recent activity feed
- The `Members` tab shows:
  - Invite code
  - Copy and share actions
  - Group members list
  - Notification toggle for the current user in that group
- Group data refreshes on focus, pull-to-refresh, and 10-second polling while the group is open

### 2.5 Status System
- The two primary actions are:
  - `Rucked Up`
  - `Ricked Up`
- Users can have only one active status at a time
- Setting a new status overwrites the previous status
- Statuses automatically expire after 4 hours
- The shipped cooldown is 60 seconds shared across both buttons
- Cooldown is shown with:
  - A button overlay timer
  - A progress bar
- Status updates create activity feed entries and trigger direct push notifications to other group members

### 2.6 Notifications
- Direct status pushes are sent to other group members with notifications enabled
- Notification taps deep-link back into the relevant group
- Android uses separate push channels for `rucked` and `ricked`
- Members can toggle push notifications per group
- The shipped app does not yet include:
  - Quiet hours
  - Global notification preferences
  - Status-type notification filtering
  - Reaction notifications

### 2.7 Activity Feed
- Feed items show:
  - First name
  - Status type
  - Timestamp
- Activity is retrieved from the backend on demand and while polling
- The current feed does not yet support:
  - Reactions
  - Chain reactions
  - Synthetic group-level summary events

## 3. Planned Enhancements

### 3.1 Reactions
- Users can react to a status event with a curated emoji set
- Reaction counts should appear inline beneath each activity item
- Reaction notifications should be subtle and targeted to the broadcaster

### 3.2 Chain Reactions
- A chain reaction should let another user mirror a status from the feed
- Chain reactions should appear distinctly in the activity feed
- Chain reactions can use a shorter cooldown than the standard status action
- Chain reactions remain planned behavior, not shipped behavior

### 3.3 Authentication Hardening
- Phone or other verified auth may return in a future iteration
- If auth returns, it should preserve the "first names only" privacy model and keep the current low-friction feel

### 3.4 Notification Controls
- Global mute, quiet hours, richer per-group controls, and status-type filtering remain roadmap items

## 4. New Feature Scope: "The Group Is in a Ruckus"

### Goal
When a burst of activity hits a group, send a bigger, higher-signal summary notification so the moment feels collective instead of like three isolated status pushes.

### Trigger Rule
- Trigger when 3 or more distinct group members post either `rucked` or `ricked` statuses inside a rolling 5-minute window in the same group
- Mixed-status bursts count; the feature is about group energy, not only same-status matching
- Count each member once inside the active window for threshold purposes

### Notification Behavior
- Send a summary push to group members who have notifications enabled
- Default title: `[Group Name] is in a Ruckus`
- Default body: `3 people lit up in the last 5 minutes`
- If all qualifying statuses are the same type, the body can become more specific, for example:
  - `3 people are rucked up right now`
  - `3 people are ricked up right now`

### Delivery Guardrails
- Fire only when the group crosses the threshold, not on every event after the third
- Suppress repeat summary pushes for the same burst until the rolling window drops below threshold and crosses it again
- Keep the existing direct per-status pushes; the summary notification is additive, not a replacement
- Default behavior should exclude the user who triggered the threshold-crossing event, matching current direct-push behavior

### UI / Feed Impact
- V1 does not require a new mobile screen or settings surface
- Notification deep-link behavior should continue to open the relevant group
- Adding a synthetic activity-feed row for `Group is in a Ruckus` is optional follow-up work, not a launch requirement

### Success Criteria
- A burst of 3+ distinct members inside 5 minutes produces exactly one summary push for that burst
- Members still receive the existing per-status pushes
- A later burst can retrigger after the group falls below threshold and crosses it again
- Muted members do not receive the summary push

## 5. Technical Architecture

### Mobile Client
- React Native with Expo SDK 54
- Zustand for local app state
- AsyncStorage-backed lightweight session
- React Navigation stack plus bottom tabs
- Expo Notifications for token registration and deep-linking

### Backend
- Express + TypeScript API
- PostgreSQL on Railway
- REST endpoints for users, groups, and status activity
- Polling-based refresh on the client; WebSockets can come later

### Current Public Environment Contracts
- Mobile:
  - `EXPO_PUBLIC_API_URL`
  - `EXPO_PUBLIC_PROJECT_ID`
- Server:
  - `DATABASE_URL`
  - `PORT`

### Core Data Model
- `users`
- `groups`
- `group_members`
- `status_events`
- `notification_logs`

## 6. Product Notes
- The shipped cooldown is 60 seconds. Older drafts referenced 5 minutes; any future cooldown increase should be treated as an explicit product change, not assumed current behavior.
- Reactions, chains, and richer notification controls remain useful roadmap features, but they should stay labeled as planned until backed by code and release notes.
- The new `Group is in a Ruckus` feature fits the current backend model and can ship as a push-summary feature before any feed or realtime overhaul.
