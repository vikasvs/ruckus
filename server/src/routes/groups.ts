import { Router, type Request, type Response } from 'express';
import type {
  AppDependencies,
  DatabasePoolLike,
  Queryable,
  StatusType,
} from '../app-dependencies';
import {
  buildGroupSettings,
  buildGroupStreakSummary,
  buildInviteUrl,
  nextFourAm,
  normalizeTimeZone,
  parseGroupSettings,
  pickDefaultIdentity,
} from '../growth';

interface GroupRow extends Record<string, unknown> {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
  settings: unknown;
  metadata: unknown;
}

interface CountRow extends Record<string, unknown> {
  count: string;
}

interface GroupMemberRow extends Record<string, unknown> {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  is_admin: boolean;
  notifications_enabled: boolean;
  notification_mode: 'all_activity' | 'ruckus_only' | 'watch_threshold' | 'muted';
  watch_threshold: 2 | 3 | null;
  watch_until: string | null;
  current_status: StatusType | null;
  status_updated_at: string | null;
}

interface GroupMemberWithNameRow extends GroupMemberRow {
  first_name: string;
}

interface UserGroupRow extends GroupRow {
  membership_id: string;
  joined_at: string;
  is_admin: boolean;
  notifications_enabled: boolean;
  notification_mode: 'all_activity' | 'ruckus_only' | 'watch_threshold' | 'muted';
  watch_threshold: 2 | 3 | null;
  watch_until: string | null;
  current_status: StatusType | null;
  status_updated_at: string | null;
  member_count: string;
  active_rucked_count: string;
  active_ricked_count: string;
}

interface GroupBurstRow extends Record<string, unknown> {
  group_id: string;
  created_at: string;
}

interface InviteLinkRow extends Record<string, unknown> {
  id: string;
  group_id: string;
  token: string;
  is_active: boolean;
  created_at: string;
}

interface InvitePreviewRow extends GroupRow {
  member_count: string;
  active_rucked_count: string;
  active_ricked_count: string;
  token: string;
  invite_created_at: string;
  invite_is_active: boolean;
}

interface RitualRow extends Record<string, unknown> {
  id: string;
  group_id: string;
  label: string;
  prompt_template: string;
  day_of_week: number;
  time_of_day: string;
  is_active: boolean;
  created_at: string;
}

const PUBLIC_APP_URL = (process.env.PUBLIC_APP_URL || 'https://ruckus.app').replace(/\/$/, '');

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateInviteToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 20; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function mapInviteLink(row: InviteLinkRow) {
  return {
    id: row.id,
    group_id: row.group_id,
    token: row.token,
    url: buildInviteUrl(PUBLIC_APP_URL, row.token),
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

async function getActiveInviteLink(
  queryable: Queryable,
  groupId: string,
  createdBy?: string,
  idGenerator?: () => string
) {
  const existing = await queryable.query<InviteLinkRow>(
    `SELECT * FROM group_invite_links
     WHERE group_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC
     LIMIT 1`,
    [groupId]
  );

  if (existing.rows.length > 0) {
    return mapInviteLink(existing.rows[0]);
  }

  if (!createdBy || !idGenerator) {
    return null;
  }

  const result = await queryable.query<InviteLinkRow>(
    `INSERT INTO group_invite_links (id, group_id, token, is_active, created_by)
     VALUES ($1, $2, $3, TRUE, $4)
     RETURNING *`,
    [idGenerator(), groupId, generateInviteToken(), createdBy]
  );

  return mapInviteLink(result.rows[0]);
}

async function getGroupBursts(
  pool: DatabasePoolLike,
  groupIds: string[]
) {
  if (groupIds.length === 0) return new Map<string, string[]>();

  const result = await pool.query<GroupBurstRow>(
    `SELECT group_id, created_at
     FROM group_ruckus_notifications
     WHERE group_id = ANY($1)
     ORDER BY created_at ASC`,
    [groupIds]
  );

  const burstsByGroup = new Map<string, string[]>();
  for (const row of result.rows) {
    const list = burstsByGroup.get(row.group_id) ?? [];
    list.push(row.created_at);
    burstsByGroup.set(row.group_id, list);
  }

  return burstsByGroup;
}

async function getActiveInviteLinksByGroup(
  pool: DatabasePoolLike,
  groupIds: string[]
) {
  if (groupIds.length === 0) return new Map<string, ReturnType<typeof mapInviteLink>>();

  const result = await pool.query<InviteLinkRow>(
    `SELECT DISTINCT ON (group_id) *
     FROM group_invite_links
     WHERE group_id = ANY($1) AND is_active = TRUE
     ORDER BY group_id, created_at DESC`,
    [groupIds]
  );

  return new Map(result.rows.map((row) => [row.group_id, mapInviteLink(row)]));
}

async function joinGroupByGroupId(
  pool: DatabasePoolLike,
  idGenerator: () => string,
  {
    groupId,
    userId,
  }: {
    groupId: string;
    userId: string;
  }
) {
  const existingResult = await pool.query<{ id: string }>(
    `SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId]
  );
  if (existingResult.rows.length > 0) {
    return { error: 'Already a member of this group', status: 409 as const };
  }

  const countResult = await pool.query<CountRow>(
    `SELECT COUNT(*) as count FROM group_members WHERE group_id = $1`,
    [groupId]
  );
  const memberCount = Number.parseInt(countResult.rows[0]?.count ?? '0', 10);
  if (memberCount >= 50) {
    return { error: 'Group is full (50 member limit)', status: 400 as const };
  }

  const memberResult = await pool.query<GroupMemberRow>(
    `INSERT INTO group_members (
      id,
      group_id,
      user_id,
      is_admin,
      notifications_enabled,
      notification_mode
    ) VALUES ($1, $2, $3, FALSE, TRUE, 'all_activity') RETURNING *`,
    [idGenerator(), groupId, userId]
  );

  return { membership: memberResult.rows[0] };
}

export async function loadInvitePreview(
  pool: DatabasePoolLike,
  token: string
) {
  const result = await pool.query<InvitePreviewRow>(
    `SELECT g.*,
            (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
            (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND current_status = 'rucked') as active_rucked_count,
            (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND current_status = 'ricked') as active_ricked_count,
            gil.token,
            gil.created_at as invite_created_at,
            gil.is_active as invite_is_active
     FROM group_invite_links gil
     JOIN groups g ON gil.group_id = g.id
     WHERE gil.token = $1 AND gil.is_active = TRUE AND g.is_active = TRUE`,
    [token]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const settings = parseGroupSettings(row.settings);

  return {
    group: {
      id: row.id,
      name: row.name,
      invite_code: row.invite_code,
      identity: settings.identity,
    },
    member_count: Number.parseInt(row.member_count ?? '0', 10),
    active_rucked_count: Number.parseInt(row.active_rucked_count ?? '0', 10),
    active_ricked_count: Number.parseInt(row.active_ricked_count ?? '0', 10),
    invite_link: {
      token: row.token,
      url: buildInviteUrl(PUBLIC_APP_URL, row.token),
      is_active: row.invite_is_active,
      created_at: row.invite_created_at,
    },
  };
}

export function createGroupsRouter(
  { pool, idGenerator, now }: Pick<AppDependencies, 'pool' | 'idGenerator' | 'now'>
) {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const { name, userId, timezone } = req.body;
    if (!name || !userId) {
      res.status(400).json({ error: 'name and userId are required' });
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inviteCode = generateInviteCode();
      const groupId = idGenerator();
      const groupSettings = buildGroupSettings(null, pickDefaultIdentity(name, timezone ?? 'UTC'));
      const groupResult = await client.query<GroupRow>(
        `INSERT INTO groups (id, name, invite_code, created_by, settings)
         VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *`,
        [groupId, name, inviteCode, userId, JSON.stringify(groupSettings)]
      );

      await client.query(
        `INSERT INTO group_members (
          id,
          group_id,
          user_id,
          is_admin,
          notifications_enabled,
          notification_mode
        ) VALUES ($1, $2, $3, TRUE, TRUE, 'all_activity')`,
        [idGenerator(), groupId, userId]
      );

      const inviteLink = await getActiveInviteLink(client as Queryable, groupId, userId, idGenerator);

      await client.query('COMMIT');
      res.status(201).json({
        ...groupResult.rows[0],
        settings: groupSettings,
        invite_link: inviteLink,
      });
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  router.post('/join', async (req: Request, res: Response) => {
    const { inviteCode, userId } = req.body;
    if (!inviteCode || !userId) {
      res.status(400).json({ error: 'inviteCode and userId are required' });
      return;
    }

    try {
      const groupResult = await pool.query<GroupRow>(
        `SELECT * FROM groups WHERE invite_code = $1 AND is_active = true`,
        [inviteCode.toUpperCase()]
      );
      if (groupResult.rows.length === 0) {
        res.status(404).json({ error: 'Invalid invite code' });
        return;
      }

      const result = await joinGroupByGroupId(pool, idGenerator, {
        groupId: groupResult.rows[0].id,
        userId,
      });

      if ('error' in result) {
        const statusCode = result.status ?? 400;
        res.status(statusCode).json({ error: result.error });
        return;
      }

      res.status(201).json({ group: groupResult.rows[0], membership: result.membership });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/join-link', async (req: Request, res: Response) => {
    const { inviteToken, userId } = req.body;
    if (!inviteToken || !userId) {
      res.status(400).json({ error: 'inviteToken and userId are required' });
      return;
    }

    try {
      const preview = await loadInvitePreview(pool, inviteToken);
      if (!preview) {
        res.status(404).json({ error: 'Invalid invite link' });
        return;
      }

      const result = await joinGroupByGroupId(pool, idGenerator, {
        groupId: preview.group.id,
        userId,
      });

      if ('error' in result) {
        const statusCode = result.status ?? 400;
        res.status(statusCode).json({ error: result.error });
        return;
      }

      const groupResult = await pool.query<GroupRow>('SELECT * FROM groups WHERE id = $1', [preview.group.id]);
      res.status(201).json({ group: groupResult.rows[0], membership: result.membership });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/invite/:token', async (req: Request, res: Response) => {
    try {
      const preview = await loadInvitePreview(pool, req.params.token);
      if (!preview) {
        res.status(404).json({ error: 'Invite link not found' });
        return;
      }
      res.json(preview);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
      const result = await pool.query<UserGroupRow>(
        `SELECT g.*, gm.id as membership_id, gm.is_admin, gm.notifications_enabled,
                gm.notification_mode, gm.watch_threshold, gm.watch_until,
                gm.joined_at, gm.current_status, gm.status_updated_at,
                (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
                (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND current_status = 'rucked') as active_rucked_count,
                (SELECT COUNT(*) FROM group_members WHERE group_id = g.id AND current_status = 'ricked') as active_ricked_count
         FROM group_members gm
         JOIN groups g ON gm.group_id = g.id
         WHERE gm.user_id = $1 AND g.is_active = true`,
        [req.params.userId]
      );

      const groupIds = result.rows.map((row) => row.id);
      const inviteLinksByGroup = await getActiveInviteLinksByGroup(pool, groupIds);
      const burstsByGroup = await getGroupBursts(pool, groupIds);

      res.json(result.rows.map((row) => {
        const settings = parseGroupSettings(row.settings);
        const streak = buildGroupStreakSummary({
          burstCreatedAts: burstsByGroup.get(row.id) ?? [],
          timeZone: normalizeTimeZone(settings.identity?.timezone),
          now: now(),
          freezeCount: settings.streak_freezes_remaining ?? 0,
        });

        return {
          ...row,
          settings,
          invite_link: inviteLinksByGroup.get(row.id) ?? null,
          streak,
        };
      }));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const result = await pool.query<GroupRow>('SELECT * FROM groups WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const row = result.rows[0];
      const settings = parseGroupSettings(row.settings);
      const inviteLink = await getActiveInviteLink(pool, row.id);
      const burstsByGroup = await getGroupBursts(pool, [row.id]);
      const streak = buildGroupStreakSummary({
        burstCreatedAts: burstsByGroup.get(row.id) ?? [],
        timeZone: normalizeTimeZone(settings.identity?.timezone),
        now: now(),
        freezeCount: settings.streak_freezes_remaining ?? 0,
      });

      res.json({
        ...row,
        settings,
        invite_link: inviteLink,
        streak,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.patch('/:id', async (req: Request, res: Response) => {
    const { emoji, cover_gradient, tagline, timezone, name } = req.body;

    try {
      const current = await pool.query<GroupRow>('SELECT * FROM groups WHERE id = $1', [req.params.id]);
      if (current.rows.length === 0) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const nextSettings = buildGroupSettings(current.rows[0].settings, {
        emoji,
        cover_gradient,
        tagline,
        timezone,
      });

      const result = await pool.query<GroupRow>(
        `UPDATE groups
         SET name = COALESCE($1, name),
             settings = $2::jsonb
         WHERE id = $3
         RETURNING *`,
        [name, JSON.stringify(nextSettings), req.params.id]
      );

      res.json({ ...result.rows[0], settings: nextSettings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/:id/invite', async (req: Request, res: Response) => {
    try {
      const groupResult = await pool.query<GroupRow>('SELECT * FROM groups WHERE id = $1', [req.params.id]);
      if (groupResult.rows.length === 0) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const inviteLink = await getActiveInviteLink(pool, req.params.id, groupResult.rows[0].created_by, idGenerator);
      res.json({ invite_link: inviteLink });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/:id/invite/regenerate', async (req: Request, res: Response) => {
    try {
      const groupResult = await pool.query<GroupRow>('SELECT * FROM groups WHERE id = $1', [req.params.id]);
      if (groupResult.rows.length === 0) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      await pool.query(
        `UPDATE group_invite_links SET is_active = FALSE WHERE group_id = $1 AND is_active = TRUE`,
        [req.params.id]
      );

      const inviteLink = await getActiveInviteLink(pool, req.params.id, groupResult.rows[0].created_by, idGenerator);
      res.json({ invite_link: inviteLink });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/:id/members', async (req: Request, res: Response) => {
    try {
      const result = await pool.query<GroupMemberWithNameRow>(
        `SELECT gm.*, u.first_name
         FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = $1`,
        [req.params.id]
      );
      const shaped = result.rows.map((row) => ({
        id: row.id,
        group_id: row.group_id,
        user_id: row.user_id,
        joined_at: row.joined_at,
        is_admin: row.is_admin,
        notifications_enabled: row.notifications_enabled,
        notification_mode: row.notification_mode,
        watch_threshold: row.watch_threshold,
        watch_until: row.watch_until,
        current_status: row.current_status,
        status_updated_at: row.status_updated_at,
        users: { first_name: row.first_name },
      }));
      res.json(shaped);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.patch('/:groupId/members/:userId', async (req: Request, res: Response) => {
    const {
      notifications_enabled,
      notification_mode,
      watch_threshold,
      watch_tonight,
    } = req.body;

    try {
      const currentMember = await pool.query<GroupMemberRow>(
        `SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2`,
        [req.params.groupId, req.params.userId]
      );
      if (currentMember.rows.length === 0) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      const groupResult = await pool.query<GroupRow>('SELECT * FROM groups WHERE id = $1', [req.params.groupId]);
      const settings = parseGroupSettings(groupResult.rows[0]?.settings);
      const groupTimeZone = normalizeTimeZone(settings.identity?.timezone);

      let nextMode = notification_mode as GroupMemberRow['notification_mode'] | undefined;
      if (!nextMode && typeof notifications_enabled === 'boolean') {
        nextMode = notifications_enabled ? 'all_activity' : 'muted';
      }
      if (!nextMode) {
        nextMode = currentMember.rows[0].notification_mode;
      }

      const nextThreshold = nextMode === 'watch_threshold'
        ? ((watch_threshold ?? currentMember.rows[0].watch_threshold ?? 2) as 2 | 3)
        : null;
      const watchUntil = watch_tonight
        ? nextFourAm(now(), groupTimeZone).toISOString()
        : nextMode === 'watch_threshold'
          ? currentMember.rows[0].watch_until
          : null;
      const enabled = nextMode !== 'muted';

      const result = await pool.query<GroupMemberRow>(
        `UPDATE group_members
         SET notifications_enabled = $1,
             notification_mode = $2,
             watch_threshold = $3,
             watch_until = $4
         WHERE group_id = $5 AND user_id = $6
         RETURNING *`,
        [enabled, nextMode, nextThreshold, watchUntil, req.params.groupId, req.params.userId]
      );

      res.json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/:id/rituals', async (req: Request, res: Response) => {
    try {
      const result = await pool.query<RitualRow>(
        `SELECT * FROM group_rituals WHERE group_id = $1 ORDER BY day_of_week ASC, time_of_day ASC`,
        [req.params.id]
      );
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/:id/rituals', async (req: Request, res: Response) => {
    const {
      id,
      userId,
      label,
      prompt_template,
      day_of_week,
      time_of_day,
      is_active,
    } = req.body;

    try {
      if (id) {
        const result = await pool.query<RitualRow>(
          `UPDATE group_rituals
           SET label = COALESCE($1, label),
               prompt_template = COALESCE($2, prompt_template),
               day_of_week = COALESCE($3, day_of_week),
               time_of_day = COALESCE($4, time_of_day),
               is_active = COALESCE($5, is_active)
           WHERE id = $6 AND group_id = $7
           RETURNING *`,
          [label, prompt_template, day_of_week, time_of_day, is_active, id, req.params.id]
        );
        if (result.rows.length === 0) {
          res.status(404).json({ error: 'Ritual not found' });
          return;
        }
        res.json(result.rows[0]);
        return;
      }

      if (!userId || !label || !prompt_template || day_of_week == null || !time_of_day) {
        res.status(400).json({ error: 'userId, label, prompt_template, day_of_week, and time_of_day are required' });
        return;
      }

      const activeCount = await pool.query<CountRow>(
        `SELECT COUNT(*) as count FROM group_rituals WHERE group_id = $1 AND is_active = TRUE`,
        [req.params.id]
      );
      if (Number.parseInt(activeCount.rows[0]?.count ?? '0', 10) >= 3) {
        res.status(400).json({ error: 'Each group can have up to 3 active rituals' });
        return;
      }

      const result = await pool.query<RitualRow>(
        `INSERT INTO group_rituals (
          id,
          group_id,
          created_by,
          label,
          prompt_template,
          day_of_week,
          time_of_day,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
        RETURNING *`,
        [idGenerator(), req.params.id, userId, label, prompt_template, day_of_week, time_of_day]
      );
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
