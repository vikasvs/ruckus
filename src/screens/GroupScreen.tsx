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
  Share,
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
import { colors, palette, radii, spacing, typography } from '@/theme';

const Tab = createBottomTabNavigator<TabParamList>();

type GroupScreenRouteProp = RouteProp<RootStackParamList, 'Group'>;
type ActivityTabRouteProp = RouteProp<TabParamList, 'Activity'>;
type MembersTabRouteProp = RouteProp<TabParamList, 'Members'>;

function ActivityTab() {
  const route = useRoute<ActivityTabRouteProp>();
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
        <Text style={styles.statusLabel}>CURRENT STATUS</Text>
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
                  backgroundColor: currentStatus === 'rucked' ? colors.ruckedFill : colors.rickedFill,
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
        <Text style={styles.feedTitle}>RECENT ACTIVITY</Text>
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
              tintColor={colors.accentActive}
            />
          }
        />
      </View>
    </View>
  );
}

function MembersTab() {
  const route = useRoute<MembersTabRouteProp>();
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

  const [codeCopied, setCodeCopied] = useState(false);

  const handleCopyInviteCode = () => {
    if (currentGroup?.invite_code) {
      Clipboard.setString(currentGroup.invite_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleShareInviteCode = async () => {
    if (!currentGroup) return;
    try {
      await Share.share({
        message: `Join "${currentGroup.name}" on Ruckus! Code: ${currentGroup.invite_code}`,
      });
    } catch (_) {}
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
        <View style={styles.inviteCodeCard}>
          <View style={styles.inviteCodeLeft}>
            <Text style={styles.inviteCodeLabel}>INVITE CODE</Text>
            <Text style={styles.inviteCode}>{currentGroup.invite_code}</Text>
          </View>
          <View style={styles.inviteCodeActions}>
            <TouchableOpacity onPress={handleCopyInviteCode}>
              <Text style={styles.inviteActionText}>{codeCopied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShareInviteCode}>
              <Text style={styles.inviteActionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.notificationToggle}>
        <Text style={styles.notificationLabel}>Push Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={handleToggleNotifications}
          trackColor={{ false: colors.borderDefault, true: palette.feedback.success.base }}
          thumbColor={colors.surface}
        />
      </View>

      <Text style={styles.membersTitle}>
        MEMBERS ({currentGroupMembers.length})
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
            tintColor={colors.accentActive}
          />
        }
      />
    </View>
  );
}

function InviteCodeBar({ inviteCode, groupName }: { inviteCode: string; groupName: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join "${groupName}" on Ruckus! Code: ${inviteCode}`,
      });
    } catch (_) {}
  };

  return (
    <View style={styles.inviteBar}>
      <TouchableOpacity style={styles.inviteBarContent} onPress={handleCopy}>
        <Text style={styles.inviteBarCode}>{inviteCode}</Text>
        <Text style={styles.inviteBarAction}>{copied ? 'Copied!' : 'Copy'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleShare}>
        <Text style={styles.inviteBarShare}>Share</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function GroupScreen() {
  const route = useRoute<GroupScreenRouteProp>();
  const navigation = useNavigation();
  const { groupId, showInviteCode } = route.params;
  const { fetchGroupDetails, fetchMembers, currentGroup, isLoading } = useGroupsStore();
  const { reset: resetStatus } = useStatusStore();
  const [showBanner] = useState(!!showInviteCode);

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
          <ActivityIndicator size="large" color={colors.accentActive} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {showBanner && currentGroup && (
        <InviteCodeBar
          inviteCode={currentGroup.invite_code}
          groupName={currentGroup.name}
        />
      )}
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderSubtle,
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: colors.accentActive,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            ...typography.label,
          },
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Activity"
          component={ActivityTab}
          initialParams={{ groupId }}
          options={{
            title: 'Activity',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18, color }}>{'\u26A1'}</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Members"
          component={MembersTab}
          initialParams={{ groupId }}
          options={{
            title: 'Members',
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 18, color }}>{'\u{1F465}'}</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContainer: {
    flex: 1,
    backgroundColor: colors.pageBg,
    padding: spacing.pagePadding,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  statusLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  statusText: {
    ...typography.body,
    color: colors.textMuted,
  },
  ruckedText: {
    color: colors.ruckedFill,
    fontWeight: '600',
  },
  rickedText: {
    color: colors.rickedFill,
    fontWeight: '600',
  },
  buttonSection: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  activityFeed: {
    flex: 1,
  },
  feedTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    ...typography.body,
    marginTop: spacing.xl,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.cooldownTrack,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressTime: {
    color: colors.textPrimary,
    ...typography.caption,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
  membersContainer: {
    flex: 1,
    backgroundColor: colors.pageBg,
    padding: spacing.pagePadding,
  },
  inviteCodeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.cardPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  inviteCodeLeft: {
    flex: 1,
  },
  inviteCodeLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  inviteCode: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 2,
    fontFamily: typography.monoFamily,
  },
  inviteCodeActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inviteActionText: {
    ...typography.caption,
    color: colors.accentActive,
    fontWeight: '600',
  },
  notificationToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.cardPadding,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  notificationLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  membersTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  inviteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.pagePadding,
    backgroundColor: colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  inviteBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inviteBarCode: {
    ...typography.caption,
    fontFamily: typography.monoFamily,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    fontWeight: '500',
  },
  inviteBarAction: {
    ...typography.caption,
    color: colors.accentActive,
    fontWeight: '600',
  },
  inviteBarShare: {
    ...typography.caption,
    color: colors.accentActive,
    fontWeight: '600',
    paddingLeft: spacing.md,
  },
});
