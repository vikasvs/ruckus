import { Router, type Request, type Response } from 'express';
import type {
  AppDependencies,
  DatabaseClientLike,
  PushMessage,
  StatusType,
} from '../app-dependencies';
import { isExpoPushToken } from '../push';

interface CurrentStatusRow extends Record<string, unknown> {
  current_status: StatusType | null;
}

interface StatusEventRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  group_id: string;
  status_type: StatusType;
  created_at: string;
  expires_at: string;
  previous_status: StatusType | null;
}

interface GroupStatusRow extends Record<string, unknown> {
  user_id: string;
  current_status: StatusType;
  status_updated_at: string;
  first_name: string;
}

interface ActivityRow extends StatusEventRow {
  first_name: string;
}

interface CooldownRow extends Record<string, unknown> {
  created_at: string;
}

interface PushInfoRow extends Record<string, unknown> {
  first_name: string;
  group_name: string;
}

interface GroupNameRow extends Record<string, unknown> {
  group_name: string;
}

interface PushTokenRow extends Record<string, unknown> {
  push_token: string | null;
}

interface DistinctUserRow extends Record<string, unknown> {
  user_id: string;
}

interface StatusWindowRow extends Record<string, unknown> {
  user_id: string;
  status_type: StatusType;
  created_at: string;
}

interface GroupRuckusNotificationRow extends Record<string, unknown> {
  id: string;
  group_id: string;
  trigger_event_id: string;
  triggered_by: string;
  window_started_at: string;
  window_ended_at: string;
  distinct_member_count: number;
  created_at: string;
}

interface RuckusSummaryPayload {
  record: GroupRuckusNotificationRow;
  uniformStatus: StatusType | null;
}

export function createStatusRouter(deps: AppDependencies) {
  const router = Router();

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

    const client = await deps.pool.connect();
    let statusEvent: StatusEventRow | null = null;
    let ruckusSummary: RuckusSummaryPayload | null = null;

    try {
      await client.query('BEGIN');

      const memberResult = await client.query<CurrentStatusRow>(
        `SELECT current_status FROM group_members WHERE user_id = $1 AND group_id = $2`,
        [userId, groupId]
      );
      const previousStatus = memberResult.rows[0]?.current_status || null;

      const expiresAt = new Date(deps.now().getTime() + 4 * 60 * 60 * 1000).toISOString();
      const eventResult = await client.query<StatusEventRow>(
        `INSERT INTO status_events (id, user_id, group_id, status_type, expires_at, previous_status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [deps.idGenerator(), userId, groupId, statusType, expiresAt, previousStatus]
      );
      statusEvent = eventResult.rows[0];

      await client.query(
        `UPDATE group_members SET current_status = $1, status_updated_at = NOW()
         WHERE user_id = $2 AND group_id = $3`,
        [statusType, userId, groupId]
      );

      ruckusSummary = await maybeCreateGroupRuckusSummary(client, {
        groupId,
        userId,
        currentEvent: statusEvent,
        idGenerator: deps.idGenerator,
      });

      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message });
      return;
    } finally {
      client.release();
    }

    void (async () => {
      try {
        await sendStatusPush(deps, { userId, groupId, statusType });
      } catch (err) {
        console.error('Push notification error:', (err as Error).message);
      }

      if (!ruckusSummary) return;

      try {
        await sendGroupRuckusSummaryPush(deps, ruckusSummary);
      } catch (err) {
        console.error('Ruckus summary push error:', (err as Error).message);
      }
    })();

    res.status(201).json(statusEvent);
  });

  // Get active group members with status
  router.get('/group/:groupId', async (req: Request, res: Response) => {
    try {
      const result = await deps.pool.query<GroupStatusRow>(
        `SELECT gm.user_id, gm.current_status, gm.status_updated_at, u.first_name
         FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = $1 AND gm.current_status IS NOT NULL`,
        [req.params.groupId]
      );
      const shaped = result.rows.map((row) => ({
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
    const limit = parseInt(req.query.limit as string, 10) || 20;
    try {
      const result = await deps.pool.query<ActivityRow>(
        `SELECT se.*, u.first_name
         FROM status_events se
         JOIN users u ON se.user_id = u.id
         WHERE se.group_id = $1
         ORDER BY se.created_at DESC
         LIMIT $2`,
        [req.params.groupId, limit]
      );
      const shaped = result.rows.map((row) => ({
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
      const oneMinuteAgo = new Date(deps.now().getTime() - 60 * 1000).toISOString();
      const result = await deps.pool.query<CooldownRow>(
        `SELECT created_at FROM status_events
         WHERE user_id = $1 AND group_id = $2 AND created_at >= $3
         ORDER BY created_at DESC LIMIT 1`,
        [req.params.userId, req.params.groupId, oneMinuteAgo]
      );

      if (result.rows.length > 0) {
        const lastAction = new Date(result.rows[0].created_at);
        const remaining = Math.max(
          0,
          Math.ceil((60 * 1000 - (deps.now().getTime() - lastAction.getTime())) / 1000)
        );
        res.json({ remaining });
      } else {
        res.json({ remaining: 0 });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

export async function maybeCreateGroupRuckusSummary(
  client: DatabaseClientLike,
  {
    groupId,
    userId,
    currentEvent,
    idGenerator,
  }: {
    groupId: string;
    userId: string;
    currentEvent: StatusEventRow;
    idGenerator: () => string;
  }
): Promise<RuckusSummaryPayload | null> {
  const windowStart = new Date(new Date(currentEvent.created_at).getTime() - 5 * 60 * 1000).toISOString();

  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`group-ruckus:${groupId}`]);

  const priorDistinctResult = await client.query<DistinctUserRow>(
    `SELECT DISTINCT user_id
     FROM status_events
     WHERE group_id = $1
       AND created_at >= $2
       AND id != $3`,
    [groupId, windowStart, currentEvent.id]
  );
  const preCount = priorDistinctResult.rows.length;
  if (preCount >= 3) {
    return null;
  }

  const windowEventsResult = await client.query<StatusWindowRow>(
    `SELECT user_id, status_type, created_at
     FROM status_events
     WHERE group_id = $1
       AND created_at >= $2
     ORDER BY created_at DESC`,
    [groupId, windowStart]
  );

  const latestStatusByUser = new Map<string, StatusType>();
  let earliestEventAt = currentEvent.created_at;

  for (const row of windowEventsResult.rows) {
    if (row.created_at < earliestEventAt) {
      earliestEventAt = row.created_at;
    }
    if (!latestStatusByUser.has(row.user_id)) {
      latestStatusByUser.set(row.user_id, row.status_type);
    }
  }

  const postCount = latestStatusByUser.size;
  if (postCount < 3) {
    return null;
  }

  const statusSet = new Set<StatusType>(latestStatusByUser.values());
  const uniformStatus = statusSet.size === 1 ? Array.from(statusSet)[0] : null;

  const insertResult = await client.query<GroupRuckusNotificationRow>(
    `INSERT INTO group_ruckus_notifications (
      id,
      group_id,
      trigger_event_id,
      triggered_by,
      window_started_at,
      window_ended_at,
      distinct_member_count
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      idGenerator(),
      groupId,
      currentEvent.id,
      userId,
      earliestEventAt,
      currentEvent.created_at,
      postCount,
    ]
  );

  return {
    record: insertResult.rows[0],
    uniformStatus,
  };
}

export async function sendGroupRuckusSummaryPush(
  deps: Pick<AppDependencies, 'pool' | 'pushSender'>,
  summary: RuckusSummaryPayload
): Promise<void> {
  const groupResult = await deps.pool.query<GroupNameRow>(
    `SELECT name as group_name FROM groups WHERE id = $1`,
    [summary.record.group_id]
  );
  if (groupResult.rows.length === 0) return;

  const tokensResult = await deps.pool.query<PushTokenRow>(
    `SELECT u.push_token
     FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = $1
       AND gm.user_id != $2
       AND gm.notifications_enabled = TRUE
       AND u.push_token IS NOT NULL`,
    [summary.record.group_id, summary.record.triggered_by]
  );

  const groupName = groupResult.rows[0].group_name;
  const distinctMemberCount = Number(summary.record.distinct_member_count);
  const body = summary.uniformStatus
    ? `${distinctMemberCount} people are ${summary.uniformStatus} up right now`
    : `${distinctMemberCount} people lit up in the last 5 minutes`;

  const messages: PushMessage[] = [];
  for (const row of tokensResult.rows) {
    if (!isExpoPushToken(row.push_token)) continue;
    messages.push({
      to: row.push_token,
      sound: 'default',
      title: `${groupName} is in a Ruckus`,
      body,
      data: { groupId: summary.record.group_id },
      channelId: 'group-ruckus',
    });
  }

  if (messages.length > 0) {
    await deps.pushSender.send(messages);
  }
}

async function sendStatusPush(
  deps: Pick<AppDependencies, 'pool' | 'pushSender'>,
  {
    userId,
    groupId,
    statusType,
  }: {
    userId: string;
    groupId: string;
    statusType: StatusType;
  }
): Promise<void> {
  const infoResult = await deps.pool.query<PushInfoRow>(
    `SELECT u.first_name, g.name as group_name
     FROM users u, groups g
     WHERE u.id = $1 AND g.id = $2`,
    [userId, groupId]
  );
  if (infoResult.rows.length === 0) return;
  const { first_name, group_name } = infoResult.rows[0];

  const tokensResult = await deps.pool.query<PushTokenRow>(
    `SELECT u.push_token
     FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = $1
       AND gm.user_id != $2
       AND gm.notifications_enabled = TRUE
       AND u.push_token IS NOT NULL`,
    [groupId, userId]
  );

  const messages: PushMessage[] = [];
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

  if (messages.length > 0) {
    await deps.pushSender.send(messages);
  }
}
