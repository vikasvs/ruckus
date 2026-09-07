import type { StatusType } from './app-dependencies';
import {
  buildGroupStreakSummary,
  localDateKey,
  reactionWinner,
} from './growth';

export interface AnalyticsMemberSource {
  user_id: string;
  first_name: string;
}

export interface AnalyticsEventSource {
  user_id: string;
  status_type: StatusType;
  created_at: string;
}

export interface AnalyticsBurstSource {
  triggered_by: string;
  window_started_at: string;
  window_ended_at: string;
  distinct_member_count: number;
  created_at: string;
}

export interface AnalyticsRecapSource {
  id: string;
  title: string;
  created_at: string;
  photo_count: number;
  caption: string | null;
}

export interface GroupAnalyticsMember {
  userId: string;
  firstName: string;
  totalEvents: number;
  ruckedCount: number;
  rickedCount: number;
  activeDays: number;
  currentStreakDays: number;
  longestStreakDays: number;
  ruckusCloses: number;
  score: number;
  rank: number;
  favoriteStatus: StatusType | 'balanced' | null;
  badges: string[];
}

export interface GroupAnalyticsPayload {
  window: 'week' | 'season' | 'all';
  group: {
    totalEvents: number;
    totalRucked: number;
    totalRicked: number;
    totalRuckusBursts: number;
    activeDays: number;
    sevenDayEventCount: number;
    averageBurstSize: number | null;
    fastestIgnitionMinutes: number | null;
    currentStreakWeeks: number;
    bestStreakWeeks: number;
    streakAtRisk: boolean;
    freezeCount: number;
  };
  me: GroupAnalyticsMember | null;
  leaderboard: GroupAnalyticsMember[];
  dailyActivity: Array<{
    date: string;
    eventCount: number;
    burstCount: number;
  }>;
  recaps: AnalyticsRecapSource[];
}

function addUtcDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function diffInDays(startDay: string, endDay: string) {
  const start = new Date(`${startDay}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDay}T00:00:00.000Z`).getTime();
  return Math.round((end - start) / 86400000);
}

function roundMetric(value: number) {
  return Math.round(value * 10) / 10;
}

function calculateStreaks(dayKeys: string[], today: string) {
  if (dayKeys.length === 0) {
    return { currentStreakDays: 0, longestStreakDays: 0 };
  }

  const sorted = [...new Set(dayKeys)].sort();
  let longestStreakDays = 1;
  let runningStreak = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    if (diffInDays(sorted[index - 1], sorted[index]) === 1) {
      runningStreak += 1;
      longestStreakDays = Math.max(longestStreakDays, runningStreak);
    } else {
      runningStreak = 1;
    }
  }

  const daySet = new Set(sorted);
  let currentStreakDays = 0;
  let cursor = today;

  while (daySet.has(cursor)) {
    currentStreakDays += 1;
    cursor = addUtcDays(cursor, -1);
  }

  return { currentStreakDays, longestStreakDays };
}

function buildBadges(
  member: GroupAnalyticsMember,
  {
    maxCloses,
    maxLongestStreak,
  }: {
    maxCloses: number;
    maxLongestStreak: number;
  }
) {
  const badges: string[] = [];

  if (member.rank === 1 && member.totalEvents > 0) {
    badges.push('Chaos Captain');
  }

  if (member.ruckusCloses > 0 && member.ruckusCloses === maxCloses) {
    badges.push('Closer');
  }

  if (member.longestStreakDays > 1 && member.longestStreakDays === maxLongestStreak) {
    badges.push('Streak Beast');
  }

  if (member.favoriteStatus === 'balanced' && member.totalEvents >= 4) {
    badges.push('Dual Threat');
  }

  if (badges.length === 0 && member.totalEvents > 0) {
    if (member.rickedCount > member.ruckedCount) {
      badges.push('Blue Flame');
    } else if (member.ruckedCount > member.rickedCount) {
      badges.push('Afterburner');
    } else {
      badges.push('Live Wire');
    }
  }

  return badges.slice(0, 3);
}

function isInWindow(
  createdAt: string,
  {
    window,
    now,
    timeZone,
  }: {
    window: 'week' | 'season' | 'all';
    now: Date;
    timeZone: string;
  }
) {
  if (window === 'all') return true;

  const itemDate = localDateKey(createdAt, timeZone);
  const today = localDateKey(now, timeZone);

  if (window === 'week') {
    const weekStart = addUtcDays(today, -((new Date(`${today}T00:00:00.000Z`).getUTCDay() + 6) % 7));
    return itemDate >= weekStart;
  }

  const seasonStart = addUtcDays(today, -83);
  return itemDate >= seasonStart;
}

export function buildGroupAnalytics(
  {
    members,
    events,
    bursts,
    recaps,
    currentUserId,
    timeZone,
    freezeCount,
    window,
  }: {
    members: AnalyticsMemberSource[];
    events: AnalyticsEventSource[];
    bursts: AnalyticsBurstSource[];
    recaps: AnalyticsRecapSource[];
    currentUserId: string;
    timeZone: string;
    freezeCount: number;
    window: 'week' | 'season' | 'all';
  },
  now: Date
): GroupAnalyticsPayload {
  const today = localDateKey(now, timeZone);
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => addUtcDays(today, index - 6));
  const dailyLookup = new Map(
    lastSevenDays.map((day) => [day, { date: day, eventCount: 0, burstCount: 0 }])
  );
  const streak = buildGroupStreakSummary({
    burstCreatedAts: bursts.map((burst) => burst.created_at),
    timeZone,
    now,
    freezeCount,
  });

  const filteredEvents = events.filter((event) => isInWindow(event.created_at, { window, now, timeZone }));
  const filteredBursts = bursts.filter((burst) => isInWindow(burst.created_at, { window, now, timeZone }));
  const filteredRecaps = recaps
    .filter((recap) => isInWindow(recap.created_at, { window, now, timeZone }))
    .sort((left, right) => (
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    ))
    .slice(0, 8);

  const totalRucked = filteredEvents.filter((event) => event.status_type === 'rucked').length;
  const totalRicked = filteredEvents.length - totalRucked;
  const groupDaySet = new Set<string>();
  const closesByUser = new Map<string, number>();

  for (const event of events) {
    const day = localDateKey(event.created_at, timeZone);
    const dailyPoint = dailyLookup.get(day);
    if (dailyPoint) {
      dailyPoint.eventCount += 1;
    }
  }

  for (const burst of bursts) {
    const day = localDateKey(burst.created_at, timeZone);
    const dailyPoint = dailyLookup.get(day);
    if (dailyPoint) {
      dailyPoint.burstCount += 1;
    }
  }

  for (const event of filteredEvents) {
    groupDaySet.add(localDateKey(event.created_at, timeZone));
  }

  for (const burst of filteredBursts) {
    closesByUser.set(burst.triggered_by, (closesByUser.get(burst.triggered_by) ?? 0) + 1);
  }

  const memberAnalytics = members.map<GroupAnalyticsMember>((member) => {
    const memberEvents = filteredEvents.filter((event) => event.user_id === member.user_id);
    const dayKeys = memberEvents.map((event) => localDateKey(event.created_at, timeZone));
    const ruckedCount = memberEvents.filter((event) => event.status_type === 'rucked').length;
    const rickedCount = memberEvents.length - ruckedCount;
    const { currentStreakDays, longestStreakDays } = calculateStreaks(dayKeys, today);
    const ruckusCloses = closesByUser.get(member.user_id) ?? 0;

    let favoriteStatus: GroupAnalyticsMember['favoriteStatus'] = null;
    if (memberEvents.length > 0) {
      if (ruckedCount === rickedCount) {
        favoriteStatus = 'balanced';
      } else {
        favoriteStatus = ruckedCount > rickedCount ? 'rucked' : 'ricked';
      }
    }

    const activeDays = new Set(dayKeys).size;
    const score = (
      memberEvents.length * 10
      + activeDays * 7
      + currentStreakDays * 18
      + longestStreakDays * 12
      + ruckusCloses * 30
    );

    return {
      userId: member.user_id,
      firstName: member.first_name,
      totalEvents: memberEvents.length,
      ruckedCount,
      rickedCount,
      activeDays,
      currentStreakDays,
      longestStreakDays,
      ruckusCloses,
      score,
      rank: 0,
      favoriteStatus,
      badges: [],
    };
  });

  memberAnalytics.sort((left, right) => (
    right.score - left.score
    || right.ruckusCloses - left.ruckusCloses
    || right.totalEvents - left.totalEvents
    || left.firstName.localeCompare(right.firstName)
  ));

  const maxCloses = Math.max(0, ...memberAnalytics.map((member) => member.ruckusCloses));
  const maxLongestStreak = Math.max(0, ...memberAnalytics.map((member) => member.longestStreakDays));

  const leaderboard = memberAnalytics.map((member, index) => ({
    ...member,
    rank: index + 1,
    badges: buildBadges(
      { ...member, rank: index + 1 },
      { maxCloses, maxLongestStreak }
    ),
  }));

  const ignitionTimes = filteredBursts.map((burst) => (
    (new Date(burst.window_ended_at).getTime() - new Date(burst.window_started_at).getTime()) / 60000
  ));
  const averageBurstSize = filteredBursts.length > 0
    ? roundMetric(
      filteredBursts.reduce((sum, burst) => sum + Number(burst.distinct_member_count), 0) / filteredBursts.length
    )
    : null;
  const fastestIgnitionMinutes = ignitionTimes.length > 0
    ? roundMetric(Math.min(...ignitionTimes))
    : null;

  return {
    window,
    group: {
      totalEvents: filteredEvents.length,
      totalRucked,
      totalRicked,
      totalRuckusBursts: filteredBursts.length,
      activeDays: groupDaySet.size,
      sevenDayEventCount: lastSevenDays.reduce(
        (sum, day) => sum + (dailyLookup.get(day)?.eventCount ?? 0),
        0
      ),
      averageBurstSize,
      fastestIgnitionMinutes,
      currentStreakWeeks: streak.current,
      bestStreakWeeks: streak.best,
      streakAtRisk: streak.at_risk,
      freezeCount: streak.freeze_count,
    },
    me: leaderboard.find((member) => member.userId === currentUserId) ?? null,
    leaderboard,
    dailyActivity: lastSevenDays.map((day) => dailyLookup.get(day) ?? {
      date: day,
      eventCount: 0,
      burstCount: 0,
    }),
    recaps: filteredRecaps,
  };
}

export function topReactionFromCounts(reactions: Array<{ emoji: string; count: number }>) {
  return reactionWinner(reactions);
}
