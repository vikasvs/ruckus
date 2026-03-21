import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusEventWithUser } from '@/types';
import { colors, spacing, typography, getStatusColor } from '@/theme';

interface ActivityItemProps {
  item: StatusEventWithUser;
}

export default function ActivityItem({ item }: ActivityItemProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const firstName = item.users?.first_name || 'Someone';
  const statusColor = getStatusColor(item.status_type);

  return (
    <View style={styles.container}>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <View style={styles.content}>
        <Text style={styles.text}>
          <Text style={styles.name}>{firstName}</Text>
          {' is '}
          <Text style={[styles.status, { color: statusColor }]}>
            {item.status_type}
          </Text>
          {' up'}
        </Text>
        <Text style={styles.time}>
          {formatRelativeTime(item.created_at)} @ {formatTime(item.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.listItemPaddingY,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  text: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  name: {
    fontWeight: '600',
  },
  status: {
    fontWeight: '600',
  },
  time: {
    ...typography.small,
    color: colors.textMuted,
  },
});
