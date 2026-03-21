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

function ActivityTab() {
  const route = useRoute<GroupScreenRouteProp>();
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
        <Text style={styles.statusTitle}>Current Status</Text>
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
        <Text style={styles.feedTitle}>Recent Activity</Text>
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
  const route = useRoute<GroupScreenRouteProp>();
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

  const handleCopyInviteCode = () => {
    if (currentGroup?.invite_code) {
      Clipboard.setString(currentGroup.invite_code);
      Alert.alert('Copied!', 'Invite code copied to clipboard');
    }
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
        <TouchableOpacity style={styles.inviteCodeCard} onPress={handleCopyInviteCode}>
          <Text style={styles.inviteCodeLabel}>Invite Code</Text>
          <Text style={styles.inviteCode}>{currentGroup.invite_code}</Text>
          <Text style={styles.tapToCopy}>Tap to copy</Text>
        </TouchableOpacity>
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
        Members ({currentGroupMembers.length})
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

export default function GroupScreen() {
  const route = useRoute<GroupScreenRouteProp>();
  const navigation = useNavigation();
  const { groupId } = route.params;
  const { fetchGroupDetails, fetchMembers, currentGroup, isLoading } = useGroupsStore();
  const { reset: resetStatus } = useStatusStore();

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
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderSubtle,
          },
          tabBarActiveTintColor: colors.accentActive,
          tabBarInactiveTintColor: colors.textMuted,
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="Activity"
          component={ActivityTab}
          initialParams={{ groupId }}
          options={{ title: 'Activity' }}
        />
        <Tab.Screen
          name="Members"
          component={MembersTab}
          initialParams={{ groupId }}
          options={{ title: 'Members' }}
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
    padding: 20,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  statusTitle: {
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  ruckedText: {
    color: colors.ruckedFill,
  },
  rickedText: {
    color: colors.rickedFill,
  },
  buttonSection: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30,
  },
  activityFeed: {
    flex: 1,
  },
  feedTitle: {
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 15,
    fontWeight: '500',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.cooldownTrack,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressTime: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    width: 35,
    textAlign: 'right',
  },
  membersContainer: {
    flex: 1,
    backgroundColor: colors.pageBg,
    padding: 20,
  },
  inviteCodeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  inviteCodeLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  tapToCopy: {
    fontSize: 11,
    color: colors.textLabel,
    marginTop: 4,
  },
  notificationToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  notificationLabel: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  membersTitle: {
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 15,
    fontWeight: '500',
  },
});
