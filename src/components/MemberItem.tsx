import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GroupMemberWithUser } from '@/types';

interface MemberItemProps {
  member: GroupMemberWithUser;
  isCurrentUser?: boolean;
}

export default function MemberItem({ member, isCurrentUser }: MemberItemProps) {
  const formatRelativeTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never';

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

  const firstName = member.users?.first_name || 'Unknown';
  const hasStatus = member.current_status !== null;
  const statusColor = member.current_status === 'rucked'
    ? '#FF4458'
    : member.current_status === 'ricked'
    ? '#9C27B0'
    : '#666';

  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <View>
          <Text style={styles.name}>
            {firstName}
            {isCurrentUser && <Text style={styles.youTag}> (you)</Text>}
          </Text>
          {member.is_admin && (
            <Text style={styles.adminBadge}>Admin</Text>
          )}
        </View>
      </View>
      <View style={styles.rightContent}>
        {hasStatus && (
          <>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {member.current_status}
            </Text>
            <Text style={styles.lastActivity}>
              {formatRelativeTime(member.status_updated_at)}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  youTag: {
    color: '#999',
    fontWeight: 'normal',
  },
  adminBadge: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 2,
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  lastActivity: {
    fontSize: 12,
    color: '#999',
  },
});
