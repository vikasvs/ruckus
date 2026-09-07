import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList, TabParamList } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useGroupsStore } from '@/store/groupsStore';
import { useStatusStore } from '@/store/statusStore';
import StatusButton from '@/components/StatusButton';
import ActivityFeedItem from '@/components/ActivityFeedItem';
import { usePinnedRuckus } from '@/components/usePinnedRuckus';
import { orderRuckusFeed } from '@/utils/ruckusFeed';
import GroupAnalyticsTab from '@/components/GroupAnalyticsTab';
import GroupMembersTab from '@/components/GroupMembersTab';
import { colors, typography } from '@/theme';
import { formatCooldown } from '@/utils';

const Tab = createBottomTabNavigator<TabParamList>();

function ActivityTab() {
  const { params: { groupId } } = useRoute<RouteProp<TabParamList, 'Activity'>>();
  const { user } = useAuthStore();
  const { currentGroupMembers, fetchMembers } = useGroupsStore();
  const { currentStatus, cooldownRemaining, recentActivity, updateStatus, checkCooldown, fetchRecentActivity, setCurrentStatus } = useStatusStore();
  const { pinned, opacity } = usePinnedRuckus(recentActivity);
  const [refreshing, setRefreshing] = useState(false);
  const [limit, setLimit] = useState(24);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const member = currentGroupMembers.find((entry) => entry.user_id === user?.id);
    if (member) setCurrentStatus(member.current_status ?? null);
  }, [currentGroupMembers, user?.id, setCurrentStatus]);

  useEffect(() => {
    if (!user) return;
    const refresh = async () => {
      try {
        await Promise.all([fetchRecentActivity(groupId, user.id, limit), fetchMembers(groupId), checkCooldown(user.id, groupId)]);
        setError('');
      } catch (err: any) { setError(err.message || 'Could not refresh the feed.'); }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 12000);
    return () => clearInterval(interval);
  }, [groupId, user?.id, limit, fetchRecentActivity, fetchMembers, checkCooldown]);

  const handleStatus = async (type: 'rucked' | 'ricked') => {
    if (!user) return;
    if (cooldownRemaining > 0) {
      Alert.alert('Give it a sec', `Wait ${formatCooldown(cooldownRemaining)} before posting again.`);
      return;
    }
    try {
      await updateStatus(user.id, groupId, type);
      await Promise.all([fetchRecentActivity(groupId, user.id, limit), fetchMembers(groupId)]);
      setHasMore(true);
    } catch (err: any) { Alert.alert('Could not post', err.message || 'Please try again.'); }
  };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.feedContent}
      data={orderRuckusFeed(recentActivity, pinned)}
      stickyHeaderIndices={pinned ? [1] : []}
      removeClippedSubviews={false}
      keyExtractor={(item) => `${item.type}-${item.id}`}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.accentActive} onRefresh={async () => {
        if (!user) return;
        setRefreshing(true);
        try { await Promise.all([fetchRecentActivity(groupId, user.id, limit), fetchMembers(groupId)]); setError(''); }
        catch (err: any) { setError(err.message); }
        finally { setRefreshing(false); }
      }} />}
      ListHeaderComponent={
        <View>
          <View style={styles.statusSection}><Text style={styles.statusLabel}>CURRENT STATUS</Text><Text style={styles.statusText}>{currentStatus ? `You're ${currentStatus} up` : 'No active status'}</Text></View>
          <View style={styles.buttonSection}>
            <StatusButton type="rucked" isActive={currentStatus === 'rucked'} isDisabled={cooldownRemaining > 0} cooldownSeconds={cooldownRemaining} onPress={() => void handleStatus('rucked')} />
            <StatusButton type="ricked" isActive={currentStatus === 'ricked'} isDisabled={cooldownRemaining > 0} cooldownSeconds={cooldownRemaining} onPress={() => void handleStatus('ricked')} />
          </View>
          {cooldownRemaining > 0 && <Text style={styles.cooldown}>Post again in {formatCooldown(cooldownRemaining)}</Text>}
          <View style={styles.feedHeading}><Text style={styles.feedTitle}>FEED</Text><Text style={styles.date}>Today · {new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text></View>
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        </View>
      }
      renderItem={({ item }) => item.type === 'burst' && item.id === pinned?.id ? (
        <Animated.View style={[styles.pinned, { opacity }]}><ActivityFeedItem item={item} pinned /></Animated.View>
      ) : <ActivityFeedItem item={item} />}
      ListEmptyComponent={<Text style={styles.empty}>No posts yet.</Text>}
      ListFooterComponent={recentActivity.length > 0 && hasMore ? (
        <TouchableOpacity style={styles.loadMore} disabled={loadingEarlier} accessibilityRole="button" onPress={async () => {
          if (!user) return;
          setLoadingEarlier(true);
          try {
            const count = recentActivity.length;
            const nextLimit = limit + 24;
            await fetchRecentActivity(groupId, user.id, nextLimit);
            setHasMore(useStatusStore.getState().recentActivity.length > count);
            setLimit(nextLimit);
          } catch (err: any) { setError(err.message); }
          finally { setLoadingEarlier(false); }
        }}><Text style={styles.date}>{loadingEarlier ? 'Loading…' : 'Load earlier posts'}</Text></TouchableOpacity>
      ) : null}
    />
  );
}

export default function GroupScreen() {
  const { params: { groupId } } = useRoute<RouteProp<RootStackParamList, 'Group'>>();
  const navigation = useNavigation();
  const { fetchGroupDetails, fetchMembers, currentGroup, isLoading } = useGroupsStore();
  const resetStatus = useStatusStore((state) => state.reset);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    void Promise.all([fetchGroupDetails(groupId), fetchMembers(groupId)]).catch((err) => setError(err.message));
    return () => resetStatus();
  }, [groupId, fetchGroupDetails, fetchMembers, resetStatus]));

  useEffect(() => {
    if (currentGroup?.name) navigation.setOptions({ title: currentGroup.name });
  }, [currentGroup?.name, navigation]);

  if (!currentGroup || currentGroup.id !== groupId) {
    return <SafeAreaView style={styles.loading}>{isLoading ? <ActivityIndicator color={colors.accentActive} /> : <Text style={styles.error}>{error || 'Could not load this crew.'}</Text>}</SafeAreaView>;
  }

  return (
    <View style={styles.container}>
      <Tab.Navigator screenOptions={{
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle, borderTopWidth: 1 },
        tabBarActiveTintColor: colors.accentFocus,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { ...typography.label },
        headerShown: false,
      }}>
        <Tab.Screen name="Activity" component={ActivityTab} initialParams={{ groupId }} options={{ title: 'Feed', tabBarIcon: ({ color }) => <Feather name="zap" size={22} color={color} /> }} />
        <Tab.Screen name="Members" component={GroupMembersTab} initialParams={{ groupId }} options={{ title: 'Members', tabBarIcon: ({ color }) => <Feather name="users" size={22} color={color} /> }} />
        <Tab.Screen name="Analytics" component={GroupAnalyticsTab} initialParams={{ groupId }} options={{ title: 'Analytics', tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={22} color={color} /> }} />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pageBg },
  feedContent: { padding: 24, paddingBottom: 32 },
  pinned: { backgroundColor: colors.pageBg, paddingTop: 8, paddingBottom: 8 },
  statusSection: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 20 },
  statusLabel: { ...typography.label, color: colors.textMuted },
  statusText: { ...typography.caption, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  buttonSection: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  cooldown: { ...typography.caption, color: colors.textMuted, marginBottom: 16 },
  feedHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingTop: 4 },
  feedTitle: { ...typography.label, fontSize: 12, color: colors.textPrimary },
  date: { ...typography.caption, fontSize: 12, color: colors.textMuted },
  error: { ...typography.caption, color: colors.textPrimary, paddingVertical: 12 },
  empty: { ...typography.body, color: colors.textMuted, paddingVertical: 24 },
  loadMore: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
});
