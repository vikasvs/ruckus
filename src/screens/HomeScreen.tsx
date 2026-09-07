import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, GroupWithMembership } from '@/types';
import { colors, radii, spacing, typography } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { useGroupsStore } from '@/store/groupsStore';
import GroupCard from '@/components/GroupCard';
import Loading from '@/components/Loading';
import EmptyState from '@/components/EmptyState';
import AccountRecoverySheet from '@/components/AccountRecoverySheet';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [recovering, setRecovering] = useState(false);
  const { user } = useAuthStore();
  const { groups, isLoading, fetchGroups } = useGroupsStore();

  const loadGroups = useCallback(async () => {
    if (user?.id) {
      try {
        await fetchGroups(user.id);
      } catch (error) {
        console.error('Error loading groups:', error);
      }
    }
  }, [user?.id, fetchGroups]);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [loadGroups])
  );

  const handleGroupPress = (group: GroupWithMembership) => {
    navigation.navigate('Group', { groupId: group.id });
  };

  const renderGroupCard = ({ item }: { item: GroupWithMembership }) => (
    <GroupCard
      group={item}
      onPress={() => handleGroupPress(item)}
    />
  );

  const renderEmptyState = () => (
    <EmptyState
      title="No groups yet!"
      subtitle="Create or join a group to start letting your crew know when you're rucked up"
    />
  );

  if (isLoading && groups.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Loading groups..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={groups}
        renderItem={renderGroupCard}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={<TouchableOpacity style={styles.recoveryLink} accessibilityRole="button" onPress={() => setRecovering(true)}><Text style={styles.recoveryText}>Missing your old groups? Recover account</Text></TouchableOpacity>}
        contentContainerStyle={[
          styles.listContainer,
          groups.length === 0 && styles.emptyListContainer,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadGroups}
            tintColor={colors.accentActive}
            colors={[colors.accentActive]}
          />
        }
      />

      {recovering && <AccountRecoverySheet onClose={() => setRecovering(false)} />}
      <View style={styles.fab}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Text style={styles.fabText}>Create Group</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => navigation.navigate('JoinGroup')}
        >
          <Text style={styles.joinButtonText}>Join Group</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  recoveryLink: { minHeight: 44, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  recoveryText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  listContainer: {
    padding: spacing.pagePadding,
  },
  emptyListContainer: {
    flex: 1,
  },
  fab: {
    flexDirection: 'row',
    padding: spacing.pagePadding,
    gap: spacing.sm,
  },
  createButton: {
    flex: 1,
    backgroundColor: colors.accentActive,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  joinButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  fabText: {
    color: colors.textInverse,
    ...typography.subheading,
  },
  joinButtonText: {
    color: colors.textPrimary,
    ...typography.subheading,
  },
});
