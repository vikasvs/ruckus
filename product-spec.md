# Ruckus - Product Specification v4.0

## 1. Product Overview

### Vision
Ruckus is a dead-simple vibe broadcast app that lets you tell your crew how you're feeling with a single tap. Whether it's morning, afternoon, or late night — when you're feeling rucked up or ricked up, your people know instantly.

### Core Value Proposition
- **Instant vibe broadcasting** to friend groups — anytime, anywhere
- **Zero friction** — one tap to notify everyone
- **Two distinct states** — "rucked up" or "ricked up"
- **Reactions** — emoji reactions + chain reactions that cascade through the group
- **Privacy-first** — only share first names, never phone numbers

### Target Users
- Friend groups who want ambient awareness of each other's vibes
- Festival/concert crews
- College social groups
- Bachelor/bachelorette parties
- Any crew that wants to stay connected throughout the day

## 2. User Experience

### 2.1 Core User Flows

#### Sign Up Flow (First Time User)
1. Download and open app
2. Enter phone number
3. Receive SMS with 6-digit code
4. Enter verification code
5. Enter first name only
6. Land on empty home screen with "Join or Create Group" prompt

#### Join Group Flow
1. Tap "Join Group"
2. Enter 8-character invite code (not case-sensitive for better UX)
3. Instantly see group screen with members and activity

#### Primary Action Flow — Two Equal Buttons
1. Open app (no login needed if previously authenticated)
2. See list of groups
3. Tap into a group
4. See two equally prominent buttons:
   - **"Rucked Up"** button
   - **"Ricked Up"** button
5. Tap either button
6. All group members get push notification: "[Name] is [rucked/ricked] up @ 11:45 PM"
7. Button enters 5-minute cooldown state

#### Reaction Flow (P1)
1. See a status broadcast in the activity feed (or via push notification)
2. Tap/long-press to see emoji reactions
3. Select an emoji — it appears on the broadcast with a count
4. Other people can add the same or different emojis

#### Chain Reaction Flow (P2)
1. See a status broadcast in the feed
2. Tap the **chain emoji (🔗)** reaction
3. This broadcasts YOUR status as the same type (rucked/ricked) — automatically
4. Feed shows a "chain" event: "Jake ⛓️ Sarah's ruck — 3 in the chain!"
5. Chain reactions bypass normal cooldown (or have a shorter one)

### 2.2 Screen Specifications

#### Home Screen
- **Header**: "Ruckus" logo
- **Group List**:
  - Group name
  - Member count
  - Status indicators showing who's rucked/ricked up (color coded)
  - Last activity timestamp
- **FAB**: "+" button to create/join group
- **Empty State**: Friendly message with arrows pointing to create/join

#### Group Screen
- **Header**: Group name with member count
- **Two-Button Action Section** (takes up 40% of screen):
  - **"Rucked Up"** button (left side or top)
  - **"Ricked Up"** button (right side or bottom)
  - Both buttons equal size and prominence
  - Different colors for clear distinction
- **Activity Feed**:
  - Chronological list of recent broadcasts
  - Shows name, status type, timestamp, and **reaction counts**
  - Each feed item shows emoji reactions below it (e.g. 🔥x3 😂x2 ⛓️x1)
  - Chain reactions are visually distinct — show the chain with participants
  - Auto-refreshes with real-time updates
  - Color-coded by status type
- **Bottom Bar**:
  - Activity tab
  - Members tab

#### Members Screen
- List of all members (first name only)
- Visual indicator if currently rucked up (red) or ricked up (purple)
- Shows when they last changed status
- Invite code displayed at top with copy button

## 3. Feature Specifications

### 3.1 The Two-Button System

#### Button 1: "Rucked Up"
- **Color**: Red (#FF4458)
- **Position**: Left side (landscape) or top (portrait)
- **Behavior**:
  - Single tap triggers notification to all group members
  - Enters 5-minute cooldown (shows countdown timer)
  - Updates user's current status
  - Overrides any previous status
- **Notification**: "[Name] is rucked up @ [time]"

#### Button 2: "Ricked Up"
- **Color**: Purple (#9C27B0)
- **Position**: Right side (landscape) or bottom (portrait)
- **Behavior**:
  - Single tap triggers notification to all group members
  - Enters 5-minute cooldown (shows countdown timer)
  - Updates user's current status
  - Overrides any previous status
- **Notification**: "[Name] is ricked up @ [time]"

#### Status Management
- Users can only have ONE status at a time
- New status overrides previous status
- Status automatically clears after 4 hours
- Both buttons share the same 5-minute cooldown
- Visual feedback shows which status you currently have

### 3.2 Reactions (P1)

#### Emoji Reactions
- Users can react to any status broadcast in the activity feed
- Tap/long-press a feed item to open reaction picker
- Available emojis: 🔥 😂 💀 🫡 👀 ⛓️ (curated set, not full keyboard)
- Each reaction shows as a pill below the feed item with a count (e.g. 🔥 x3)
- Users can only react once per emoji per broadcast (tap again to remove)
- Reactions trigger a subtle push notification to the broadcaster: "[Name] reacted 🔥 to your ruck"

#### Chain Reactions (P2)
- The **⛓️ chain emoji** is a special reaction
- Tapping it also broadcasts YOUR status as the same type (rucked or ricked)
- Feed shows chain events distinctly: "Jake ⛓️ Sarah's ruck" with a chain count
- Multiple chains create a visible cascade: "Chain ruck! 🔗 Jake → Sarah → Mike"
- Chain reactions have a shorter cooldown (1 minute instead of 5)
- Chain notifications: "[Name] joined the chain ruck! (3 in the chain)"

### 3.3 Notifications

#### Notification Types

| Event | Notification Text | Color Code |
|-------|------------------|------------|
| Rucked Up | "[Name] is rucked up @ 11:45 PM" | Red |
| Ricked Up | "[Name] is ricked up @ 11:47 PM" | Purple |
| Status Change | "[Name] switched to ricked up @ 11:50 PM" | Purple |
| Reaction | "[Name] reacted 🔥 to your ruck" | Subtle |
| Chain Reaction | "[Name] joined the chain ruck! (3 deep)" | Red/Purple |
| Multiple Active | "3 people are rucked up in [Group]" | Red |

#### Notification Settings
- Global on/off
- Per-group muting
- Quiet hours (user-defined)
- Sound selection (different sounds for rucked vs ricked)
- Filter by status type

### 3.4 Groups

#### Group Properties
- **Name**: 1-100 characters
- **Size Limit**: 50 members (hard cap)
- **Invite Code**: 8 characters, alphanumeric, non-expiring
- **Creation**: Any user can create unlimited groups
- **Deletion**: Groups auto-archive after 90 days of inactivity

#### Group Roles
- **Creator**: First admin (can't be removed)
- **Admin**: Can remove members (future feature)
- **Member**: Can use both buttons, react, and invite others

#### Group Display
- Shows count of rucked up members
- Shows count of ricked up members
- Activity feed shows broadcasts with reaction counts
- Members sorted by most recent activity

### 3.5 Anti-Spam & Safety Features

#### Cooldowns
- **Shared Cooldown**: 5 minutes after pressing either button
- **Chain Cooldown**: 1 minute (shorter to encourage cascades)
- **Notification Throttling**: Max 10 notifications per group per hour
- **SMS Rate Limiting**: 3 verification attempts per hour

#### Privacy Protection
- Phone numbers never visible to any users
- No user search functionality
- No public groups — invite code only
- No user profiles beyond first name
- No message content — only structured notifications

## 4. Technical Architecture

### 4.1 Technology Stack

#### Backend: Express + PostgreSQL on Railway
- **API Server**: Express.js with TypeScript
- **Database**: PostgreSQL (Railway plugin)
- **Realtime**: Polling (10s interval), WebSockets (future)
- **Push Notifications**: Expo Push Notifications
- **Deployment**: Railway with auto-deploy from GitHub

#### Mobile: React Native
- **Framework**: React Native with Expo SDK 54
- **State Management**: Zustand
- **Push Notifications**: Expo Push Notifications
- **Navigation**: React Navigation (Stack + Bottom Tabs)

### 4.2 Database Schema

#### Tables

**users**
- id (uuid, primary key, auto-generated)
- first_name (text, not null)
- created_at (timestamptz, default now)
- push_token (text, nullable)

**groups**
- id (uuid, primary key, auto-generated)
- name (text, not null)
- invite_code (text, unique, not null)
- created_by (uuid, foreign key → users)
- created_at (timestamptz, default now)

**group_members**
- id (uuid, primary key, auto-generated)
- group_id (uuid, foreign key → groups)
- user_id (uuid, foreign key → users)
- role (text, default 'member')
- joined_at (timestamptz, default now)
- unique(group_id, user_id)

**status_events**
- id (uuid, primary key, auto-generated)
- user_id (uuid, foreign key → users)
- group_id (uuid, foreign key → groups)
- status_type (text, 'rucked' or 'ricked')
- created_at (timestamptz, default now)
- expires_at (timestamptz, default now + 4 hours)

**reactions** (P1)
- id (uuid, primary key, auto-generated)
- status_event_id (uuid, foreign key → status_events)
- user_id (uuid, foreign key → users)
- emoji (text, not null)
- created_at (timestamptz, default now)
- is_chain (boolean, default false)
- unique(status_event_id, user_id, emoji)

### 4.3 API Endpoints

**Users**
- `POST /api/users` — create user (first_name)
- `GET /api/users/:id` — get user
- `PATCH /api/users/:id` — update user

**Groups**
- `POST /api/groups` — create group
- `POST /api/groups/join` — join group by invite code
- `GET /api/groups/user/:userId` — list user's groups
- `GET /api/groups/:id` — get group details
- `GET /api/groups/:id/members` — list members

**Status**
- `POST /api/status` — broadcast status
- `GET /api/status/group/:groupId` — active statuses in group
- `GET /api/status/activity/:groupId` — activity feed (with reaction counts)
- `GET /api/status/cooldown/:userId/:groupId` — check cooldown

**Reactions** (P1)
- `POST /api/reactions` — add reaction (emoji, status_event_id, user_id)
- `DELETE /api/reactions/:id` — remove reaction
- `GET /api/reactions/event/:statusEventId` — get reactions for a broadcast

## 5. Business Rules

### 5.1 Status Rules
1. Users can only have one active status at a time
2. Pressing either button overrides previous status
3. Status automatically expires after 4 hours
4. Both buttons share the same 5-minute cooldown
5. Status changes trigger notifications to all group members

### 5.2 Reaction Rules (P1)
1. Users can react with any curated emoji to any broadcast
2. One reaction per emoji per user per broadcast (toggle on/off)
3. Chain reaction (⛓️) also broadcasts the user's status as the same type
4. Chain reactions have a 1-minute cooldown (not 5)
5. Reaction notifications are lower priority than status notifications

### 5.3 Notification Rules
1. Always notify all group members except sender
2. Include status type in notification (rucked/ricked)
3. Different notification sounds for different statuses
4. Include timestamp in user's local timezone
5. Deep link to specific group when tapped
6. Reaction notifications only go to the broadcaster (not whole group)

### 5.4 Group Management Rules
1. Creator automatically becomes admin
2. Groups require at least 1 member to stay active
3. 50 member hard limit (return error if exceeded)
4. Invite codes are permanent and reusable
5. No duplicate members allowed

### 5.5 Rate Limiting Rules

| Action | Limit | Window | Response |
|--------|-------|--------|----------|
| SMS Verification | 3 | 1 hour | "Too many attempts, try again later" |
| Status Button | 1 | 5 minutes | Show countdown timer |
| Chain Reaction | 1 | 1 minute | Show countdown timer |
| Join Groups | 10 | 1 hour | "Slow down, partner" |
| Create Groups | 20 | 24 hours | "Group creation limit reached" |

## 6. Priority Tiers

### P0 — MVP (Current Build)
- Two-button status broadcasting
- Groups with invite codes
- Activity feed
- Push notifications
- 5-minute cooldown
- Auth via first name only (no phone verification yet)

### P1 — Reactions
- Emoji reactions on status broadcasts
- Reaction counts in activity feed
- Reaction notifications to broadcaster

### P2 — Chain Reactions
- Chain emoji (⛓️) triggers cascade broadcasting
- Chain events in feed with participant list
- Shorter cooldown for chains

### P3 — Home Screen Widget
- iOS/Android widget for one-tap broadcasting without opening app
- Shows current status and recent group activity

### P4 — Full Auth + Polish
- Phone number verification (SMS)
- Notification settings (quiet hours, per-group mute, sound selection)
- Admin features (remove members)
- Analytics integration

## 7. Open Questions

- **Widget multi-group**: When widget broadcasts, which group does it go to? Options: one widget per group, broadcast to all groups, or a default group with long-press to switch.
- **Widget interaction**: How does the widget handle rucked vs ricked? Two buttons on widget, or single button that alternates?
- **Chain cooldown**: Is 1 minute right, or should chains be completely cooldown-free to maximize cascade energy?
- **Reaction set**: Is the curated emoji set (🔥 😂 💀 🫡 👀 ⛓️) the right set? Should it be customizable per group?

## 8. Security & Privacy

### 8.1 Security Measures
- All API calls over HTTPS
- No sensitive data in push notifications
- Rate limiting on all endpoints

### 8.2 Privacy Features
- Minimal data collection (first name only for MVP)
- No location tracking
- No read receipts or online status beyond the 4-hour window
- Data deletion on request
- No public groups — invite code only

## 9. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Notification delivery failures | High | Use multiple providers, add in-app indicators |
| Status confusion | Medium | Clear color coding, good UX education |
| Server overload | High | Railway auto-scaling, rate limiting |
| Invite code sharing publicly | Low | Monitor for unusual join patterns |
| Chain reaction spam | Medium | Chain cooldown + notification throttling |

---

## Appendix A: UI/UX Guidelines

### Design Principles
1. **Equal Prominence**: Both buttons must be equally accessible
2. **Clear Distinction**: Colors and labels must be obviously different
3. **Instant Feedback**: Every action has immediate response
4. **Minimal Steps**: Max 2 taps to send notification
5. **Dark Mode First**: Assume use in dim environments

### Color Palette
- Rucked Up: Red (#FF4458)
- Ricked Up: Purple (#9C27B0)
- Success: Green (#4CAF50)
- Background: Dark (#121212)
- Surface: Gray (#1E1E1E)

### Button Design
- Equal size (each takes 45% of width)
- Large touch targets (minimum 88pt height)
- Clear visual feedback on press
- Countdown timer overlay during cooldown
- Current status highlighted with border

---

## Appendix B: Notification Copy Examples

**Status Notifications**
- "[Name] is rucked up @ 11:45 PM"
- "[Name] is ricked up @ 11:47 PM"
- "[Name] switched to rucked up @ 11:50 PM"

**Reaction Notifications**
- "[Name] reacted 🔥 to your ruck"
- "[Name] reacted 😂 to your rick"

**Chain Notifications**
- "[Name] joined the chain ruck! (3 deep)"
- "Chain ruck in [Group]! Jake → Sarah → Mike"

**Group Status**
- "3 people are rucked up in [Group]"
- "2 people are ricked up in [Group]"

---

*End of Product Specification v4.0*
