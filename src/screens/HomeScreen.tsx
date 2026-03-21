import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RealtimeChannel } from '@supabase/supabase-js';
import { RootStackParamList, GroupWithMembership } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useGroupsStore } from '@/store/groupsStore';
import { subscribeToUserGroups, unsubscribe } from '@/utils/realtime';
import GroupCard from '@/components/GroupCard';
import Loading from '@/components/Loading';
import EmptyState from '@/components/EmptyState';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuthStore();
  const { groups, isLoading, fetchGroups } = useGroupsStore();
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

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

      // Set up real-time subscription for status changes
      if (user?.id) {
        subscriptionRef.current = subscribeToUserGroups(user.id, () => {
          // Refresh groups when any status changes
          loadGroups();
        });
      }

      return () => {
        if (subscriptionRef.current) {
          unsubscribe(subscriptionRef.current);
        }
      };
    }, [loadGroups, user?.id])
  );

  const handleGroupPress = (group: GroupWithMembership) => {
    navigation.navigate('Group', { groupId: group.id });
  };

  const handleSharePress = (group: GroupWithMembership) => {
    if (group.invite_code) {
      Clipboard.setString(group.invite_code);
      Alert.alert('Invite code copied!', group.invite_code);
    }
  };

  const renderGroupCard = ({ item }: { item: GroupWithMembership }) => (
    <GroupCard
      group={item}
      onPress={() => handleGroupPress(item)}
      onSharePress={() => handleSharePress(item)}
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
        contentContainerStyle={[
          styles.listContainer,
          groups.length === 0 && styles.emptyListContainer,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadGroups}
            tintColor="#FF4458"
            colors={['#FF4458']}
          />
        }
      />

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
          <Text style={styles.fabText}>Join Group</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  listContainer: {
    padding: 15,
  },
  emptyListContainer: {
    flex: 1,
  },
  fab: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  createButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
