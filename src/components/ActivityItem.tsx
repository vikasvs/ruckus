import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusEventWithUser } from '@/types';

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
  const statusColor = item.status_type === 'rucked' ? '#FF4458' : '#9C27B0';

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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: 15,
    color: '#fff',
    marginBottom: 2,
  },
  name: {
    fontWeight: '600',
  },
  status: {
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
});
