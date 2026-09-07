import { Router, type Request, type Response } from 'express';
import type {
  AppDependencies,
  DatabaseClientLike,
  PushMessage,
  StatusType,
} from '../app-dependencies';
import {
  buildGroupAnalytics,
  type AnalyticsBurstSource,
  type AnalyticsEventSource,
  type AnalyticsMemberSource,
  type AnalyticsRecapSource,
} from '../analytics';
import {
  buildBurstShareText,
  buildGroupStreakSummary,
  buildInviteUrl,
  getTimeZoneParts,
  normalizeTimeZone,
  parseGroupSettings,
  recapTitle,
} from '../growth';
import { isExpoPushToken } from '../push';

const PUBLIC_APP_URL = (process.env.PUBLIC_APP_URL || 'https://ruckus.app').replace(/\/$/, '');
const RUCKUS_THRESHOLD = 2;
const ROLL_CALL_DURATION_MS = 90 * 60 * 1000;
const REACTION_EMOJIS = new Set(['⚡', '🔥', '🍻', '🫡', '💀']);

type NotificationMode = 'all_activity' | 'ruckus_only' | 'watch_threshold' | 'muted';
type ReactionTargetType = 'status_event' | 'burst';
type RollCallResponse = 'pulling_up' | 'maybe' | 'dead';
type AnalyticsWindow = 'week' | 'season' | 'all';

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
  source_event_id: string | null;
  ritual_instance_id: string | null;
}

interface GroupStatusRow extends Record<string, unknown> {
  user_id: string;
  current_status: StatusType;
  status_updated_at: string;
  first_name: string;
}

interface LegacyActivityRow extends StatusEventRow {
  first_name: string;
}

interface FeedStatusRow extends StatusEventRow {
  first_name: string;
  source_id: string | null;
  source_first_name: string | null;
  source_status_type: StatusType | null;
  ritual_id: string | null;
  ritual_label: string | null;
  ritual_prompt_template: string | null;
}

interface FeedBurstRow extends Record<string, unknown> {
  id: string;
  group_id: string;
  distinct_member_count: number;
  created_at: string;
  trigger_event_id: string;
  triggered_by: string;
  window_started_at: string;
  window_ended_at: string;
  closer_first_name: string | null;
  participant_names?: string[];
  active_until?: string;
}

interface RecapRow extends Record<string, unknown> {
  id: string;
  group_id: string;
  burst_id: string;
  title: string;
  caption: string | null;
  top_reaction: string | null;
  reaction_total: number;
  turnout_pulling_up: number;
  turnout_maybe: number;
  turnout_dead: number;
  photo_count: number;
  share_text: string;
  created_at: string;
  closer_first_name: string | null;
}

interface CooldownRow extends Record<string, unknown> {
  created_at: string;
}

interface PushInfoRow extends Record<string, unknown> {
  first_name: string;
  group_name: string;
}

interface GroupMetaRow extends Record<string, unknown> {
  id: string;
  name: string;
  settings: unknown;
}

interface InviteTokenRow extends Record<string, unknown> {
  token: string;
}

interface PushRecipientRow extends Record<string, unknown> {
  user_id: string;
  push_token: string | null;
  notifications_enabled: boolean;
  notification_mode: NotificationMode;
  watch_threshold: 2 | 3 | null;
  watch_until: string | null;
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

interface GroupBurstCreatedAtRow extends Record<string, unknown> {
  created_at: string;
}

interface ReactionRow extends Record<string, unknown> {
  target_type: ReactionTargetType;
  target_id: string;
  emoji: string;
  count: number | string;
  selected: boolean;
}

interface RollCallRow extends Record<string, unknown> {
  id: string;
  burst_id: string;
  group_id: string;
  created_at: string;
  ends_at: string;
  pulling_up_count: number | string;
  maybe_count: number | string;
  dead_count: number | string;
  my_response: RollCallResponse | null;
}

interface BurstDueRecapRow extends Record<string, unknown> {
  burst_id: string;
  group_id: string;
  burst_created_at: string;
  distinct_member_count: number;
  closer_first_name: string | null;
  roll_call_id: string | null;
  ends_at: string | null;
}

interface RollCallCountRow extends Record<string, unknown> {
  response: RollCallResponse;
  count: number | string;
}

interface RitualRow extends Record<string, unknown> {
  id: string;
  label: string;
  prompt_template: string;
  day_of_week: number;
  time_of_day: string;
}

interface RitualInstanceRow extends Record<string, unknown> {
  id: string;
  group_id: string;
  ritual_id: string;
  scheduled_for: string;
  expires_at: string;
  notified_at: string | null;
  label: string;
  prompt_template: string;
}

interface AnalyticsMemberRow extends Record<string, unknown> {
  user_id: string;
  first_name: string;
}

interface AnalyticsEventRow extends Record<string, unknown> {
  user_id: string;
  status_type: StatusType;
  created_at: string;
}

interface AnalyticsBurstRow extends Record<string, unknown> {
  triggered_by: string;
  window_started_at: string;
  window_ended_at: string;
  distinct_member_count: number;
  created_at: string;
}

interface AnalyticsRecapRow extends Record<string, unknown> {
  id: string;
  title: string;
  created_at: string;
  photo_count: number;
  caption: string | null;
}

interface RuckusSummaryPayload {
  record: GroupRuckusNotificationRow;
  uniformStatus: StatusType | null;
}

interface RollingWindowState {
  preCount: number;
  postCount: number;
  uniformStatus: StatusType | null;
  earliestEventAt: string;
}

function parseAnalyticsWindow(value: unknown): AnalyticsWindow {
  if (value === 'week' || value === 'season' || value === 'all') {
    return value;
  }
  return 'week';
}

function parseNotificationMode(
  notificationsEnabled: boolean,
  notificationMode: NotificationMode | null | undefined,
  watchUntil: string | null,
  now: Date
): NotificationMode {
  if (!notificationsEnabled) {
    return 'muted';
  }

  if (notificationMode === 'watch_threshold' && watchUntil) {
    if (new Date(watchUntil).getTime() < now.getTime()) {
      return 'all_activity';
    }
  }

  return notificationMode ?? 'all_activity';
}

function isWatchThresholdCrossing(
  {
    preCount,
    postCount,
  }: RollingWindowState,
  threshold: 2 | 3
) {
  return preCount < threshold && postCount >= threshold;
}

function addUtcDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function mostRecentRitualOccurrence(
  ritual: Pick<RitualRow, 'day_of_week' | 'time_of_day'>,
  timeZone: string,
  now: Date
) {
  const parts = getTimeZoneParts(now, timeZone);
  const [hourText, minuteText] = ritual.time_of_day.split(':');
  const scheduledHour = Number(hourText);
  const scheduledMinute = Number(minuteText);
  const todayKey = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;

  let offset = (parts.weekday - ritual.day_of_week + 7) % 7;
  const scheduledHasNotHappenedToday = offset === 0 && (
    parts.hour < scheduledHour ||
    (parts.hour === scheduledHour && parts.minute < scheduledMinute)
  );

  if (scheduledHasNotHappenedToday) {
    offset = 7;
  }

  const targetDateKey = addUtcDays(todayKey, -offset);
  const [year, month, day] = targetDateKey.split('-').map(Number);
  const scheduledFor = new Date(Date.UTC(year, month - 1, day, scheduledHour, scheduledMinute, 0));
  const localParts = getTimeZoneParts(scheduledFor, timeZone);
  const diff =
    Date.UTC(year, month - 1, day, scheduledHour, scheduledMinute, 0) -
    Date.UTC(
      localParts.year,
      localParts.month - 1,
      localParts.day,
      localParts.hour,
      localParts.minute,
      localParts.second
    );

  const actual = new Date(scheduledFor.getTime() + diff);
  return {
    scheduledFor: actual,
    expiresAt: new Date(actual.getTime() + (4 * 60 * 60 * 1000)),
  };
}

async function loadGroupMeta(
  pool: AppDependencies['pool'],
  groupId: string
) {
  const result = await pool.query<GroupMetaRow>(
    `SELECT id, name, settings FROM groups WHERE id = $1`,
    [groupId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const settings = parseGroupSettings(row.settings);
  const timeZone = normalizeTimeZone(settings.identity?.timezone);

  return {
    id: row.id,
    name: row.name,
    settings,
    timeZone,
  };
}

async function loadActiveInviteUrl(
  pool: AppDependencies['pool'],
  groupId: string
) {
  const result = await pool.query<InviteTokenRow>(
    `SELECT token
     FROM group_invite_links
     WHERE group_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC
     LIMIT 1`,
    [groupId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return buildInviteUrl(PUBLIC_APP_URL, result.rows[0].token);
}

async function loadRollingWindowState(
  client: DatabaseClientLike,
  {
    groupId,
    currentEvent,
  }: {
    groupId: string;
    currentEvent: StatusEventRow;
  }
): Promise<RollingWindowState> {
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
  const statusSet = new Set<StatusType>(latestStatusByUser.values());
  const uniformStatus = statusSet.size === 1 ? Array.from(statusSet)[0] : null;

  return {
    preCount,
    postCount,
    uniformStatus,
    earliestEventAt,
  };
}

async function ensureBurstRollCall(
  client: DatabaseClientLike,
  {
    groupId,
    burstId,
    burstCreatedAt,
    idGenerator,
  }: {
    groupId: string;
    burstId: string;
    burstCreatedAt: string;
    idGenerator: () => string;
  }
) {
  await client.query(
    `INSERT INTO burst_roll_calls (id, group_id, burst_id, ends_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (burst_id) DO NOTHING`,
    [
      idGenerator(),
      groupId,
      burstId,
      new Date(new Date(burstCreatedAt).getTime() + ROLL_CALL_DURATION_MS).toISOString(),
    ]
  );
}

async function materializeBurstRecaps(
  deps: Pick<AppDependencies, 'pool' | 'idGenerator' | 'now'>,
  groupId: string
) {
  const groupMeta = await loadGroupMeta(deps.pool, groupId);
  if (!groupMeta) {
    return;
  }

  const dueRecaps = await deps.pool.query<BurstDueRecapRow>(
    `SELECT grn.id as burst_id,
            grn.group_id,
            grn.created_at as burst_created_at,
            grn.distinct_member_count,
            u.first_name as closer_first_name,
            brc.id as roll_call_id,
            brc.ends_at
     FROM group_ruckus_notifications grn
     LEFT JOIN burst_roll_calls brc ON brc.burst_id = grn.id
     LEFT JOIN burst_recaps recap ON recap.burst_id = grn.id
     LEFT JOIN users u ON u.id = grn.triggered_by
     WHERE grn.group_id = $1
       AND recap.id IS NULL
       AND brc.ends_at IS NOT NULL
       AND brc.ends_at <= $2
     ORDER BY grn.created_at DESC`,
    [groupId, deps.now().toISOString()]
  );

  const shareUrl = (await loadActiveInviteUrl(deps.pool, groupId)) ?? PUBLIC_APP_URL;

  for (const row of dueRecaps.rows) {
    const countsResult = row.roll_call_id
      ? await deps.pool.query<RollCallCountRow>(
        `SELECT response, COUNT(*) as count
         FROM burst_roll_call_responses
         WHERE roll_call_id = $1
         GROUP BY response`,
        [row.roll_call_id]
      )
      : { rows: [] as RollCallCountRow[] };

    const counts: Record<RollCallResponse, number> = {
      pulling_up: 0,
      maybe: 0,
      dead: 0,
    };

    for (const countRow of countsResult.rows) {
      counts[countRow.response] = Number.parseInt(`${countRow.count}`, 10);
    }

    const reactionsResult = await deps.pool.query<ReactionRow>(
      `SELECT target_type, target_id, emoji, COUNT(*)::int as count, FALSE as selected
       FROM status_event_reactions
       WHERE group_id = $1 AND target_type = 'burst' AND target_id = $2
       GROUP BY target_type, target_id, emoji`,
      [groupId, row.burst_id]
    );

    const topReaction = reactionsResult.rows
      .slice()
      .sort((left, right) => (
        Number(right.count) - Number(left.count) || left.emoji.localeCompare(right.emoji)
      ))[0]?.emoji ?? null;
    const reactionTotal = reactionsResult.rows.reduce(
      (sum, reactionRow) => sum + Number(reactionRow.count),
      0
    );
    const title = recapTitle(groupMeta.name, row.closer_first_name);
    const turnoutText = counts.pulling_up > 0
      ? `${counts.pulling_up} pulling up`
      : `${row.distinct_member_count} roos lit up`;
    const shareText = buildBurstShareText({
      groupName: groupMeta.name,
      memberCount: row.distinct_member_count,
      body: turnoutText,
      url: shareUrl,
    });

    await deps.pool.query(
      `INSERT INTO burst_recaps (
         id,
         group_id,
         burst_id,
         roll_call_id,
         title,
         caption,
         top_reaction,
         reaction_total,
         turnout_pulling_up,
         turnout_maybe,
         turnout_dead,
         photo_count,
         share_text
       ) VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $8, $9, $10, 0, $11)
       ON CONFLICT (burst_id) DO NOTHING`,
      [
        deps.idGenerator(),
        groupId,
        row.burst_id,
        row.roll_call_id,
        title,
        topReaction,
        reactionTotal,
        counts.pulling_up,
        counts.maybe,
        counts.dead,
        shareText,
      ]
    );
  }
}

async function materializeActiveRitualInstances(
  deps: Pick<AppDependencies, 'pool' | 'idGenerator' | 'now'>,
  groupId: string
) {
  const groupMeta = await loadGroupMeta(deps.pool, groupId);
  if (!groupMeta) {
    return;
  }

  const rituals = await deps.pool.query<RitualRow>(
    `SELECT id, label, prompt_template, day_of_week, time_of_day
     FROM group_rituals
     WHERE group_id = $1 AND is_active = TRUE`,
    [groupId]
  );

  for (const ritual of rituals.rows) {
    const occurrence = mostRecentRitualOccurrence(ritual, groupMeta.timeZone, deps.now());
    if (occurrence.expiresAt.getTime() < deps.now().getTime()) {
      continue;
    }

    await deps.pool.query(
      `INSERT INTO ritual_instances (id, group_id, ritual_id, scheduled_for, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ritual_id, scheduled_for) DO NOTHING`,
      [
        deps.idGenerator(),
        groupId,
        ritual.id,
        occurrence.scheduledFor.toISOString(),
        occurrence.expiresAt.toISOString(),
      ]
    );
  }
}

async function loadReactionSummaryMap(
  deps: Pick<AppDependencies, 'pool'>,
  {
    groupId,
    userId,
    statusIds,
    burstIds,
  }: {
    groupId: string;
    userId: string;
    statusIds: string[];
    burstIds: string[];
  }
) {
  if (statusIds.length === 0 && burstIds.length === 0) {
    return new Map<string, Array<{ emoji: string; count: number; selected: boolean }>>();
  }

  const result = await deps.pool.query<ReactionRow>(
    `SELECT target_type,
            target_id,
            emoji,
            COUNT(*)::int as count,
            BOOL_OR(user_id = $4) as selected
     FROM status_event_reactions
     WHERE group_id = $1
       AND (
         (target_type = 'status_event' AND target_id = ANY($2))
         OR
         (target_type = 'burst' AND target_id = ANY($3))
       )
     GROUP BY target_type, target_id, emoji`,
    [groupId, statusIds, burstIds, userId]
  );

  const map = new Map<string, Array<{ emoji: string; count: number; selected: boolean }>>();

  for (const row of result.rows) {
    const key = `${row.target_type}:${row.target_id}`;
    const list = map.get(key) ?? [];
    list.push({
      emoji: row.emoji,
      count: Number(row.count),
      selected: row.selected,
    });
    map.set(key, list);
  }

  return map;
}

async function loadRollCallMap(
  deps: Pick<AppDependencies, 'pool'>,
  {
    groupId,
    userId,
    burstIds,
  }: {
    groupId: string;
    userId: string;
    burstIds: string[];
  }
) {
  if (burstIds.length === 0) {
    return new Map<string, RollCallRow>();
  }

  const result = await deps.pool.query<RollCallRow>(
    `SELECT brc.id,
            brc.burst_id,
            brc.group_id,
            brc.created_at,
            brc.ends_at,
            COALESCE(SUM(CASE WHEN brcr.response = 'pulling_up' THEN 1 ELSE 0 END), 0)::int as pulling_up_count,
            COALESCE(SUM(CASE WHEN brcr.response = 'maybe' THEN 1 ELSE 0 END), 0)::int as maybe_count,
            COALESCE(SUM(CASE WHEN brcr.response = 'dead' THEN 1 ELSE 0 END), 0)::int as dead_count,
            MAX(CASE WHEN brcr.user_id = $2 THEN brcr.response ELSE NULL END) as my_response
     FROM burst_roll_calls brc
     LEFT JOIN burst_roll_call_responses brcr ON brcr.roll_call_id = brc.id
     WHERE brc.group_id = $1 AND brc.burst_id = ANY($3)
     GROUP BY brc.id
     ORDER BY brc.created_at DESC`,
    [groupId, userId, burstIds]
  );

  return new Map(result.rows.map((row) => [row.burst_id, row]));
}

function buildShareBody(
  {
    distinctMemberCount,
    uniformStatus,
  }: {
    distinctMemberCount: number;
    uniformStatus: StatusType | null;
  }
) {
  if (uniformStatus) {
    return `${distinctMemberCount} people are ${uniformStatus} up right now`;
  }

  return `${distinctMemberCount} people lit up in the last 5 minutes`;
}

export function createStatusRouter(deps: AppDependencies) {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const { userId, groupId, statusType, sourceEventId, ritualInstanceId } = req.body;
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
    let windowState: RollingWindowState | null = null;

    try {
      await client.query('BEGIN');

      const memberResult = await client.query<CurrentStatusRow>(
        `SELECT current_status FROM group_members WHERE user_id = $1 AND group_id = $2`,
        [userId, groupId]
      );
      const previousStatus = memberResult.rows[0]?.current_status ?? null;

      const expiresAt = new Date(deps.now().getTime() + 4 * 60 * 60 * 1000).toISOString();
      const eventResult = await client.query<StatusEventRow>(
        `INSERT INTO status_events (
           id,
           user_id,
           group_id,
           status_type,
           expires_at,
           previous_status,
           source_event_id,
           ritual_instance_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          deps.idGenerator(),
          userId,
          groupId,
          statusType,
          expiresAt,
          previousStatus,
          sourceEventId ?? null,
          ritualInstanceId ?? null,
        ]
      );
      statusEvent = eventResult.rows[0];

      await client.query(
        `UPDATE group_members
         SET current_status = $1, status_updated_at = NOW()
         WHERE user_id = $2 AND group_id = $3`,
        [statusType, userId, groupId]
      );

      windowState = await loadRollingWindowState(client, {
        groupId,
        currentEvent: statusEvent,
      });
      ruckusSummary = await maybeCreateGroupRuckusSummary(client, {
        groupId,
        userId,
        currentEvent: statusEvent,
        idGenerator: deps.idGenerator,
        windowState,
      });

      if (ruckusSummary) {
        await ensureBurstRollCall(client, {
          groupId,
          burstId: ruckusSummary.record.id,
          burstCreatedAt: ruckusSummary.record.created_at,
          idGenerator: deps.idGenerator,
        });
      }

      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message });
      return;
    } finally {
      client.release();
    }

    void (async () => {
      if (!statusEvent || !windowState) {
        return;
      }

      try {
        await sendStatusPush(deps, {
          userId,
          groupId,
          statusType,
          statusEventId: statusEvent.id,
        });
      } catch (err) {
        console.error('Push notification error:', (err as Error).message);
      }

      try {
        await sendWatchThresholdPush(deps, {
          groupId,
          triggeredBy: userId,
          windowState,
        });
      } catch (err) {
        console.error('Watch-threshold push error:', (err as Error).message);
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

  router.get('/activity/:groupId', async (req: Request, res: Response) => {
    const limit = Math.min(100, Math.max(1, Number.parseInt(`${req.query.limit ?? '20'}`, 10) || 20));
    const offset = Math.max(0, Number.parseInt(`${req.query.offset ?? '0'}`, 10) || 0);
    const memberId = typeof req.query.userId === 'string' ? req.query.userId : null;
    try {
      const result = await deps.pool.query<LegacyActivityRow>(
        `SELECT se.*, u.first_name
         FROM status_events se
         JOIN users u ON se.user_id = u.id
         WHERE se.group_id = $1
           AND ($3::uuid IS NULL OR se.user_id = $3::uuid)
         ORDER BY se.created_at DESC, se.id DESC
         LIMIT $2 OFFSET $4`,
        [req.params.groupId, limit, memberId, offset]
      );
      const shaped = result.rows.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        group_id: row.group_id,
        status_type: row.status_type,
        created_at: row.created_at,
        expires_at: row.expires_at,
        previous_status: row.previous_status,
        source_event_id: row.source_event_id,
        ritual_instance_id: row.ritual_instance_id,
        users: { first_name: row.first_name },
      }));
      res.json(shaped);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/feed/:groupId/:userId', async (req: Request, res: Response) => {
    const limit = Math.max(10, Number.parseInt(`${req.query.limit ?? '24'}`, 10) || 24);

    try {
      await materializeActiveRitualInstances(deps, req.params.groupId);
      await materializeBurstRecaps(deps, req.params.groupId);

      const groupMeta = await loadGroupMeta(deps.pool, req.params.groupId);
      if (!groupMeta) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const shareUrl = (await loadActiveInviteUrl(deps.pool, req.params.groupId)) ?? PUBLIC_APP_URL;

      const [statusResult, burstResult, recapResult, ritualResult, streakResult] = await Promise.all([
        deps.pool.query<FeedStatusRow>(
          `SELECT se.*,
                  u.first_name,
                  src.id as source_id,
                  su.first_name as source_first_name,
                  src.status_type as source_status_type,
                  ri.ritual_id,
                  gr.label as ritual_label,
                  gr.prompt_template as ritual_prompt_template
           FROM status_events se
           JOIN users u ON u.id = se.user_id
           LEFT JOIN status_events src ON src.id = se.source_event_id
           LEFT JOIN users su ON su.id = src.user_id
           LEFT JOIN ritual_instances ri ON ri.id = se.ritual_instance_id
           LEFT JOIN group_rituals gr ON gr.id = ri.ritual_id
           WHERE se.group_id = $1
           ORDER BY se.created_at DESC
           LIMIT $2`,
          [req.params.groupId, limit]
        ),
        deps.pool.query<FeedBurstRow>(
          `SELECT grn.id,
                  grn.group_id,
                  grn.distinct_member_count,
                  grn.created_at,
                  grn.trigger_event_id,
                  grn.triggered_by,
                  grn.window_started_at,
                  grn.window_ended_at,
                  u.first_name as closer_first_name,
                  ARRAY(
                    SELECT person.first_name
                    FROM users person
                    JOIN (
                      SELECT DISTINCT se.user_id
                      FROM status_events se
                      WHERE se.group_id = grn.group_id
                        AND ((se.created_at >= grn.window_started_at
                          AND se.created_at <= grn.window_ended_at)
                          OR se.id = grn.trigger_event_id)
                    ) participants ON participants.user_id = person.id
                    ORDER BY person.first_name, person.id
                  ) as participant_names,
                  (
                    -- End at the first five-minute quiet gap. Later posts must
                    -- not resurrect an old Ruckus, even after an app restart.
                    SELECT MIN(moment + INTERVAL '5 minutes')
                    FROM (
                      SELECT moment, LEAD(moment) OVER (ORDER BY moment) AS next_moment
                      FROM (
                        SELECT grn.window_ended_at AS moment
                        UNION
                        SELECT se.created_at
                        FROM status_events se
                        WHERE se.group_id = grn.group_id
                          AND se.created_at > grn.window_ended_at
                      ) moments
                    ) gaps
                    WHERE next_moment IS NULL OR next_moment >= moment + INTERVAL '5 minutes'
                  ) as active_until
           FROM group_ruckus_notifications grn
           LEFT JOIN users u ON u.id = grn.triggered_by
           WHERE grn.group_id = $1
           ORDER BY grn.created_at DESC
           LIMIT 8`,
          [req.params.groupId]
        ),
        deps.pool.query<RecapRow>(
          `SELECT recap.*,
                  u.first_name as closer_first_name
           FROM burst_recaps recap
           LEFT JOIN group_ruckus_notifications grn ON grn.id = recap.burst_id
           LEFT JOIN users u ON u.id = grn.triggered_by
           WHERE recap.group_id = $1
           ORDER BY recap.created_at DESC
           LIMIT 8`,
          [req.params.groupId]
        ),
        deps.pool.query<RitualInstanceRow>(
          `SELECT ri.*,
                  gr.label,
                  gr.prompt_template
           FROM ritual_instances ri
           JOIN group_rituals gr ON gr.id = ri.ritual_id
           WHERE ri.group_id = $1
             AND ri.scheduled_for <= $2
             AND ri.expires_at >= $2
           ORDER BY ri.scheduled_for DESC
           LIMIT 4`,
          [req.params.groupId, deps.now().toISOString()]
        ),
        deps.pool.query<GroupBurstCreatedAtRow>(
          `SELECT created_at
           FROM group_ruckus_notifications
           WHERE group_id = $1
           ORDER BY created_at ASC`,
          [req.params.groupId]
        ),
      ]);

      const streak = buildGroupStreakSummary({
        burstCreatedAts: streakResult.rows.map((row) => row.created_at),
        timeZone: groupMeta.timeZone,
        now: deps.now(),
        freezeCount: groupMeta.settings.streak_freezes_remaining ?? 0,
      });

      const statusIds = statusResult.rows.map((row) => row.id);
      const burstIds = burstResult.rows.map((row) => row.id);
      const [reactionMap, rollCallMap] = await Promise.all([
        loadReactionSummaryMap(deps, {
          groupId: req.params.groupId,
          userId: req.params.userId,
          statusIds,
          burstIds,
        }),
        loadRollCallMap(deps, {
          groupId: req.params.groupId,
          userId: req.params.userId,
          burstIds,
        }),
      ]);

      const items = [
        ...statusResult.rows.map((row) => ({
          type: 'status' as const,
          id: row.id,
          created_at: row.created_at,
          group_id: row.group_id,
          user_id: row.user_id,
          first_name: row.first_name,
          status_type: row.status_type,
          previous_status: row.previous_status,
          source_event: row.source_id
            ? {
              id: row.source_id,
              first_name: row.source_first_name ?? 'Someone',
              status_type: row.source_status_type ?? row.status_type,
            }
            : null,
          ritual: row.ritual_id
            ? {
              id: row.ritual_id,
              label: row.ritual_label ?? 'Ritual',
              prompt_template: row.ritual_prompt_template ?? '',
            }
            : null,
          reactions: reactionMap.get(`status_event:${row.id}`) ?? [],
        })),
        ...burstResult.rows.map((row) => {
          const rollCall = rollCallMap.get(row.id);
          const reactions = reactionMap.get(`burst:${row.id}`) ?? [];
          const body = buildShareBody({
            distinctMemberCount: row.distinct_member_count,
            uniformStatus: null,
          });

          return {
            type: 'burst' as const,
            id: row.id,
            created_at: row.created_at,
            group_id: row.group_id,
            title: `${groupMeta.name} is in a Ruckus`,
            body,
            distinct_member_count: row.distinct_member_count,
            closer_first_name: row.closer_first_name,
            participant_names: row.participant_names ?? [],
            active_until: row.active_until,
            share_url: shareUrl,
            share_text: buildBurstShareText({
              groupName: groupMeta.name,
              memberCount: row.distinct_member_count,
              body,
              url: shareUrl,
            }),
            reactions,
            streak,
            roll_call: rollCall
              ? {
                type: 'rollcall' as const,
                id: rollCall.id,
                created_at: rollCall.created_at,
                burst_id: row.id,
                group_id: row.group_id,
                ends_at: rollCall.ends_at,
                counts: {
                  pulling_up: Number(rollCall.pulling_up_count),
                  maybe: Number(rollCall.maybe_count),
                  dead: Number(rollCall.dead_count),
                },
                my_response: rollCall.my_response,
              }
              : null,
          };
        }),
        ...ritualResult.rows.map((row) => ({
          type: 'ritual' as const,
          id: row.id,
          created_at: row.scheduled_for,
          group_id: row.group_id,
          ritual_id: row.ritual_id,
          label: row.label,
          prompt_template: row.prompt_template,
          scheduled_for: row.scheduled_for,
          expires_at: row.expires_at,
        })),
        ...recapResult.rows.map((row) => ({
          type: 'recap' as const,
          id: row.id,
          created_at: row.created_at,
          group_id: row.group_id,
          burst_id: row.burst_id,
          title: row.title,
          closer_first_name: row.closer_first_name,
          turnout_counts: {
            pulling_up: row.turnout_pulling_up,
            maybe: row.turnout_maybe,
            dead: row.turnout_dead,
          },
          top_reaction: row.top_reaction as '⚡' | '🔥' | '🍻' | '🫡' | '💀' | null,
          reaction_total: row.reaction_total,
          streak,
          photo_count: row.photo_count,
          caption: row.caption,
          share_url: shareUrl,
          share_text: row.share_text,
        })),
      ].sort((left, right) => (
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      ));

      const page = items.slice(0, limit);
      const activeBurst = items.find((item) => item.type === 'burst'
        && item.active_until && new Date(item.active_until).getTime() > deps.now().getTime());
      // Busy feeds must retain the active card even if its start is off-page.
      if (activeBurst && !page.includes(activeBurst)) page.push(activeBurst);
      res.json(page);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/reactions', async (req: Request, res: Response) => {
    const { groupId, userId, targetType, targetId, emoji } = req.body as {
      groupId?: string;
      userId?: string;
      targetType?: ReactionTargetType;
      targetId?: string;
      emoji?: string | null;
    };

    if (!groupId || !userId || !targetType || !targetId) {
      res.status(400).json({ error: 'groupId, userId, targetType, and targetId are required' });
      return;
    }
    if (targetType !== 'status_event' && targetType !== 'burst') {
      res.status(400).json({ error: 'targetType must be "status_event" or "burst"' });
      return;
    }
    if (emoji != null && !REACTION_EMOJIS.has(emoji)) {
      res.status(400).json({ error: 'Invalid reaction emoji' });
      return;
    }

    try {
      const existing = await deps.pool.query<{ emoji: string }>(
        `SELECT emoji
         FROM status_event_reactions
         WHERE target_type = $1 AND target_id = $2 AND user_id = $3`,
        [targetType, targetId, userId]
      );

      if (emoji == null || existing.rows[0]?.emoji === emoji) {
        await deps.pool.query(
          `DELETE FROM status_event_reactions
           WHERE target_type = $1 AND target_id = $2 AND user_id = $3`,
          [targetType, targetId, userId]
        );
      } else if (existing.rows.length > 0) {
        await deps.pool.query(
          `UPDATE status_event_reactions
           SET emoji = $1, created_at = NOW()
           WHERE target_type = $2 AND target_id = $3 AND user_id = $4`,
          [emoji, targetType, targetId, userId]
        );
      } else {
        await deps.pool.query(
          `INSERT INTO status_event_reactions (id, group_id, target_type, target_id, user_id, emoji)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [deps.idGenerator(), groupId, targetType, targetId, userId, emoji]
        );
      }

      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/roll-call/:rollCallId/respond', async (req: Request, res: Response) => {
    const { userId, response } = req.body as {
      userId?: string;
      response?: RollCallResponse;
    };

    if (!userId || !response) {
      res.status(400).json({ error: 'userId and response are required' });
      return;
    }
    if (!['pulling_up', 'maybe', 'dead'].includes(response)) {
      res.status(400).json({ error: 'Invalid roll call response' });
      return;
    }

    try {
      await deps.pool.query(
        `INSERT INTO burst_roll_call_responses (id, roll_call_id, user_id, response)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (roll_call_id, user_id)
         DO UPDATE SET response = EXCLUDED.response, responded_at = NOW()`,
        [deps.idGenerator(), req.params.rollCallId, userId, response]
      );
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/analytics/:groupId/:userId', async (req: Request, res: Response) => {
    try {
      await materializeBurstRecaps(deps, req.params.groupId);

      const groupMeta = await loadGroupMeta(deps.pool, req.params.groupId);
      if (!groupMeta) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }

      const window = parseAnalyticsWindow(req.query.window);

      const [membersResult, eventsResult, burstsResult, recapsResult] = await Promise.all([
        deps.pool.query<AnalyticsMemberRow>(
          `SELECT gm.user_id, u.first_name
           FROM group_members gm
           JOIN users u ON gm.user_id = u.id
           WHERE gm.group_id = $1
           ORDER BY u.first_name ASC`,
          [req.params.groupId]
        ),
        deps.pool.query<AnalyticsEventRow>(
          `SELECT user_id, status_type, created_at
           FROM status_events
           WHERE group_id = $1
           ORDER BY created_at ASC`,
          [req.params.groupId]
        ),
        deps.pool.query<AnalyticsBurstRow>(
          `SELECT triggered_by, window_started_at, window_ended_at, distinct_member_count, created_at
           FROM group_ruckus_notifications
           WHERE group_id = $1
           ORDER BY created_at ASC`,
          [req.params.groupId]
        ),
        deps.pool.query<AnalyticsRecapRow>(
          `SELECT id, title, created_at, photo_count, caption
           FROM burst_recaps
           WHERE group_id = $1
           ORDER BY created_at DESC`,
          [req.params.groupId]
        ),
      ]);

      const analytics = buildGroupAnalytics(
        {
          members: membersResult.rows as AnalyticsMemberSource[],
          events: eventsResult.rows as AnalyticsEventSource[],
          bursts: burstsResult.rows as AnalyticsBurstSource[],
          recaps: recapsResult.rows as AnalyticsRecapSource[],
          currentUserId: req.params.userId,
          timeZone: groupMeta.timeZone,
          freezeCount: groupMeta.settings.streak_freezes_remaining ?? 0,
          window,
        },
        deps.now()
      );

      res.json(analytics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/cooldown/:userId/:groupId', async (req: Request, res: Response) => {
    try {
      const oneMinuteAgo = new Date(deps.now().getTime() - 60 * 1000).toISOString();
      const result = await deps.pool.query<CooldownRow>(
        `SELECT created_at
         FROM status_events
         WHERE user_id = $1 AND group_id = $2 AND created_at >= $3
         ORDER BY created_at DESC
         LIMIT 1`,
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
    windowState,
  }: {
    groupId: string;
    userId: string;
    currentEvent: StatusEventRow;
    idGenerator: () => string;
    windowState?: RollingWindowState;
  }
): Promise<RuckusSummaryPayload | null> {
  const rollingWindowState = windowState ?? await loadRollingWindowState(client, {
    groupId,
    currentEvent,
  });

  if (
    rollingWindowState.preCount >= RUCKUS_THRESHOLD ||
    rollingWindowState.postCount < RUCKUS_THRESHOLD
  ) {
    return null;
  }

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
      rollingWindowState.earliestEventAt,
      currentEvent.created_at,
      rollingWindowState.postCount,
    ]
  );

  return {
    record: insertResult.rows[0],
    uniformStatus: rollingWindowState.uniformStatus,
  };
}

export async function sendGroupRuckusSummaryPush(
  deps: Pick<AppDependencies, 'pool' | 'pushSender'>,
  summary: RuckusSummaryPayload
): Promise<void> {
  const groupMeta = await loadGroupMeta(deps.pool, summary.record.group_id);
  if (!groupMeta) return;

  const tokensResult = await deps.pool.query<PushRecipientRow>(
    `SELECT gm.user_id,
            gm.notifications_enabled,
            gm.notification_mode,
            gm.watch_threshold,
            gm.watch_until,
            u.push_token
     FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = $1
       AND gm.user_id != $2
       AND u.push_token IS NOT NULL`,
    [summary.record.group_id, summary.record.triggered_by]
  );

  const distinctMemberCount = Number(summary.record.distinct_member_count);
  const body = buildShareBody({
    distinctMemberCount,
    uniformStatus: summary.uniformStatus,
  });

  const messages: PushMessage[] = [];
  for (const row of tokensResult.rows) {
    const mode = parseNotificationMode(
      row.notifications_enabled,
      row.notification_mode,
      row.watch_until,
      new Date()
    );
    if (mode === 'muted' || mode === 'watch_threshold') {
      continue;
    }
    if (!isExpoPushToken(row.push_token)) continue;
    messages.push({
      to: row.push_token,
      sound: 'default',
      title: `${groupMeta.name} is in a Ruckus`,
      body,
      data: {
        groupId: summary.record.group_id,
        feedType: 'burst',
        feedId: summary.record.id,
      },
      channelId: 'group-ruckus',
    });
  }

  if (messages.length > 0) {
    await deps.pushSender.send(messages);
  }
}

async function sendWatchThresholdPush(
  deps: Pick<AppDependencies, 'pool' | 'pushSender'>,
  {
    groupId,
    triggeredBy,
    windowState,
  }: {
    groupId: string;
    triggeredBy: string;
    windowState: RollingWindowState;
  }
): Promise<void> {
  if (windowState.postCount < 2) {
    return;
  }

  const groupMeta = await loadGroupMeta(deps.pool, groupId);
  if (!groupMeta) {
    return;
  }

  const tokensResult = await deps.pool.query<PushRecipientRow>(
    `SELECT gm.user_id,
            gm.notifications_enabled,
            gm.notification_mode,
            gm.watch_threshold,
            gm.watch_until,
            u.push_token
     FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = $1
       AND gm.user_id != $2
       AND u.push_token IS NOT NULL`,
    [groupId, triggeredBy]
  );

  const messages: PushMessage[] = [];
  for (const row of tokensResult.rows) {
    const mode = parseNotificationMode(
      row.notifications_enabled,
      row.notification_mode,
      row.watch_until,
      new Date()
    );

    if (mode !== 'watch_threshold') {
      continue;
    }

    const threshold = row.watch_threshold ?? 2;
    if (!isWatchThresholdCrossing(windowState, threshold)) {
      continue;
    }
    if (!isExpoPushToken(row.push_token)) continue;

    messages.push({
      to: row.push_token,
      sound: 'default',
      title: `${groupMeta.name} is heating up`,
      body: `${windowState.postCount} roos are live in the last 5 minutes`,
      data: {
        groupId,
        feedType: threshold >= 3 ? 'burst' : 'watch',
      },
      channelId: threshold === 3 ? 'group-ruckus' : 'rucked',
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
    statusEventId,
  }: {
    userId: string;
    groupId: string;
    statusType: StatusType;
    statusEventId: string;
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

  const tokensResult = await deps.pool.query<PushRecipientRow>(
    `SELECT gm.user_id,
            gm.notifications_enabled,
            gm.notification_mode,
            gm.watch_threshold,
            gm.watch_until,
            u.push_token
     FROM group_members gm
     JOIN users u ON gm.user_id = u.id
     WHERE gm.group_id = $1
       AND gm.user_id != $2
       AND u.push_token IS NOT NULL`,
    [groupId, userId]
  );

  const messages: PushMessage[] = [];
  for (const row of tokensResult.rows) {
    const mode = parseNotificationMode(
      row.notifications_enabled,
      row.notification_mode,
      row.watch_until,
      new Date()
    );
    if (mode !== 'all_activity') {
      continue;
    }
    if (!isExpoPushToken(row.push_token)) continue;
    messages.push({
      to: row.push_token,
      sound: 'default',
      title: group_name,
      body: `${first_name} is ${statusType} up!`,
      data: {
        groupId,
        feedType: 'status',
        feedId: statusEventId,
      },
      channelId: statusType,
    });
  }

  if (messages.length > 0) {
    await deps.pushSender.send(messages);
  }
}
