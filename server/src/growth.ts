import type { StatusType } from './app-dependencies';

export const REACTION_EMOJIS = ['⚡', '🔥', '🍻', '🫡', '💀'] as const;
export const COVER_GRADIENTS = [
  'sunset',
  'midnight',
  'reef',
  'ember',
  'sapphire',
] as const;

export interface GroupIdentity {
  emoji?: string | null;
  cover_gradient?: string | null;
  tagline?: string | null;
  timezone?: string | null;
}

export interface GroupSettingsShape {
  identity?: GroupIdentity;
  streak_freezes_remaining?: number;
  last_streak_risk_week?: string | null;
}

export interface GroupStreakSummary {
  current: number;
  best: number;
  at_risk: boolean;
  used_freeze_this_week: boolean;
  freeze_count: number;
  last_burst_at: string | null;
}

interface TimeZoneParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function formatterForTimeZone(timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  });
}

export function normalizeTimeZone(timeZone: string | null | undefined) {
  if (!timeZone) return 'UTC';

  try {
    formatterForTimeZone(timeZone).format(new Date());
    return timeZone;
  } catch {
    return 'UTC';
  }
}

export function parseGroupSettings(raw: unknown): GroupSettingsShape {
  if (!raw || typeof raw !== 'object') {
    return {
      identity: {
        emoji: '⚡',
        cover_gradient: 'sunset',
        tagline: null,
        timezone: 'UTC',
      },
      streak_freezes_remaining: 0,
      last_streak_risk_week: null,
    };
  }

  const settings = raw as Record<string, unknown>;
  const identitySource = settings.identity as Record<string, unknown> | undefined;

  return {
    identity: {
      emoji: typeof identitySource?.emoji === 'string' ? identitySource.emoji : '⚡',
      cover_gradient: typeof identitySource?.cover_gradient === 'string'
        ? identitySource.cover_gradient
        : 'sunset',
      tagline: typeof identitySource?.tagline === 'string' ? identitySource.tagline : null,
      timezone: normalizeTimeZone(
        typeof identitySource?.timezone === 'string' ? identitySource.timezone : 'UTC'
      ),
    },
    streak_freezes_remaining: typeof settings.streak_freezes_remaining === 'number'
      ? settings.streak_freezes_remaining
      : 0,
    last_streak_risk_week: typeof settings.last_streak_risk_week === 'string'
      ? settings.last_streak_risk_week
      : null,
  };
}

export function buildGroupSettings(
  current: unknown,
  updates: Partial<GroupIdentity> & {
    streak_freezes_remaining?: number;
    last_streak_risk_week?: string | null;
  }
) {
  const parsed = parseGroupSettings(current);

  return {
    identity: {
      emoji: updates.emoji ?? parsed.identity?.emoji ?? '⚡',
      cover_gradient: updates.cover_gradient ?? parsed.identity?.cover_gradient ?? 'sunset',
      tagline: updates.tagline ?? parsed.identity?.tagline ?? null,
      timezone: normalizeTimeZone(updates.timezone ?? parsed.identity?.timezone ?? 'UTC'),
    },
    streak_freezes_remaining: updates.streak_freezes_remaining ?? parsed.streak_freezes_remaining ?? 0,
    last_streak_risk_week: updates.last_streak_risk_week ?? parsed.last_streak_risk_week ?? null,
  };
}

export function buildInviteUrl(baseUrl: string, token: string) {
  return `${baseUrl.replace(/\/$/, '')}/j/${token}`;
}

export function buildBurstShareText(
  {
    groupName,
    memberCount,
    body,
    url,
  }: {
    groupName: string;
    memberCount: number;
    body: string;
    url: string;
  }
) {
  return `${groupName} just hit a ruckus. ${memberCount} roos lit up. ${body}\n${url}`;
}

export function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function pickDefaultIdentity(groupName: string, timeZone: string) {
  return {
    emoji: '⚡',
    cover_gradient: COVER_GRADIENTS[hashString(groupName) % COVER_GRADIENTS.length],
    tagline: null,
    timezone: normalizeTimeZone(timeZone),
  };
}

export function getTimeZoneParts(date: Date, timeZone: string): TimeZoneParts {
  const parts = formatterForTimeZone(normalizeTimeZone(timeZone)).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    weekday: WEEKDAY_TO_INDEX[values.weekday] ?? 0,
  };
}

export function dateKeyFromParts(parts: Pick<TimeZoneParts, 'year' | 'month' | 'day'>) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function localDateKey(date: Date | string, timeZone: string) {
  const parts = getTimeZoneParts(new Date(date), timeZone);
  return dateKeyFromParts(parts);
}

function addDaysToDateKey(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function weekStartKey(date: Date | string, timeZone: string) {
  const parts = getTimeZoneParts(new Date(date), timeZone);
  const localKey = dateKeyFromParts(parts);
  const offsetFromMonday = (parts.weekday + 6) % 7;
  return addDaysToDateKey(localKey, -offsetFromMonday);
}

export function weekEndKey(weekStart: string) {
  return addDaysToDateKey(weekStart, 6);
}

export function isSundayEvening(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  return parts.weekday === 0 && parts.hour >= 18;
}

export function buildGroupStreakSummary(
  {
    burstCreatedAts,
    timeZone,
    now,
    freezeCount,
  }: {
    burstCreatedAts: string[];
    timeZone: string;
    now: Date;
    freezeCount: number;
  }
): GroupStreakSummary {
  if (burstCreatedAts.length === 0) {
    return {
      current: 0,
      best: 0,
      at_risk: false,
      used_freeze_this_week: false,
      freeze_count: freezeCount,
      last_burst_at: null,
    };
  }

  const weeks = [...new Set(burstCreatedAts.map((createdAt) => weekStartKey(createdAt, timeZone)))].sort();
  let best = 1;
  let running = 1;

  for (let index = 1; index < weeks.length; index += 1) {
    if (addDaysToDateKey(weeks[index - 1], 7) === weeks[index]) {
      running += 1;
      best = Math.max(best, running);
    } else {
      running = 1;
    }
  }

  const currentWeek = weekStartKey(now, timeZone);
  let cursor = currentWeek;
  let current = 0;

  const weekSet = new Set(weeks);
  while (weekSet.has(cursor)) {
    current += 1;
    cursor = addDaysToDateKey(cursor, -7);
  }

  const hasCurrentWeekBurst = weekSet.has(currentWeek);
  const atRisk = !hasCurrentWeekBurst && isSundayEvening(now, timeZone);
  const usedFreezeThisWeek = atRisk && freezeCount > 0;

  return {
    current,
    best,
    at_risk: atRisk,
    used_freeze_this_week: usedFreezeThisWeek,
    freeze_count: freezeCount,
    last_burst_at: burstCreatedAts[burstCreatedAts.length - 1] ?? null,
  };
}

export function zonedTimeToUtc(
  {
    year,
    month,
    day,
    hour,
    minute,
    second = 0,
  }: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second?: number;
  },
  timeZone: string
) {
  let utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getTimeZoneParts(new Date(utcGuess), timeZone);
    const actual = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const target = Date.UTC(year, month - 1, day, hour, minute, second);
    const diff = target - actual;

    if (diff === 0) {
      break;
    }

    utcGuess += diff;
  }

  return new Date(utcGuess);
}

export function nextFourAm(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  const isPastFour = parts.hour >= 4;
  const dateKey = addDaysToDateKey(dateKeyFromParts(parts), isPastFour ? 1 : 0);
  const [year, month, day] = dateKey.split('-').map(Number);
  return zonedTimeToUtc({ year, month, day, hour: 4, minute: 0, second: 0 }, timeZone);
}

export function nextOccurrenceForRitual(
  {
    dayOfWeek,
    timeOfDay,
  }: {
    dayOfWeek: number;
    timeOfDay: string;
  },
  timeZone: string,
  now: Date
) {
  const nowParts = getTimeZoneParts(now, timeZone);
  const [hourText, minuteText] = timeOfDay.split(':');
  const ritualHour = Number(hourText);
  const ritualMinute = Number(minuteText);

  let offset = (dayOfWeek - nowParts.weekday + 7) % 7;
  const sameDayButPassed = offset === 0 && (
    ritualHour < nowParts.hour ||
    (ritualHour === nowParts.hour && ritualMinute <= nowParts.minute)
  );

  if (sameDayButPassed) {
    offset = 7;
  }

  const dateKey = addDaysToDateKey(dateKeyFromParts(nowParts), offset);
  const [year, month, day] = dateKey.split('-').map(Number);
  const scheduledFor = zonedTimeToUtc(
    { year, month, day, hour: ritualHour, minute: ritualMinute, second: 0 },
    timeZone
  );
  const expiresAt = new Date(scheduledFor.getTime() + (4 * 60 * 60 * 1000));

  return { scheduledFor, expiresAt };
}

export function reactionWinner(reactions: Array<{ emoji: string; count: number }>) {
  if (reactions.length === 0) return null;

  const sorted = [...reactions].sort((left, right) => (
    right.count - left.count || left.emoji.localeCompare(right.emoji)
  ));

  return sorted[0]?.emoji ?? null;
}

export function ritualPromptText(label: string, promptTemplate: string) {
  return `${label}: ${promptTemplate}`;
}

export function recapTitle(groupName: string, closerFirstName: string | null) {
  if (closerFirstName) {
    return `${groupName} erupted. ${closerFirstName} closed it out.`;
  }

  return `${groupName} erupted.`;
}

export function statusCopy(statusType: StatusType) {
  return `${statusType} up`;
}
