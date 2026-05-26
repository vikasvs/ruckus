# Engineering Health and Group Ruckus Plan

## Context
- Baseline synced to `origin/main` on 2026-05-23
- This plan reflects the current Express + PostgreSQL on Railway architecture, not the older Supabase MVP
- Goal: turn the current red engineering signals into an ordered cleanup plan and scope the new group-level `in a ruckus` notification feature

## Current Red Health Signals

### 1. Dependency Bootstrap Drift
- Root `npm run lint` still fails locally because `node_modules` predates the addition of `@typescript-eslint/parser`
- `server/` has its own `package.json` and lockfile, but there is no root bootstrap step that installs backend dependencies automatically

### 2. Validation Boundary Drift
- Root `tsconfig.json` includes `**/*.ts` and `**/*.tsx`, so root `npm run typecheck` walks into `server/`
- That makes app validation depend on server dependencies being installed, which is easy to miss and confusing during local setup

### 3. Test Coverage Gap
- `npm test -- --runInBand --watchman=false` finds no tests
- The repo currently has no automated smoke coverage for either the mobile app flows or the new backend routes

### 4. Docs / Setup Drift
- `README.md` still describes the old Supabase architecture and old environment variables
- Current runtime contracts are now `EXPO_PUBLIC_API_URL` on mobile and `DATABASE_URL` in `server/`

### 5. Runtime Drift
- The repo pins Node `22.x`
- The current local environment was running Node `25.x` during validation, which increases the chance of false negatives and install churn

## Recommended Resolution Sequence

### Phase 1: Re-establish a Clean Local Baseline
1. Switch local runtime to Node `22.x`
2. Run `npm install` at the repo root
3. Run `npm --prefix server install`
4. Re-run:
   - `npm run lint`
   - `npm run typecheck`
   - `npm --prefix server run build`

### Phase 2: Split App and Server Validation Clearly
1. Narrow root `tsconfig.json` to app code only:
   - `App.tsx`
   - `src/**/*`
2. Add explicit scripts:
   - `typecheck:app`
   - `typecheck:server`
   - `build:server`
3. Update `predeploy` so it validates both the app and the backend intentionally instead of relying on root glob spillover

### Phase 3: Fix Setup and Docs Drift
1. Rewrite `README.md` for the current Railway/API architecture
2. Document both install steps:
   - root app dependencies
   - `server/` dependencies
3. Add one of:
   - a root `setup` script, or
   - npm workspaces as a follow-up

### Phase 4: Establish a Minimum Test Floor
1. Add backend smoke coverage for:
   - `GET /health`
   - create user
   - create group
   - join group
   - cooldown check
   - ruckus-threshold notification logic
2. Add app-level smoke coverage for:
   - auth store initialization
   - create/join flows with mocked services
   - cooldown timer behavior in `statusStore`
3. Treat the absence of tests as a real gap rather than hiding it with `--passWithNoTests`

## Group-Level Feature Scope: "In a Ruckus"

### Product Intent
- If a group has a burst of energy, the app should send one bigger summary push instead of relying only on three separate direct pushes
- The feature should feel celebratory and high-signal, not spammy

### V1 Trigger Semantics
- Window: rolling 5 minutes
- Threshold: 3 or more distinct members in the same group
- Qualifying events: any `rucked` or `ricked` status update
- Mixed-status bursts count toward the threshold
- Count each member only once within the active window

### V1 Push Behavior
- Keep the existing direct status pushes
- Add one summary push when the threshold is crossed
- Default title: `[Group Name] is in a Ruckus`
- Default body: `3 people lit up in the last 5 minutes`
- If the burst is all one type, optionally specialize the body to `3 people are rucked up right now` or `3 people are ricked up right now`

### Dedupe Rules
- Fire on threshold crossing only
- Do not fire again while the same rolling window stays at or above threshold
- Allow a new summary push only after the window falls below threshold and later crosses it again

### Backend Changes
1. Add a helper in `server/src/routes/status.ts` that evaluates the last 5 minutes of `status_events` for a group after a new status is written
2. Store burst-send state explicitly so duplicate summary pushes can be suppressed safely
3. Recommended schema addition:
   - new table `group_ruckus_notifications`
   - columns:
     - `id`
     - `group_id`
     - `trigger_event_id`
     - `triggered_by`
     - `window_started_at`
     - `window_ended_at`
     - `distinct_member_count`
     - `created_at`
4. Reuse the existing Expo push delivery path with a dedicated summary-send helper

### Mobile Changes
1. Register a new Android notification channel such as `group-ruckus`
2. Keep current deep-link behavior by passing the existing `groupId`
3. No required screen changes for V1
4. Optional follow-up:
   - synthetic activity item for the summary event
   - home-screen "in a ruckus" badge on active groups

### Acceptance Criteria
- The third distinct member inside 5 minutes causes one summary push
- The fourth or fifth member in the same burst does not cause duplicate summary pushes
- Existing direct status pushes still send normally
- Members with notifications disabled for that group do not receive the summary push
- A later burst can trigger a fresh summary push after the group falls below threshold and crosses back over it

## Suggested Follow-Up Order
1. Fix local setup, validation boundaries, and README drift
2. Add minimum backend tests
3. Implement the ruckus-threshold summary push on the server
4. Add the Android notification channel and verify deep-link behavior
5. Decide whether the feed also needs a visible summary event after push behavior is working
