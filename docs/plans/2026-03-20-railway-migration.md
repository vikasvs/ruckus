# Railway Migration: Supabase to Express + PostgreSQL

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all Supabase dependencies (Auth, DB client, Realtime, Edge Functions) with a self-hosted Express API server + raw PostgreSQL on Railway. Auth is removed for now (noted as TODO). Realtime replaced with polling (simplest path; WebSockets can come later).

**Architecture:** Express API server with PostgreSQL (via `pg` driver). The React Native client calls REST endpoints instead of Supabase client methods. No auth middleware — all endpoints accept a `userId` header or param for now. Realtime subscriptions replaced with polling on the client side (the existing `RefreshControl` pull-to-refresh already works).

**Tech Stack:** Express, pg (node-postgres), uuid, cors — deployed on Railway. Client keeps React Native + Expo + Zustand.

---

## What Won't Work (noted, not fixed in this plan)

1. **Authentication** — Supabase Auth is removed. No login/signup flow. The app will auto-create/select a user for now. AuthScreen and NameScreen become simplified (just enter name, get a userId back). This is a known gap — auth will be added back later.
2. **Push Notifications** — The edge function `send-status-notification` sent push via Expo Push API. The new API server CAN do this, but we won't wire it up in this plan. The `notifications.ts` service stays as-is (it only talks to Expo SDK, not Supabase). The status endpoint just won't trigger pushes yet.
3. **RLS Policies** — No longer needed. API-level access control replaces them (but we're not adding auth, so no access control for now).

---

## File Change Map

### Delete
- `src/services/supabase.ts` — Supabase client singleton
- `src/services/auth.ts` — Supabase Auth calls
- `src/utils/realtime.ts` — Supabase Realtime subscriptions
- `supabase/` — entire directory (schema.sql, fix-rls-recursion.sql, schema-safe.sql, edge-functions/)

### Create (Server)
- `server/package.json`
- `server/tsconfig.json`
- `server/src/index.ts` — Express app entry
- `server/src/db.ts` — pg Pool setup
- `server/src/routes/users.ts` — user CRUD
- `server/src/routes/groups.ts` — group CRUD + join
- `server/src/routes/status.ts` — status updates + activity
- `server/schema.sql` — PostgreSQL schema (no RLS, no Supabase-specific functions)

### Create (Client)
- `src/services/api.ts` — API client (replaces supabase.ts)

### Rewrite (Client)
- `src/config/env.ts` — replace Supabase env vars with `EXPO_PUBLIC_API_URL`
- `src/services/groups.ts` — call API instead of Supabase
- `src/services/status.ts` — call API instead of Supabase
- `src/services/user.ts` — call API instead of Supabase
- `src/store/authStore.ts` — remove Supabase Auth, simplify to userId + profile
- `src/store/groupsStore.ts` — remove direct Supabase calls, use services only
- `src/screens/AuthScreen.tsx` — simplified: just enter name (no phone/password)
- `src/screens/NameScreen.tsx` — remove Supabase direct call, use API
- `src/screens/HomeScreen.tsx` — remove RealtimeChannel imports
- `src/screens/GroupScreen.tsx` — remove RealtimeChannel, use polling
- `src/screens/ConfigErrorScreen.tsx` — update for new env var
- `src/navigation/AppNavigator.tsx` — adjust for simplified auth
- `src/types/index.ts` — remove Supabase Session/User type deps
- `App.tsx` — remove Supabase init

### Modify
- `package.json` — remove `@supabase/supabase-js`, `react-native-url-polyfill`; keep everything else

---

## Task 1: Create the Express API server scaffold

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`
- Create: `server/src/db.ts`

**Step 1: Create server/package.json**

```json
{
  "name": "ruckus-server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "pg": "^8.13.0",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/pg": "^8.11.10",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  },
  "engines": {
    "node": "22.x"
  }
}
```

**Step 2: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create server/src/db.ts**

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;
```

**Step 4: Create server/src/index.ts**

```typescript
import express from 'express';
import cors from 'cors';
import usersRouter from './routes/users';
import groupsRouter from './routes/groups';
import statusRouter from './routes/status';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/users', usersRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/status', statusRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ruckus API server running on port ${PORT}`);
});
```

**Step 5: Install dependencies**

```bash
cd server && npm install
```

**Step 6: Commit**

```bash
git add server/
git commit -m "feat: scaffold Express API server with pg pool"
```

---

## Task 2: Create the database schema (no RLS)

**Files:**
- Create: `server/schema.sql`

**Step 1: Write the schema**

```sql
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
    previous_status TEXT CHECK (previous_status IN ('rucked', 'ricked'))
);

CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    triggered_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status_type TEXT NOT NULL CHECK (status_type IN ('rucked', 'ricked')),
    recipient_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_current_status ON group_members(current_status) WHERE current_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_status_events_group_id ON status_events(group_id);
CREATE INDEX IF NOT EXISTS idx_status_events_user_id ON status_events(user_id);
CREATE INDEX IF NOT EXISTS idx_status_events_created_at ON status_events(created_at);
```

**Step 2: Commit**

```bash
git add server/schema.sql
git commit -m "feat: add PostgreSQL schema without RLS"
```

---

## Task 3: Create API routes — users

**Files:**
- Create: `server/src/routes/users.ts`

**Step 1: Write the routes**

```typescript
import { Router } from 'express';
import pool from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create user (replaces sign-up + name entry)
router.post('/', async (req, res) => {
  const { first_name, phone } = req.body;
  if (!first_name) {
    return res.status(400).json({ error: 'first_name is required' });
  }

  try {
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO users (id, first_name, phone) VALUES ($1, $2, $3) RETURNING *`,
      [id, first_name, phone || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update user
router.patch('/:id', async (req, res) => {
  const { first_name, push_token, device_platform } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET
        first_name = COALESCE($1, first_name),
        push_token = COALESCE($2, push_token),
        device_platform = COALESCE($3, device_platform),
        last_active = NOW()
      WHERE id = $4 RETURNING *`,
      [first_name, push_token, device_platform, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

**Step 2: Commit**

```bash
git add server/src/routes/users.ts
git commit -m "feat: add users API routes"
```

---

## Task 4: Create API routes — groups

**Files:**
- Create: `server/src/routes/groups.ts`

**Step 1: Write the routes**

```typescript
import { Router } from 'express';
import pool from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Create group
router.post('/', async (req, res) => {
  const { name, userId } = req.body;
  if (!name || !userId) {
    return res.status(400).json({ error: 'name and userId are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inviteCode = generateInviteCode();
    const groupId = uuidv4();
    const groupResult = await client.query(
      `INSERT INTO groups (id, name, invite_code, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
      [groupId, name, inviteCode, userId]
    );

    await client.query(
      `INSERT INTO group_members (id, group_id, user_id, is_admin, notifications_enabled)
       VALUES ($1, $2, $3, true, true)`,
      [uuidv4(), groupId, userId]
    );

    await client.query('COMMIT');
    res.status(201).json(groupResult.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Join group by invite code
router.post('/join', async (req, res) => {
  const { inviteCode, userId } = req.body;
  if (!inviteCode || !userId) {
    return res.status(400).json({ error: 'inviteCode and userId are required' });
  }

  try {
    // Find group
    const groupResult = await pool.query(
      `SELECT * FROM groups WHERE invite_code = $1 AND is_active = true`,
      [inviteCode.toUpperCase()]
    );
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }
    const group = groupResult.rows[0];

    // Check existing membership
    const existingResult = await pool.query(
      `SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [group.id, userId]
    );
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'Already a member of this group' });
    }

    // Check capacity
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
      [group.id]
    );
    if (parseInt(countResult.rows[0].count) >= 50) {
      return res.status(400).json({ error: 'Group is full (50 member limit)' });
    }

    // Add member
    const memberResult = await pool.query(
      `INSERT INTO group_members (id, group_id, user_id, is_admin, notifications_enabled)
       VALUES ($1, $2, $3, false, true) RETURNING *`,
      [uuidv4(), group.id, userId]
    );

    res.status(201).json({ group, membership: memberResult.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's groups
router.get('/user/:userId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.*, gm.id as membership_id, gm.is_admin, gm.notifications_enabled,
              gm.joined_at, gm.current_status, gm.status_updated_at,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND current_status = 'rucked') as active_rucked_count,
              (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND current_status = 'ricked') as active_ricked_count
       FROM group_members gm
       JOIN groups g ON gm.group_id = g.id
       WHERE gm.user_id = $1 AND g.is_active = true`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get group by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM groups WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get group members
router.get('/:id/members', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT gm.*, u.first_name
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1`,
      [req.params.id]
    );
    // Shape to match existing client expectation: { ...gm, users: { first_name } }
    const shaped = result.rows.map(row => ({
      id: row.id,
      group_id: row.group_id,
      user_id: row.user_id,
      joined_at: row.joined_at,
      is_admin: row.is_admin,
      notifications_enabled: row.notifications_enabled,
      current_status: row.current_status,
      status_updated_at: row.status_updated_at,
      users: { first_name: row.first_name },
    }));
    res.json(shaped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update member (notifications toggle)
router.patch('/:groupId/members/:userId', async (req, res) => {
  const { notifications_enabled } = req.body;
  try {
    const result = await pool.query(
      `UPDATE group_members SET notifications_enabled = $1
       WHERE group_id = $2 AND user_id = $3 RETURNING *`,
      [notifications_enabled, req.params.groupId, req.params.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

**Step 2: Commit**

```bash
git add server/src/routes/groups.ts
git commit -m "feat: add groups API routes"
```

---

## Task 5: Create API routes — status

**Files:**
- Create: `server/src/routes/status.ts`

**Step 1: Write the routes**

```typescript
import { Router } from 'express';
import pool from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Update status (rucked or ricked)
router.post('/', async (req, res) => {
  const { userId, groupId, statusType } = req.body;
  if (!userId || !groupId || !statusType) {
    return res.status(400).json({ error: 'userId, groupId, and statusType are required' });
  }
  if (statusType !== 'rucked' && statusType !== 'ricked') {
    return res.status(400).json({ error: 'statusType must be "rucked" or "ricked"' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current status
    const memberResult = await client.query(
      `SELECT current_status FROM group_members WHERE user_id = $1 AND group_id = $2`,
      [userId, groupId]
    );
    const previousStatus = memberResult.rows[0]?.current_status || null;

    // Create status event
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const eventResult = await client.query(
      `INSERT INTO status_events (id, user_id, group_id, status_type, expires_at, previous_status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [uuidv4(), userId, groupId, statusType, expiresAt, previousStatus]
    );

    // Update member status
    await client.query(
      `UPDATE group_members SET current_status = $1, status_updated_at = NOW()
       WHERE user_id = $2 AND group_id = $3`,
      [statusType, userId, groupId]
    );

    await client.query('COMMIT');
    res.status(201).json(eventResult.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get active group members with status
router.get('/group/:groupId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT gm.user_id, gm.current_status, gm.status_updated_at, u.first_name
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1 AND gm.current_status IS NOT NULL`,
      [req.params.groupId]
    );
    // Shape to match client expectation
    const shaped = result.rows.map(row => ({
      user_id: row.user_id,
      current_status: row.current_status,
      status_updated_at: row.status_updated_at,
      users: { first_name: row.first_name },
    }));
    res.json(shaped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get recent activity for a group
router.get('/activity/:groupId', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  try {
    const result = await pool.query(
      `SELECT se.*, u.first_name
       FROM status_events se
       JOIN users u ON se.user_id = u.id
       WHERE se.group_id = $1
       ORDER BY se.created_at DESC
       LIMIT $2`,
      [req.params.groupId, limit]
    );
    // Shape to match client expectation
    const shaped = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      group_id: row.group_id,
      status_type: row.status_type,
      created_at: row.created_at,
      expires_at: row.expires_at,
      previous_status: row.previous_status,
      users: { first_name: row.first_name },
    }));
    res.json(shaped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Check cooldown
router.get('/cooldown/:userId/:groupId', async (req, res) => {
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const result = await pool.query(
      `SELECT created_at FROM status_events
       WHERE user_id = $1 AND group_id = $2 AND created_at >= $3
       ORDER BY created_at DESC LIMIT 1`,
      [req.params.userId, req.params.groupId, oneMinuteAgo]
    );

    if (result.rows.length > 0) {
      const lastAction = new Date(result.rows[0].created_at);
      const remaining = Math.max(0, Math.ceil((60 * 1000 - (Date.now() - lastAction.getTime())) / 1000));
      res.json({ remaining });
    } else {
      res.json({ remaining: 0 });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

**Step 2: Commit**

```bash
git add server/src/routes/status.ts
git commit -m "feat: add status API routes"
```

---

## Task 6: Create client API service and update env config

**Files:**
- Create: `src/services/api.ts`
- Rewrite: `src/config/env.ts`

**Step 1: Create src/services/api.ts**

```typescript
const getBaseUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_URL is not set');
  }
  return url.replace(/\/$/, '');
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
};
```

**Step 2: Rewrite src/config/env.ts**

```typescript
export const API_ENV_KEYS = [
  'EXPO_PUBLIC_API_URL',
] as const;

export const REQUIRED_PUBLIC_ENV_KEYS = [
  ...API_ENV_KEYS,
  'EXPO_PUBLIC_PROJECT_ID',
] as const;

export type RequiredPublicEnvKey = (typeof REQUIRED_PUBLIC_ENV_KEYS)[number];
export type RequiredApiEnvKey = (typeof API_ENV_KEYS)[number];

export interface EnvValidationResult<Key extends string = RequiredPublicEnvKey> {
  valid: boolean;
  missingKeys: Key[];
  values: Record<Key, string | undefined>;
}

function readPublicEnvValue(key: string): string | undefined {
  const rawValue = process.env[key];
  if (typeof rawValue !== 'string') return undefined;

  const value = rawValue.trim();
  return value.length > 0 ? value : undefined;
}

function validateKeys<Key extends RequiredPublicEnvKey>(
  keys: readonly Key[]
): EnvValidationResult<Key> {
  const values = {} as Record<Key, string | undefined>;
  const missingKeys: Key[] = [];

  for (const key of keys) {
    const value = readPublicEnvValue(key);
    values[key] = value;

    if (!value) {
      missingKeys.push(key);
    }
  }

  return {
    valid: missingKeys.length === 0,
    missingKeys,
    values,
  };
}

export function validatePublicEnv(): EnvValidationResult<RequiredPublicEnvKey> {
  return validateKeys(REQUIRED_PUBLIC_ENV_KEYS);
}

export function validateApiEnv(): EnvValidationResult<RequiredApiEnvKey> {
  return validateKeys(API_ENV_KEYS);
}
```

**Step 3: Commit**

```bash
git add src/services/api.ts src/config/env.ts
git commit -m "feat: add API client and update env config"
```

---

## Task 7: Rewrite client services (groups, status, user)

**Files:**
- Rewrite: `src/services/groups.ts`
- Rewrite: `src/services/status.ts`
- Rewrite: `src/services/user.ts`
- Delete: `src/services/supabase.ts`
- Delete: `src/services/auth.ts`
- Delete: `src/utils/realtime.ts`

**Step 1: Rewrite src/services/groups.ts**

```typescript
import { api } from './api';

export const createGroup = async (name: string, userId: string) => {
  return api.post<any>('/api/groups', { name, userId });
};

export const joinGroup = async (inviteCode: string, userId: string) => {
  return api.post<any>('/api/groups/join', { inviteCode, userId });
};

export const getUserGroups = async (userId: string) => {
  return api.get<any[]>(`/api/groups/user/${userId}`);
};

export const getGroupMembers = async (groupId: string) => {
  return api.get<any[]>(`/api/groups/${groupId}/members`);
};

export const getGroupDetails = async (groupId: string) => {
  return api.get<any>(`/api/groups/${groupId}`);
};

export const updateMemberNotifications = async (
  groupId: string,
  userId: string,
  enabled: boolean
) => {
  return api.patch<any>(`/api/groups/${groupId}/members/${userId}`, {
    notifications_enabled: enabled,
  });
};
```

**Step 2: Rewrite src/services/status.ts**

```typescript
import { api } from './api';

export const updateStatus = async (
  userId: string,
  groupId: string,
  statusType: 'rucked' | 'ricked'
) => {
  return api.post<any>('/api/status', { userId, groupId, statusType });
};

export const getGroupStatus = async (groupId: string) => {
  return api.get<any[]>(`/api/status/group/${groupId}`);
};

export const getRecentActivity = async (groupId: string, limit = 20) => {
  return api.get<any[]>(`/api/status/activity/${groupId}?limit=${limit}`);
};

export const checkCooldown = async (userId: string, groupId: string) => {
  const result = await api.get<{ remaining: number }>(`/api/status/cooldown/${userId}/${groupId}`);
  return result.remaining;
};
```

**Step 3: Rewrite src/services/user.ts**

```typescript
import { api } from './api';
import { User } from '@/types';
import { Platform } from 'react-native';

export const createUser = async (firstName: string, phone?: string): Promise<User> => {
  return api.post<User>('/api/users', { first_name: firstName, phone });
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    return await api.get<User>(`/api/users/${userId}`);
  } catch {
    return null;
  }
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<Pick<User, 'first_name' | 'push_token' | 'device_platform'>>
): Promise<User> => {
  return api.patch<User>(`/api/users/${userId}`, updates);
};

export const savePushToken = async (userId: string, token: string): Promise<void> => {
  await api.patch(`/api/users/${userId}`, {
    push_token: token,
    device_platform: Platform.OS,
  });
};

export const updateLastActive = async (userId: string): Promise<void> => {
  await api.patch(`/api/users/${userId}`, {});
};
```

**Step 4: Delete old files**

```bash
rm src/services/supabase.ts
rm src/services/auth.ts
rm src/utils/realtime.ts
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: rewrite services to use REST API, remove Supabase client"
```

---

## Task 8: Rewrite stores (authStore, groupsStore)

**Files:**
- Rewrite: `src/store/authStore.ts`
- Rewrite: `src/store/groupsStore.ts`
- Modify: `src/types/index.ts`

**Step 1: Rewrite src/types/index.ts — remove Supabase types**

The types file stays the same (it doesn't import from Supabase). No changes needed.

**Step 2: Rewrite src/store/authStore.ts**

```typescript
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User as AppUser } from '@/types';
import { getUserProfile } from '@/services/user';

const USER_ID_KEY = 'ruckus_user_id';

interface AuthState {
  session: { userId: string } | null;
  user: { id: string } | null;
  profile: AppUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  needsName: boolean;

  initialize: () => Promise<void>;
  setUser: (_userId: string) => Promise<void>;
  setProfile: (_profile: AppUser | null) => void;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  needsName: false,

  initialize: async () => {
    try {
      set({ isLoading: true });

      const storedUserId = await AsyncStorage.getItem(USER_ID_KEY);

      if (storedUserId) {
        set({ session: { userId: storedUserId }, user: { id: storedUserId } });
        await get().fetchProfile();
      } else {
        set({ needsName: true });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ needsName: true });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  setUser: async (userId: string) => {
    await AsyncStorage.setItem(USER_ID_KEY, userId);
    set({ session: { userId }, user: { id: userId } });
  },

  setProfile: (profile) => {
    set({ profile });
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const profile = await getUserProfile(user.id);

      if (profile) {
        set({ profile, needsName: false });
      } else {
        // User ID was stored but user no longer exists in DB
        await AsyncStorage.removeItem(USER_ID_KEY);
        set({ session: null, user: null, needsName: true });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  },

  signOut: async () => {
    await AsyncStorage.removeItem(USER_ID_KEY);
    set({ session: null, user: null, profile: null, needsName: true });
  },
}));
```

**Step 3: Rewrite src/store/groupsStore.ts**

```typescript
import { create } from 'zustand';
import {
  Group,
  GroupMember,
  GroupWithMembership,
  GroupMemberWithUser,
} from '@/types';
import {
  createGroup as createGroupService,
  joinGroup as joinGroupService,
  getUserGroups,
  getGroupMembers,
  getGroupDetails,
} from '@/services/groups';

interface GroupsState {
  groups: GroupWithMembership[];
  currentGroup: Group | null;
  currentGroupMembers: GroupMemberWithUser[];
  isLoading: boolean;
  error: string | null;

  fetchGroups: (_userId: string) => Promise<void>;
  fetchGroupDetails: (_groupId: string) => Promise<void>;
  fetchMembers: (_groupId: string) => Promise<void>;
  createGroup: (_name: string, _userId: string) => Promise<Group>;
  joinGroup: (_inviteCode: string, _userId: string) => Promise<{ group: Group; membership: GroupMember }>;
  setCurrentGroup: (_group: Group | null) => void;
  updateMemberStatus: (_userId: string, _status: 'rucked' | 'ricked' | null) => void;
  clearError: () => void;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  currentGroup: null,
  currentGroupMembers: [],
  isLoading: false,
  error: null,

  fetchGroups: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });

      const rows = await getUserGroups(userId);

      const groupsWithDetails: GroupWithMembership[] = rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        invite_code: row.invite_code,
        created_by: row.created_by,
        created_at: row.created_at,
        is_active: row.is_active,
        settings: row.settings,
        metadata: row.metadata,
        membership: {
          id: row.membership_id,
          group_id: row.id,
          user_id: userId,
          joined_at: row.joined_at,
          is_admin: row.is_admin,
          notifications_enabled: row.notifications_enabled,
          current_status: row.current_status,
          status_updated_at: row.status_updated_at,
        } as GroupMember,
        member_count: parseInt(row.member_count) || 0,
        active_rucked_count: parseInt(row.active_rucked_count) || 0,
        active_ricked_count: parseInt(row.active_ricked_count) || 0,
      }));

      set({ groups: groupsWithDetails, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchGroupDetails: async (groupId: string) => {
    try {
      set({ isLoading: true, error: null });
      const data = await getGroupDetails(groupId);
      set({ currentGroup: data as Group, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchMembers: async (groupId: string) => {
    try {
      set({ isLoading: true, error: null });
      const members = await getGroupMembers(groupId);
      set({
        currentGroupMembers: members as GroupMemberWithUser[],
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createGroup: async (name: string, userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const group = await createGroupService(name, userId);
      await get().fetchGroups(userId);
      set({ isLoading: false });
      return group;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  joinGroup: async (inviteCode: string, userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const result = await joinGroupService(inviteCode, userId);
      await get().fetchGroups(userId);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setCurrentGroup: (group: Group | null) => {
    set({ currentGroup: group });
  },

  updateMemberStatus: (userId: string, status: 'rucked' | 'ricked' | null) => {
    const { currentGroupMembers } = get();
    const updatedMembers = currentGroupMembers.map(member => {
      if (member.user_id === userId) {
        return {
          ...member,
          current_status: status,
          status_updated_at: new Date().toISOString(),
        };
      }
      return member;
    });
    set({ currentGroupMembers: updatedMembers });
  },

  clearError: () => {
    set({ error: null });
  },
}));
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: rewrite stores to remove Supabase dependencies"
```

---

## Task 9: Rewrite screens

**Files:**
- Rewrite: `src/screens/AuthScreen.tsx` — becomes NameScreen-like (just enter first name)
- Rewrite: `src/screens/NameScreen.tsx` — use API service
- Rewrite: `src/screens/HomeScreen.tsx` — remove Realtime imports
- Rewrite: `src/screens/GroupScreen.tsx` — remove Realtime, use polling
- Rewrite: `src/screens/ConfigErrorScreen.tsx` — update messaging
- Rewrite: `src/navigation/AppNavigator.tsx` — adjust auth flow

**Step 1: Rewrite AuthScreen.tsx — now it's just "enter your name"**

Since we removed auth, AuthScreen is no longer needed. The flow is: if no userId in storage, show NameScreen. So we remove AuthScreen and always use NameScreen for new users.

Actually, simpler: merge auth into the name flow. When `needsName` is true, show a single screen where user enters their name and a user is created.

Rewrite `src/screens/AuthScreen.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { createUser } from '@/services/user';

export default function AuthScreen() {
  const [firstName, setFirstName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser, fetchProfile } = useAuthStore();

  const handleContinue = async () => {
    if (!firstName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      setIsLoading(true);
      const user = await createUser(firstName.trim());
      await setUser(user.id);
      await fetchProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Ruckus</Text>
        <Text style={styles.subtitle}>What should we call you?</Text>

        <TextInput
          style={styles.input}
          placeholder="First name"
          placeholderTextColor="#666"
          value={firstName}
          onChangeText={setFirstName}
          autoFocus
          autoCapitalize="words"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Let's Go</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#999',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#1E1E1E',
    color: '#fff',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#FF4458',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

**Step 2: Rewrite AppNavigator.tsx — simplified auth flow**

```typescript
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { RootStackParamList } from '@/types';
import { useAuthStore } from '@/store/authStore';

import AuthScreen from '@/screens/AuthScreen';
import HomeScreen from '@/screens/HomeScreen';
import GroupScreen from '@/screens/GroupScreen';
import CreateGroupScreen from '@/screens/CreateGroupScreen';
import JoinGroupScreen from '@/screens/JoinGroupScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { session, signOut, needsName } = useAuthStore();

  const isAuthenticated = session && !needsName;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#121212',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Ruckus',
              headerRight: () => (
                <TouchableOpacity
                  style={styles.signOutButton}
                  onPress={signOut}
                >
                  <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
              ),
            }}
          />
          <Stack.Screen
            name="Group"
            component={GroupScreen}
            options={{ title: 'Group' }}
          />
          <Stack.Screen
            name="CreateGroup"
            component={CreateGroupScreen}
            options={{ title: 'Create Group' }}
          />
          <Stack.Screen
            name="JoinGroup"
            component={JoinGroupScreen}
            options={{ title: 'Join Group' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  signOutButton: {
    marginRight: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  signOutText: {
    color: '#FF4458',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

**Step 3: Rewrite HomeScreen.tsx — remove Realtime**

```typescript
import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, GroupWithMembership } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useGroupsStore } from '@/store/groupsStore';
import GroupCard from '@/components/GroupCard';
import Loading from '@/components/Loading';
import EmptyState from '@/components/EmptyState';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuthStore();
  const { groups, isLoading, fetchGroups } = useGroupsStore();

  const loadGroups = useCallback(async () => {
    if (user?.id) {
      try {
        await fetchGroups(user.id);
      } catch (error) {
        console.error('Error loading groups:', error);
      }
    }
  }, [user?.id, fetchGroups]);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups])
  );

  const handleGroupPress = (group: GroupWithMembership) => {
    navigation.navigate('Group', { groupId: group.id });
  };

  const handleSharePress = (group: GroupWithMembership) => {
    if (group.invite_code) {
      Clipboard.setString(group.invite_code);
      Alert.alert('Invite code copied!', group.invite_code);
    }
  };

  const renderGroupCard = ({ item }: { item: GroupWithMembership }) => (
    <GroupCard
      group={item}
      onPress={() => handleGroupPress(item)}
      onSharePress={() => handleSharePress(item)}
    />
  );

  const renderEmptyState = () => (
    <EmptyState
      title="No groups yet!"
      subtitle="Create or join a group to start letting your crew know when you're rucked up"
    />
  );

  if (isLoading && groups.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Loading groups..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={groups}
        renderItem={renderGroupCard}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContainer,
          groups.length === 0 && styles.emptyListContainer,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadGroups}
            tintColor="#FF4458"
            colors={['#FF4458']}
          />
        }
      />

      <View style={styles.fab}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Text style={styles.fabText}>Create Group</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => navigation.navigate('JoinGroup')}
        >
          <Text style={styles.fabText}>Join Group</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  listContainer: {
    padding: 15,
  },
  emptyListContainer: {
    flex: 1,
  },
  fab: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  createButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```

**Step 4: Rewrite GroupScreen.tsx — remove Realtime, use polling**

```typescript
import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
  Switch,
  Clipboard,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, TabParamList, GroupMemberWithUser } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useGroupsStore } from '@/store/groupsStore';
import { useStatusStore } from '@/store/statusStore';
import { updateMemberNotifications } from '@/services/groups';
import StatusButton from '@/components/StatusButton';
import ActivityItem from '@/components/ActivityItem';
import MemberItem from '@/components/MemberItem';

const Tab = createBottomTabNavigator<TabParamList>();

type GroupScreenRouteProp = RouteProp<RootStackParamList, 'Group'>;

function ActivityTab() {
  const route = useRoute<GroupScreenRouteProp>();
  const { groupId } = route.params;
  const { user } = useAuthStore();
  const { currentGroupMembers, fetchMembers } = useGroupsStore();
  const {
    currentStatus,
    cooldownRemaining,
    recentActivity,
    updateStatus,
    checkCooldown,
    fetchRecentActivity,
    setCurrentStatus,
  } = useStatusStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id && groupId) {
      const currentMember = currentGroupMembers.find(m => m.user_id === user.id);
      if (currentMember?.current_status) {
        setCurrentStatus(currentMember.current_status);
      }

      checkCooldown(user.id, groupId);
      fetchRecentActivity(groupId);
    }
  }, [user?.id, groupId, currentGroupMembers]);

  // Poll for updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRecentActivity(groupId);
      fetchMembers(groupId);
    }, 10000);
    return () => clearInterval(interval);
  }, [groupId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchRecentActivity(groupId);
      await fetchMembers(groupId);
    } finally {
      setRefreshing(false);
    }
  };

  const handleStatusPress = async (statusType: 'rucked' | 'ricked') => {
    if (!user?.id) return;

    if (cooldownRemaining > 0) {
      const mins = Math.ceil(cooldownRemaining / 60);
      Alert.alert('Cooldown Active', `Wait ${mins} more minute${mins !== 1 ? 's' : ''} before updating your status.`);
      return;
    }

    try {
      await updateStatus(user.id, groupId, statusType);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  const isOnCooldown = cooldownRemaining > 0;

  return (
    <View style={styles.activityContainer}>
      <View style={styles.statusSection}>
        <Text style={styles.statusTitle}>Current Status</Text>
        {currentStatus ? (
          <Text style={[
            styles.statusText,
            currentStatus === 'rucked' ? styles.ruckedText : styles.rickedText
          ]}>
            You're {currentStatus} up!
          </Text>
        ) : (
          <Text style={styles.statusText}>No active status</Text>
        )}
      </View>

      <View style={styles.buttonSection}>
        <StatusButton
          type="rucked"
          isActive={currentStatus === 'rucked'}
          isDisabled={isOnCooldown}
          cooldownSeconds={cooldownRemaining}
          onPress={() => handleStatusPress('rucked')}
        />
        <StatusButton
          type="ricked"
          isActive={currentStatus === 'ricked'}
          isDisabled={isOnCooldown}
          cooldownSeconds={cooldownRemaining}
          onPress={() => handleStatusPress('ricked')}
        />
      </View>

      {cooldownRemaining > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(cooldownRemaining / 60) * 100}%`,
                  backgroundColor: currentStatus === 'rucked' ? '#FF4458' : '#9C27B0',
                },
              ]}
            />
          </View>
          <Text style={styles.progressTime}>
            {`${Math.floor(cooldownRemaining / 60)}:${(cooldownRemaining % 60).toString().padStart(2, '0')}`}
          </Text>
        </View>
      )}

      <View style={styles.activityFeed}>
        <Text style={styles.feedTitle}>Recent Activity</Text>
        <FlatList
          data={recentActivity}
          renderItem={({ item }) => <ActivityItem item={item} />}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No recent activity</Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FF4458"
            />
          }
        />
      </View>
    </View>
  );
}

function MembersTab() {
  const route = useRoute<GroupScreenRouteProp>();
  const { groupId } = route.params;
  const { user } = useAuthStore();
  const { currentGroup, currentGroupMembers, fetchMembers } = useGroupsStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const currentMember = currentGroupMembers.find(m => m.user_id === user?.id);
    if (currentMember) {
      setNotificationsEnabled(currentMember.notifications_enabled);
    }
  }, [currentGroupMembers, user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchMembers(groupId);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopyInviteCode = () => {
    if (currentGroup?.invite_code) {
      Clipboard.setString(currentGroup.invite_code);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (!user?.id) return;

    setNotificationsEnabled(value);

    try {
      await updateMemberNotifications(groupId, user.id, value);
    } catch (error: any) {
      setNotificationsEnabled(!value);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const renderMember = ({ item }: { item: GroupMemberWithUser }) => (
    <MemberItem
      member={item}
      isCurrentUser={item.user_id === user?.id}
    />
  );

  return (
    <View style={styles.membersContainer}>
      {currentGroup && (
        <TouchableOpacity style={styles.inviteCodeCard} onPress={handleCopyInviteCode}>
          <Text style={styles.inviteCodeLabel}>Invite Code</Text>
          <Text style={styles.inviteCode}>{currentGroup.invite_code}</Text>
          <Text style={styles.tapToCopy}>Tap to copy</Text>
        </TouchableOpacity>
      )}

      <View style={styles.notificationToggle}>
        <Text style={styles.notificationLabel}>Push Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={handleToggleNotifications}
          trackColor={{ false: '#333', true: '#4CAF50' }}
          thumbColor="#fff"
        />
      </View>

      <Text style={styles.membersTitle}>
        Members ({currentGroupMembers.length})
      </Text>

      <FlatList
        data={currentGroupMembers}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No members to show</Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF4458"
          />
        }
      />
    </View>
  );
}

export default function GroupScreen() {
  const route = useRoute<GroupScreenRouteProp>();
  const navigation = useNavigation();
  const { groupId } = route.params;
  const { fetchGroupDetails, fetchMembers, currentGroup, isLoading } = useGroupsStore();
  const { reset: resetStatus } = useStatusStore();

  useFocusEffect(
    useCallback(() => {
      fetchGroupDetails(groupId);
      fetchMembers(groupId);

      return () => {
        resetStatus();
      };
    }, [groupId])
  );

  useEffect(() => {
    if (currentGroup?.name) {
      navigation.setOptions({ title: currentGroup.name });
    }
  }, [currentGroup?.name, navigation]);

  if (isLoading && !currentGroup) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4458" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#1E1E1E',
            borderTopColor: '#333',
          },
          tabBarActiveTintColor: '#FF4458',
          tabBarInactiveTintColor: '#999',
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Activity"
          component={ActivityTab}
          initialParams={{ groupId }}
          options={{ title: 'Activity' }}
        />
        <Tab.Screen
          name="Members"
          component={MembersTab}
          initialParams={{ groupId }}
          options={{ title: 'Members' }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContainer: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  statusTitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#999',
  },
  ruckedText: {
    color: '#FF4458',
  },
  rickedText: {
    color: '#9C27B0',
  },
  buttonSection: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  activityFeed: {
    flex: 1,
  },
  feedTitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 15,
    fontWeight: '600',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressTime: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    width: 35,
    textAlign: 'right',
  },
  membersContainer: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  inviteCodeCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  inviteCodeLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  tapToCopy: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  notificationToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  notificationLabel: {
    fontSize: 16,
    color: '#fff',
  },
  membersTitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 15,
    fontWeight: '600',
  },
});
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: rewrite screens to remove Supabase dependencies"
```

---

## Task 10: Update App.tsx and clean up

**Files:**
- Rewrite: `App.tsx`
- Modify: `package.json` — remove Supabase dep
- Delete: `src/screens/NameScreen.tsx` — merged into AuthScreen
- Delete: `src/screens/ConfigErrorScreen.tsx` — simplify
- Delete: `supabase/` directory

**Step 1: Rewrite App.tsx**

```typescript
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { RootStackParamList } from './src/types';
import {
  registerForPushNotifications,
  setupNotificationHandler,
  getLastNotificationResponse,
} from './src/services/notifications';

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#FF4458" />
    </View>
  );
}

export default function App() {
  const { initialize, isInitialized, isLoading, user } = useAuthStore();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const notificationCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications(user.id).catch(console.error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isInitialized || !user) return;

    const handleNotificationTap = (groupId: string) => {
      if (navigationRef.current?.isReady()) {
        navigationRef.current.navigate('Group', { groupId });
      }
    };

    notificationCleanupRef.current = setupNotificationHandler(handleNotificationTap);

    getLastNotificationResponse().then((groupId) => {
      if (groupId && navigationRef.current?.isReady()) {
        navigationRef.current.navigate('Group', { groupId });
      }
    });

    return () => {
      if (notificationCleanupRef.current) {
        notificationCleanupRef.current();
      }
    };
  }, [isInitialized, user]);

  if (!isInitialized || isLoading) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});
```

**Step 2: Remove Supabase from package.json**

Run:
```bash
npm uninstall @supabase/supabase-js react-native-url-polyfill
```

**Step 3: Delete old files**

```bash
rm -rf supabase/
rm -f src/screens/NameScreen.tsx
rm -f src/screens/ConfigErrorScreen.tsx
```

**Step 4: Remove NameScreen import from AppNavigator** (already done in Task 9 Step 2)

**Step 5: Update types — remove Name from RootStackParamList**

In `src/types/index.ts`, remove the `Name` route:

```typescript
export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  Group: { groupId: string };
  CreateGroup: undefined;
  JoinGroup: undefined;
};
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: remove Supabase deps, clean up deleted files"
```

---

## Task 11: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

Update the project documentation to reflect the new stack:
- Replace Supabase references with Express + PostgreSQL on Railway
- Update env var names
- Update running instructions (need to run server too)
- Remove RLS section
- Update project structure

**Step 1: Rewrite CLAUDE.md**

Key changes:
- Stack: Express + pg on Railway instead of Supabase
- Running: `cd server && npm run dev` for API, `npx expo start --web` for client
- Env: `EXPO_PUBLIC_API_URL` instead of Supabase vars, `DATABASE_URL` for server
- Remove RLS section
- Remove auth section (auth removed for now)
- Add `server/` to project structure

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Railway migration"
```

---

## Task 12: Add Railway deployment config

**Files:**
- Create: `server/Procfile` or `server/railway.json` (Railway auto-detects, but we can add a nixpacks config)

Railway auto-detects Node.js apps. The `server/` directory needs to be deployable. Railway can be configured to use `server/` as the root directory.

**Step 1: Create server/.env.example**

```
DATABASE_URL=postgresql://user:password@host:5432/railway
PORT=3000
```

**Step 2: Ensure server builds correctly**

The `start` script in server/package.json runs `node dist/index.js`, and `build` runs `tsc`. Railway will run `npm run build` then `npm start` automatically.

**Step 3: Commit**

```bash
git add server/.env.example
git commit -m "chore: add Railway deployment config"
```

---

## Summary of What Won't Work (TODOs)

1. **Auth** — No login/signup security. Anyone can create a user and access any data. Auth needs to be added back (JWT, OAuth, or similar).
2. **Push notifications** — `notifications.ts` still registers Expo tokens and saves them, but no server-side code sends pushes. The old edge function logic needs to be ported to an Express route.
3. **Realtime updates** — Replaced with 10-second polling. WebSocket support (Socket.io) would restore instant updates.
4. **Status cleanup cron** — The old `cleanup-expired-statuses` edge function is gone. Need a Railway cron job or a `setInterval` in the server to run `cleanup_expired_statuses()` periodically.
5. **ConfigErrorScreen** — Deleted. If `EXPO_PUBLIC_API_URL` is missing, the app will just throw on first API call.
