# Ruckus MVP

## Stack
- React Native + Expo SDK 54 (web + mobile)
- Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- Zustand for state management
- React Navigation (Stack + Bottom Tabs)
- TypeScript

## Running
```bash
npx expo start --web  # runs on http://localhost:8081
```

## Key Patterns

### Auth
Phone+password auth using Supabase email auth with `{phone}@ruckus.app` format. No SMS provider needed. Email confirmation must be disabled in Supabase dashboard.

### RLS Policies
All policies that reference `group_members` must use the `get_user_group_ids(uid)` SECURITY DEFINER function to avoid infinite recursion. See `supabase/fix-rls-recursion.sql` for details.

### Cooldown
1-minute cooldown between status updates. Stored in `statusStore` with a countdown timer. Visual linear progress bar in `GroupScreen.tsx` ActivityTab.

### Navigation
GroupScreen uses nested bottom tabs (Activity + Members). Parent route params must be forwarded via `initialParams` on each Tab.Screen — nested tabs don't inherit parent params.

## Project Structure
```
src/
  screens/       # AuthScreen, NameScreen, HomeScreen, GroupScreen, CreateGroupScreen, JoinGroupScreen
  components/    # GroupCard, StatusButton, ActivityItem, MemberItem, Loading, EmptyState
  services/      # auth.ts, groups.ts, status.ts, supabase.ts
  store/         # authStore.ts, groupsStore.ts, statusStore.ts
  navigation/    # AppNavigator.tsx
  types/         # index.ts
  utils/         # realtime.ts
  config/        # env.ts
supabase/
  schema.sql          # Full schema with RLS (canonical)
  schema-safe.sql     # Idempotent version (DROP IF EXISTS)
  fix-rls-recursion.sql  # RLS migration with explanatory comments
```
