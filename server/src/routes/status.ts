import { Router, Request, Response } from 'express';
import pool from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

// Update status (rucked or ricked)
router.post('/', async (req: Request, res: Response) => {
  const { userId, groupId, statusType } = req.body;
  if (!userId || !groupId || !statusType) {
    res.status(400).json({ error: 'userId, groupId, and statusType are required' });
    return;
  }
  if (statusType !== 'rucked' && statusType !== 'ricked') {
    res.status(400).json({ error: 'statusType must be "rucked" or "ricked"' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const memberResult = await client.query(
      `SELECT current_status FROM group_members WHERE user_id = $1 AND group_id = $2`,
      [userId, groupId]
    );
    const previousStatus = memberResult.rows[0]?.current_status || null;

    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const eventResult = await client.query(
      `INSERT INTO status_events (id, user_id, group_id, status_type, expires_at, previous_status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [uuidv4(), userId, groupId, statusType, expiresAt, previousStatus]
    );

    await client.query(
      `UPDATE group_members SET current_status = $1, status_updated_at = NOW()
       WHERE user_id = $2 AND group_id = $3`,
      [statusType, userId, groupId]
    );

    await client.query('COMMIT');

    // Send push notifications to other group members (fire-and-forget)
    sendStatusPush(userId, groupId, statusType).catch(err =>
      console.error('Push notification error:', err.message)
    );

    res.status(201).json(eventResult.rows[0]);
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get active group members with status
router.get('/group/:groupId', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT gm.user_id, gm.current_status, gm.status_updated_at, u.first_name
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1 AND gm.current_status IS NOT NULL`,
      [req.params.groupId]
    );
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
router.get('/activity/:groupId', async (req: Request, res: Response) => {
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
router.get('/cooldown/:userId/:groupId', async (req: Request, res: Response) => {
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

async function sendStatusPush(userId: string, groupId: string, statusType: string) {
  // Get the user's name and group name
  const infoResult = await pool.query(
    `SELECT u.first_name, g.name as group_name
     FROM users u, groups g
     WHERE u.id = $1 AND g.id = $2`,
    [userId, groupId]
  );
  if (infoResult.rows.length === 0) return;
  const { first_name, group_name } = infoResult.rows[0];

  // Get push tokens of all OTHER members in the group
  const tokensResult = await pool.query(
    `SELECT u.push_token FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = $1
       AND gm.user_id != $2
       AND gm.notifications_enabled = TRUE
       AND u.push_token IS NOT NULL`,
    [groupId, userId]
  );

  const messages: Array<{
    to: string;
    sound: 'default';
    title: string;
    body: string;
    data: { groupId: string };
    channelId: string;
  }> = [];
  for (const row of tokensResult.rows) {
    if (!isExpoPushToken(row.push_token)) continue;
    messages.push({
      to: row.push_token,
      sound: 'default',
      title: group_name,
      body: `${first_name} is ${statusType} up!`,
      data: { groupId },
      channelId: statusType,
    });
  }

  if (messages.length === 0) return;

  for (const chunk of chunkMessages(messages, 100)) {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'accept-encoding': 'gzip, deflate',
        'content-type': 'application/json',
      },
      body: JSON.stringify(chunk),
    });

    const result = await response.json().catch(() => null) as
      | { errors?: unknown[] }
      | null;
    if (!response.ok) {
      throw new Error(
        `Expo push send failed with ${response.status}: ${JSON.stringify(result)}`
      );
    }

    if (result?.errors?.length) {
      console.warn('Expo push send returned errors:', JSON.stringify(result.errors));
    }
  }
}

function isExpoPushToken(token: unknown): token is string {
  return typeof token === 'string' &&
    /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token);
}

function chunkMessages<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export default router;
