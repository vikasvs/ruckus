# Ruckus - Product Specification v3.0

## 1. Product Overview

### Vision
Ruckus is a dead-simple group notification app that lets friends broadcast their party status to their crew with a single tap. It's designed for spontaneous social situations where you want your friends to know what state you're in.

### Core Value Proposition
- **Instant status broadcasting** to friend groups
- **Zero friction** - one tap to notify everyone
- **Two distinct states** - "rucked up" or "ricked up"
- **Privacy-first** - only share first names, never phone numbers

### Target Users
- Friend groups who go out together
- Festival/concert crews
- College social groups
- Bachelor/bachelorette parties
- Any group that parties together and looks out for each other

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

#### Primary Action Flow - Two Equal Buttons
1. Open app (no login needed if previously authenticated)
2. See list of groups
3. Tap into a group
4. See two equally prominent buttons:
   - **"Rucked Up"** button
   - **"Ricked Up"** button
5. Tap either button
6. All group members get push notification: "[Name] is [rucked/ricked] up @ 11:45 PM"
7. Button enters 5-minute cooldown state

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
- **Active Status Section**:
  - Live list of who's currently rucked up (red indicators)
  - Live list of who's currently ricked up (purple indicators)
  - Timestamps for each person
- **Two-Button Action Section** (takes up 40% of screen):
  - **"Rucked Up"** button (left side or top)
  - **"Ricked Up"** button (right side or bottom)
  - Both buttons equal size and prominence
  - Different colors for clear distinction
- **Activity Feed**:
  - Chronological list of recent events
  - Shows name, status type, and timestamp
  - Auto-refreshes with real-time updates
  - Color-coded by status type
- **Bottom Bar**:
  - Members tab
  - Settings tab

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

### 3.2 Notifications

#### Notification Types

| Event | Notification Text | Color Code |
|-------|------------------|------------|
| Rucked Up | "[Name] is rucked up @ 11:45 PM" | Red |
| Ricked Up | "[Name] is ricked up @ 11:47 PM" | Purple |
| Status Change | "[Name] switched to ricked up @ 11:50 PM" | Purple |
| Multiple Rucked | "3 people are rucked up in [Group]" | Red |
| Multiple Ricked | "2 people are ricked up in [Group]" | Purple |

#### Notification Settings
- Global on/off
- Per-group muting
- Quiet hours (user-defined)
- Sound selection (different sounds for rucked vs ricked)
- Filter by status type

### 3.3 Groups

#### Group Properties
- **Name**: 1-100 characters
- **Size Limit**: 50 members (hard cap)
- **Invite Code**: 8 characters, alphanumeric, non-expiring
- **Creation**: Any user can create unlimited groups
- **Deletion**: Groups auto-archive after 90 days of inactivity

#### Group Roles
- **Creator**: First admin (can't be removed)
- **Admin**: Can remove members (future feature)
- **Member**: Can use both buttons and invite others

#### Group Display
- Shows count of rucked up members
- Shows count of ricked up members
- Activity feed shows both types with color coding
- Members sorted by most recent activity

### 3.4 Anti-Spam & Safety Features

#### Cooldowns
- **Shared Cooldown**: 5 minutes after pressing either button
- **Notification Throttling**: Max 10 notifications per group per hour
- **SMS Rate Limiting**: 3 verification attempts per hour

#### Privacy Protection
- Phone numbers never visible to any users
- No user search functionality
- No public groups - invite code only
- No user profiles beyond first name
- No message content - only structured notifications

## 4. Technical Architecture

### 4.1 Technology Stack

#### Backend: Supabase
- **Authentication**: Supabase Auth with phone/SMS
- **Database**: PostgreSQL (via Supabase)
- **Realtime**: Supabase Realtime for live updates
- **Storage**: Supabase Storage (for future features)
- **Edge Functions**: For notification sending and SMS
- **Row Level Security**: For data access control

#### Mobile: React Native
- **Framework**: React Native with Expo
- **State Management**: Redux or Zustand
- **Push Notifications**: Expo Push Notifications
- **Navigation**: React Navigation

### 4.2 Supabase Database Schema

#### Tables Structure

**users**
- id (uuid, primary key)
- phone (encrypted)
- first_name (text)
- created_at (timestamp)
- last_active (timestamp)
- push_token (text)
- device_platform (text)

**groups**
- id (uuid, primary key)
- name (text)
- invite_code (text, unique)
- created_by (uuid, foreign key)
- created_at (timestamp)
- is_active (boolean)
- settings (jsonb)
- metadata (jsonb) - for future moderation

**group_members**
- id (uuid, primary key)
- group_id (uuid, foreign key)
- user_id (uuid, foreign key)
- joined_at (timestamp)
- is_admin (boolean)
- notifications_enabled (boolean)
- current_status (text) - 'rucked', 'ricked', or null
- status_updated_at (timestamp)

**status_events**
- id (uuid, primary key)
- user_id (uuid, foreign key)
- group_id (uuid, foreign key)
- status_type (text) - 'rucked' or 'ricked'
- created_at (timestamp)
- expires_at (timestamp) - 4 hours from creation
- previous_status (text) - for tracking switches

**notification_logs**
- id (uuid, primary key)
- group_id (uuid, foreign key)
- triggered_by (uuid, foreign key)
- status_type (text)
- recipient_count (integer)
- created_at (timestamp)

#### Supabase Row Level Security (RLS) Policies
- Users can only read their own user data
- Users can only see groups they're members of
- Users can only see members of their groups
- Users can only create status events in their groups
- Anyone with invite code can join a group (up to limit)

### 4.3 Supabase Edge Functions

**send-verification**
- Integrates with Twilio
- Rate limits SMS sending
- Generates and stores verification codes

**verify-code**
- Validates SMS codes
- Creates/updates user records
- Returns authentication tokens

**send-status-notification**
- Triggered by new status_events
- Fetches group members
- Sends push notifications via Expo
- Includes status type in notification

**cleanup-expired-statuses**
- Runs hourly
- Clears statuses older than 4 hours
- Updates group_members current_status

## 5. Business Rules

### 5.1 Status Rules
1. Users can only have one active status at a time
2. Pressing either button overrides previous status
3. Status automatically expires after 4 hours
4. Both buttons share the same 5-minute cooldown
5. Status changes trigger notifications to all group members

### 5.2 Notification Rules
1. Always notify all group members except sender
2. Include status type in notification (rucked/ricked)
3. Different notification sounds for different statuses
4. Include timestamp in user's local timezone
5. Deep link to specific group when tapped

### 5.3 Group Management Rules
1. Creator automatically becomes admin
2. Groups require at least 1 member to stay active
3. 50 member hard limit (return error if exceeded)
4. Invite codes are permanent and reusable
5. No duplicate members allowed

### 5.4 Rate Limiting Rules

| Action | Limit | Window | Response |
|--------|-------|--------|----------|
| SMS Verification | 3 | 1 hour | "Too many attempts, try again later" |
| Status Button | 1 | 5 minutes | Show countdown timer |
| Join Groups | 10 | 1 hour | "Slow down, partner" |
| Create Groups | 20 | 24 hours | "Group creation limit reached" |

## 6. Analytics & Metrics

### 6.1 Key Metrics to Track

#### User Metrics
- Daily/Weekly/Monthly Active Users
- Average groups per user
- Retention (D1, D7, D30)
- Time to first status

#### Status Metrics
- Rucked vs Ricked ratio
- Status events per day
- Average time in each status
- Status switching frequency
- Peak usage hours by status type

#### Group Metrics
- Average group size
- Group activity rate
- Invite code usage
- Mixed status groups (both types active)

### 6.2 Analytics Implementation
- Use Supabase's built-in analytics
- Add Mixpanel/Amplitude for detailed tracking
- Track button usage patterns
- A/B test button placement and colors

## 7. Security & Privacy

### 7.1 Security Measures

#### Data Protection
- Phone numbers encrypted using Supabase Vault
- All API calls over HTTPS
- JWT tokens with short expiration
- No sensitive data in push notifications

#### Anti-Abuse
- Invite codes can't be guessed (62^8 combinations)
- Rate limiting on all endpoints
- Shared cooldown prevents spam
- Phone verification prevents fake accounts

### 7.2 Privacy Features
- Minimal data collection (phone + first name only)
- No location tracking (designed for future opt-in)
- No read receipts or online status beyond the 4-hour window
- Data deletion on request
- No analytics on individual behavior shared

### 7.3 Compliance Readiness
- GDPR: Data export and deletion capabilities
- CCPA: California privacy compliance
- COPPA: Block users under 13
- Data retention: 90-day automatic cleanup

## 8. Future Feature Considerations

### 8.1 Potential Enhancements
- **Custom Status Names**: Groups can rename buttons
- **Location Sharing**: Optional "rucked up @ [venue]"
- **Status History**: See patterns over time
- **Reactions**: Quick emoji responses to statuses
- **Third Button**: Additional status option

### 8.2 Moderation Features (When Needed)
- Report/block users
- Admin can remove members
- Temporary muting of problematic users
- Group suspension for policy violations
- Trust scores based on behavior

## 9. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Notification delivery failures | High | Use multiple providers, add in-app indicators |
| Status confusion | Medium | Clear color coding, good UX education |
| Server overload | High | Supabase auto-scaling, rate limiting |
| Invite code sharing publicly | Low | Monitor for unusual join patterns |
| Underage users | Medium | Terms of service, age verification in signup |

---

## Appendix A: UI/UX Guidelines

### Design Principles
1. **Equal Prominence**: Both buttons must be equally accessible
2. **Clear Distinction**: Colors and labels must be obviously different
3. **Instant Feedback**: Every action has immediate response
4. **Minimal Steps**: Max 2 taps to send notification
5. **Night Mode First**: Assume use in dark environments

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

**Group Status**
- "3 people are rucked up in [Group]"
- "2 people are ricked up in [Group]"
- "Mix of rucked and ricked in [Group]"

---

*End of Product Specification v3.0*
