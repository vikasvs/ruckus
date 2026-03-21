import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GroupMemberWithUser } from '@/types';
import { colors, palette, spacing, radii, typography, getStatusColor } from '@/theme';

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
  const statusColor = getStatusColor(member.current_status);

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
            <Text style={styles.adminBadge}>ADMIN</Text>
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
    paddingVertical: spacing.listItemPaddingY,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.md,
  },
  name: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  youTag: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  adminBadge: {
    ...typography.label,
    color: palette.feedback.success.text,
    backgroundColor: palette.feedback.success.bg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginTop: 2,
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: 2,
  },
  lastActivity: {
    ...typography.small,
    color: colors.textMuted,
  },
});
