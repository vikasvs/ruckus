import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GroupWithMembership } from '@/types';

interface GroupCardProps {
  group: GroupWithMembership;
  onPress: () => void;
  onSharePress?: () => void;
}

export default function GroupCard({ group, onPress, onSharePress }: GroupCardProps) {
  const ruckedCount = group.active_rucked_count ?? 0;
  const rickedCount = group.active_ricked_count ?? 0;
  const hasActiveStatus = ruckedCount > 0 || rickedCount > 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {group.name}
        </Text>
        {onSharePress && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={(e) => { e.stopPropagation?.(); onSharePress(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.shareIcon}>↗</Text>
          </TouchableOpacity>
        )}
        {hasActiveStatus && <View style={styles.activeDot} />}
      </View>

      <Text style={styles.memberCount}>
        {group.member_count} member{group.member_count !== 1 ? 's' : ''}
      </Text>

      {hasActiveStatus && (
        <View style={styles.statusContainer}>
          {ruckedCount > 0 && (
            <View style={[styles.statusBadge, styles.ruckedBadge]}>
              <Text style={styles.statusText}>
                {ruckedCount} rucked
              </Text>
            </View>
          )}
          {rickedCount > 0 && (
            <View style={[styles.statusBadge, styles.rickedBadge]}>
              <Text style={styles.statusText}>
                {rickedCount} ricked
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  shareButton: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  shareIcon: {
    color: '#fff',
    fontSize: 14,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  memberCount: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ruckedBadge: {
    backgroundColor: 'rgba(255, 68, 88, 0.2)',
  },
  rickedBadge: {
    backgroundColor: 'rgba(156, 39, 176, 0.2)',
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
});
