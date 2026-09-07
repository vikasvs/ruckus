import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationProp, RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { getGroupAnalytics } from '@/services/status';
import { colors, typography } from '@/theme';
import { AnalyticsWindow, GroupAnalytics, TabParamList } from '@/types';

const WINDOWS: { value: AnalyticsWindow; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'season', label: '12 weeks' },
  { value: 'all', label: 'All time' },
];

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return <View style={styles.stat}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, tone ? { color: tone } : undefined]}>{value.toLocaleString()}</Text>
  </View>;
}

export function AnalyticsContent({ analytics, onViewFeed }: { analytics: GroupAnalytics; onViewFeed: () => void }) {
  // The API's daily series always covers seven days, independently of the summary filter.
  const days = [...analytics.dailyActivity].sort((a, b) => b.date.localeCompare(a.date));
  return <>
    <View style={styles.statGrid}>
      <Stat label="Posts" value={analytics.group.totalEvents} />
      <Stat label="Ruckuses started" value={analytics.group.totalRuckusBursts} />
      <Stat label="Rucked up" value={analytics.group.totalRucked} tone={colors.ruckedText} />
      <Stat label="Ricked up" value={analytics.group.totalRicked} tone={colors.rickedText} />
    </View>
    {analytics.group.totalEvents === 0 && <Text style={styles.caption}>No posts in this period yet.</Text>}
    <View style={styles.history}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Activity history</Text>
        <Text style={styles.caption}>Last 7 days</Text>
      </View>
      {days.map((day) => <View style={styles.day} key={day.date}>
        <Text style={styles.dayDate}>{new Date(`${day.date}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
        <View style={styles.dayCounts}>
          <Text style={styles.dayPosts}>{day.eventCount} {day.eventCount === 1 ? 'post' : 'posts'}</Text>
          {day.burstCount > 0 && <Text style={styles.caption}>{day.burstCount} {day.burstCount === 1 ? 'ruckus' : 'ruckuses'}</Text>}
        </View>
      </View>)}
      <TouchableOpacity style={styles.feedLink} accessibilityRole="button" onPress={onViewFeed}>
        <Text style={styles.feedLinkText}>View posts in feed</Text>
        <Text style={styles.feedLinkText} accessibilityElementsHidden>→</Text>
      </TouchableOpacity>
    </View>
  </>;
}

export default function GroupAnalyticsTab() {
  const { params: { groupId } } = useRoute<RouteProp<TabParamList, 'Analytics'>>();
  const navigation = useNavigation<NavigationProp<TabParamList>>();
  const { user } = useAuthStore();
  const [analytics, setAnalytics] = useState<GroupAnalytics | null>(null);
  const [window, setWindow] = useState<AnalyticsWindow>('week');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadAnalytics = useCallback(async (refresh = false) => {
    if (!user?.id) return;
    const id = ++requestId.current;
    if (refresh) setRefreshing(true);
    try {
      const result = await getGroupAnalytics(groupId, user.id, window);
      if (id !== requestId.current) return;
      setAnalytics(result);
      setError(null);
    } catch (err: any) {
      if (id === requestId.current) setError(err.message || 'Could not load activity.');
    } finally {
      if (id === requestId.current) setRefreshing(false);
    }
  }, [groupId, user?.id, window]);

  useFocusEffect(useCallback(() => {
    void loadAnalytics();
    const interval = setInterval(() => void loadAnalytics(), 20000);
    return () => { clearInterval(interval); ++requestId.current; };
  }, [loadAnalytics]));

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadAnalytics(true)} tintColor={colors.accentActive} />}>
    <Text style={styles.title}>Crew activity</Text>
    <View style={styles.windowRow}>
      {WINDOWS.map((option) => <TouchableOpacity key={option.value}
        style={[styles.windowButton, window === option.value && styles.windowActive]}
        accessibilityRole="button" accessibilityState={{ selected: window === option.value }}
        onPress={() => {
          if (window === option.value) return;
          ++requestId.current;
          setAnalytics(null); setError(null); setRefreshing(false); setWindow(option.value);
        }}>
        <Text style={[styles.windowText, window === option.value && styles.windowTextActive]}>{option.label}</Text>
      </TouchableOpacity>)}
    </View>
    {!!error && <View style={styles.error}>
      <Text style={styles.caption} accessibilityRole="alert">{error}</Text>
      <TouchableOpacity style={styles.retry} accessibilityRole="button" onPress={() => void loadAnalytics(true)}><Text style={styles.feedLinkText}>Try again</Text></TouchableOpacity>
    </View>}
    {analytics ? <AnalyticsContent analytics={analytics} onViewFeed={() => navigation.navigate('Activity', { groupId })} />
      : !error && <ActivityIndicator style={styles.loading} size="large" color={colors.accentActive} accessibilityLabel="Loading activity" />}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBg },
  content: { padding: 24, gap: 24, paddingBottom: 32 },
  title: { ...typography.heading, color: colors.textPrimary },
  windowRow: { flexDirection: 'row', gap: 6 },
  windowButton: { flex: 1, minHeight: 44, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  windowActive: { backgroundColor: colors.charcoalBg },
  windowText: { ...typography.caption, fontSize: 13, color: colors.textPrimary, textAlign: 'center' },
  windowTextActive: { color: colors.textInverse, fontWeight: '600' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { flexGrow: 1, flexBasis: '44%', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.borderDefault, gap: 12 },
  statLabel: { ...typography.caption, fontSize: 13, color: colors.textMuted },
  statValue: { ...typography.heading, fontSize: 34, lineHeight: 40, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  history: { gap: 0 },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { ...typography.body, fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  caption: { ...typography.caption, fontSize: 12, color: colors.textMuted },
  day: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  dayDate: { ...typography.body, fontSize: 14, color: colors.textPrimary },
  dayCounts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flex: 1 },
  dayPosts: { ...typography.body, fontSize: 14, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  feedLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  feedLinkText: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  error: { gap: 8 },
  retry: { minHeight: 44, justifyContent: 'center' },
  loading: { marginTop: 48 },
});
