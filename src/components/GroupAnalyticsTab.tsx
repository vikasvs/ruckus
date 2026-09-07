import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { getGroupAnalytics } from '@/services/status';
import { colors, getStatusBg, getStatusText, radii, spacing, typography } from '@/theme';
import { AnalyticsWindow, GroupAnalytics, GroupAnalyticsMember, TabParamList } from '@/types';

type AnalyticsTabRouteProp = RouteProp<TabParamList, 'Analytics'>;
const WINDOWS: AnalyticsWindow[] = ['week', 'season', 'all'];

function formatCompactNumber(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }

  return `${value}`;
}

function formatFavoriteStatus(status: GroupAnalyticsMember['favoriteStatus']) {
  if (status === 'balanced') return 'Balanced energy';
  if (status === 'rucked') return 'Rucked specialist';
  if (status === 'ricked') return 'Ricked specialist';
  return 'No signature mode yet';
}

function formatDayLabel(dateString: string) {
  return new Date(`${dateString}T12:00:00.000Z`)
    .toLocaleDateString([], { weekday: 'short' })
    .slice(0, 3)
    .toUpperCase();
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statHelper}>{helper}</Text>
    </View>
  );
}

function LeaderboardRow({
  member,
  isCurrentUser,
}: {
  member: GroupAnalyticsMember;
  isCurrentUser: boolean;
}) {
  const statusTone = member.favoriteStatus === 'balanced' ? null : member.favoriteStatus;
  const favoriteStatusColor = member.favoriteStatus === 'balanced'
    ? colors.textPrimary
    : getStatusText(statusTone);
  const favoriteStatusBg = member.favoriteStatus === 'balanced'
    ? colors.surfaceActive
    : getStatusBg(statusTone);

  return (
    <View style={[styles.rowCard, isCurrentUser && styles.currentUserRow]}>
      <View style={styles.rowRank}>
        <Text style={styles.rowRankText}>#{member.rank}</Text>
      </View>
      <View style={styles.rowMain}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowName}>
            {member.firstName}
            {isCurrentUser ? ' (You)' : ''}
          </Text>
          <Text style={styles.rowScore}>{member.score} pts</Text>
        </View>

        <View style={styles.rowMeta}>
          <Text style={styles.rowMetaText}>{member.totalEvents} hits</Text>
          <Text style={styles.rowMetaDot}>•</Text>
          <Text style={styles.rowMetaText}>{member.ruckusCloses} closes</Text>
          <Text style={styles.rowMetaDot}>•</Text>
          <Text style={styles.rowMetaText}>{member.longestStreakDays}d best streak</Text>
        </View>

        <View style={styles.rowFooter}>
          <View style={[styles.modeChip, { backgroundColor: favoriteStatusBg }]}>
            <Text style={[styles.modeChipText, { color: favoriteStatusColor }]}>
              {formatFavoriteStatus(member.favoriteStatus)}
            </Text>
          </View>
          <View style={styles.rowBadges}>
            {member.badges.slice(0, 2).map((badge) => (
              <Badge key={`${member.userId}-${badge}`} label={badge} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function GroupAnalyticsTab() {
  const route = useRoute<AnalyticsTabRouteProp>();
  const { groupId } = route.params;
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState<GroupAnalytics | null>(null);
  const [window, setWindow] = useState<AnalyticsWindow>('week');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const loadAnalytics = useCallback(async (
    mode: 'initial' | 'refresh' | 'silent' = 'initial',
    nextWindow: AnalyticsWindow = window
  ) => {
    if (!user?.id) return;

    if (mode === 'refresh') {
      setRefreshing(true);
    } else if (mode === 'initial' && !hasLoadedRef.current) {
      setIsLoading(true);
    }

    try {
      const result = await getGroupAnalytics(groupId, user.id, nextWindow);
      setAnalytics(result);
      hasLoadedRef.current = true;
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [groupId, user?.id, window]);

  useFocusEffect(
    useCallback(() => {
      void loadAnalytics('initial', window);

      const interval = setInterval(() => {
        void loadAnalytics('silent', window);
      }, 20000);

      return () => {
        clearInterval(interval);
      };
    }, [loadAnalytics, window])
  );

  const maxDailyEvents = useMemo(() => {
    const counts = analytics?.dailyActivity.map((day) => day.eventCount) ?? [];
    return Math.max(1, ...counts);
  }, [analytics?.dailyActivity]);

  if (isLoading && !analytics) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.accentActive} />
        <Text style={styles.loadingText}>Crunching the chaos...</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAnalytics('refresh', window)}
            tintColor={colors.accentActive}
            colors={[colors.accentActive]}
          />
        }
      >
        <Text style={styles.emptyTitle}>No analytics yet</Text>
        <Text style={styles.emptyBody}>
          {error || 'Once the crew starts posting, the scoreboard lights up here.'}
        </Text>
      </ScrollView>
    );
  }

  const me = analytics.me;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadAnalytics('refresh', window)}
          tintColor={colors.accentActive}
          colors={[colors.accentActive]}
        />
      }
    >
      <View style={styles.windowRow}>
        {WINDOWS.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.windowButton, window === option && styles.windowButtonActive]}
            onPress={() => {
              setWindow(option);
              void loadAnalytics('refresh', option);
            }}
          >
            <Text
              style={[
                styles.windowButtonText,
                window === option && styles.windowButtonTextActive,
              ]}
            >
              {option === 'week' ? 'This Week' : option === 'season' ? 'This Season' : 'All Time'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.sectionKicker}>YOUR CHAOS SCORE</Text>
        <Text style={styles.heroValue}>{me ? formatCompactNumber(me.score) : '0'}</Text>
        <Text style={styles.heroSubhead}>
          {me
            ? `#${me.rank} out of ${analytics.leaderboard.length} roos`
            : 'No personal score yet'}
        </Text>
        <Text style={styles.heroBody}>
          {me
            ? `${me.totalEvents} hits, ${me.ruckusCloses} closes, ${analytics.group.currentStreakWeeks}w crew streak, ${analytics.group.freezeCount} freeze banked.`
            : 'Be the first one to light up the board.'}
        </Text>
        <View style={styles.badgeRow}>
          {(me?.badges.length ? me.badges : ['Fresh Meat']).map((badge) => (
            <Badge key={badge} label={badge} />
          ))}
        </View>
      </View>

      <View style={styles.statGrid}>
        <StatCard
          label="GROUP RUCKUS"
          value={`${analytics.group.totalRuckusBursts}`}
          helper="bursts tipped over the line"
        />
        <StatCard
          label="BLAST RADIUS"
          value={analytics.group.averageBurstSize ? `${analytics.group.averageBurstSize} roos` : '--'}
          helper="average burst size"
        />
        <StatCard
          label="CREW STREAK"
          value={`${analytics.group.currentStreakWeeks}w`}
          helper={analytics.group.streakAtRisk ? 'at risk right now' : 'current live streak'}
        />
        <StatCard
          label="BEST STREAK"
          value={`${analytics.group.bestStreakWeeks}w`}
          helper={`${analytics.group.freezeCount} freeze banked`}
        />
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Weekly Heat</Text>
          <Text style={styles.panelCaption}>
            {analytics.group.totalEvents} total hits across {analytics.group.activeDays} active days
          </Text>
        </View>

        <View style={styles.heatChart}>
          {analytics.dailyActivity.map((day) => {
            const height = day.eventCount === 0
              ? 8
              : Math.max(14, Math.round((day.eventCount / maxDailyEvents) * 84));

            return (
              <View key={day.date} style={styles.heatColumn}>
                <Text style={styles.heatCount}>{day.eventCount}</Text>
                <View style={styles.heatBarTrack}>
                  <View style={[styles.heatBarFill, { height }]} />
                </View>
                <View style={styles.burstMarkerRow}>
                  {day.burstCount > 0 ? (
                    <View style={styles.burstMarker}>
                      <Text style={styles.burstMarkerText}>{day.burstCount}R</Text>
                    </View>
                  ) : (
                    <View style={styles.burstMarkerSpacer} />
                  )}
                </View>
                <Text style={styles.heatLabel}>{formatDayLabel(day.date)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Ruckus Rankings</Text>
          <Text style={styles.panelCaption}>
            Score rewards volume, streaks, and closing out a squad ruckus.
          </Text>
        </View>

        {analytics.leaderboard.map((member) => (
          <LeaderboardRow
            key={member.userId}
            member={member}
            isCurrentUser={member.userId === user?.id}
          />
        ))}
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Afterglow Archive</Text>
          <Text style={styles.panelCaption}>Bragging rights you can revisit later.</Text>
        </View>
        {analytics.recaps.length === 0 ? (
          <Text style={styles.emptyBody}>No recaps yet. Trigger a burst and the archive starts building itself.</Text>
        ) : (
          analytics.recaps.map((recap) => (
            <View key={recap.id} style={styles.recapCard}>
              <Text style={styles.recapTitle}>{recap.title}</Text>
              <Text style={styles.recapMeta}>
                {new Date(recap.created_at).toLocaleDateString()} · {recap.photo_count} photos
              </Text>
              {recap.caption ? <Text style={styles.recapCaption}>{recap.caption}</Text> : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  content: {
    padding: spacing.pagePadding,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.pageBg,
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.textMuted,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.pagePadding,
  },
  emptyTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  windowRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  windowButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  windowButtonActive: {
    backgroundColor: colors.accentActive,
    borderColor: colors.accentActive,
  },
  windowButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  windowButtonTextActive: {
    color: colors.textInverse,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.md,
  },
  sectionKicker: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  heroValue: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  heroSubhead: {
    ...typography.subheading,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  heroBody: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  badge: {
    backgroundColor: colors.surfaceHover,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  statLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.subheading,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statHelper: {
    ...typography.caption,
    color: colors.textMuted,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.md,
  },
  panelHeader: {
    marginBottom: spacing.md,
  },
  panelTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  panelCaption: {
    ...typography.caption,
    color: colors.textMuted,
  },
  heatChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  heatColumn: {
    flex: 1,
    alignItems: 'center',
  },
  heatCount: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  heatBarTrack: {
    height: 90,
    justifyContent: 'flex-end',
    width: '100%',
  },
  heatBarFill: {
    borderRadius: radii.md,
    backgroundColor: colors.accentActive,
    width: '100%',
  },
  burstMarkerRow: {
    minHeight: 24,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  burstMarker: {
    backgroundColor: colors.surfaceHover,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  burstMarkerText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  burstMarkerSpacer: {
    height: 18,
  },
  heatLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  rowCard: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  currentUserRow: {
    backgroundColor: colors.surfaceHover,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  rowRank: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowRankText: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  rowMain: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  rowName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  rowScore: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  rowMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  rowMetaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rowMetaDot: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  modeChipText: {
    ...typography.label,
  },
  rowBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  recapCard: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  recapTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  recapMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  recapCaption: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
