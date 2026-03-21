# Ruckus MVP

## Stack
- React Native + Expo SDK 54 (web + mobile)
- Express + PostgreSQL on Railway (API server)
- Zustand for state management
- React Navigation (Stack + Bottom Tabs)
- TypeScript

## Running
```bash
# API server (requires DATABASE_URL env var)
cd server && npm run dev

# Client
EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start --web
```

## Key Patterns

### Auth (TODO)
Auth is currently removed. Users enter a first name and get a userId stored in AsyncStorage. No login/password/phone verification. Auth will be added back later.

### API Architecture
Client calls REST endpoints on the Express server instead of Supabase. All data access goes through `src/services/api.ts` which calls `/api/users`, `/api/groups`, `/api/status` endpoints.

### Cooldown
1-minute cooldown between status updates. Stored in `statusStore` with a countdown timer. Visual linear progress bar in `GroupScreen.tsx` ActivityTab.

### Realtime (TODO)
Replaced Supabase Realtime with 10-second polling in GroupScreen. WebSocket support (Socket.io) can be added later.

### Navigation
GroupScreen uses nested bottom tabs (Activity + Members). Parent route params must be forwarded via `initialParams` on each Tab.Screen — nested tabs don't inherit parent params.

## Project Structure
```
src/
  screens/       # AuthScreen, HomeScreen, GroupScreen, CreateGroupScreen, JoinGroupScreen
  components/    # GroupCard, StatusButton, ActivityItem, MemberItem, Loading, EmptyState
  services/      # api.ts, groups.ts, status.ts, user.ts, notifications.ts
  store/         # authStore.ts, groupsStore.ts, statusStore.ts
  navigation/    # AppNavigator.tsx
  types/         # index.ts
  utils/         # index.ts (formatTime, formatRelativeTime, etc.)
  config/        # env.ts
server/
  src/
    index.ts         # Express app entry
    db.ts            # PostgreSQL pool
    routes/
      users.ts       # User CRUD
      groups.ts      # Group CRUD + join
      status.ts      # Status updates + activity
  schema.sql         # PostgreSQL schema (no RLS)
```

## Environment Variables
- Client: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_PROJECT_ID`
- Server: `DATABASE_URL`, `PORT`

## Railway Deployment
- `railway.json` at repo root configures build from `server/` subdirectory
- Server builds with `tsc` and runs `node dist/index.js`
- Requires PostgreSQL plugin in Railway project
