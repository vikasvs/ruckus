import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GroupWithMembership, NotificationMode } from '@/types';
import { colors, radii, spacing, typography } from '@/theme';

interface GroupCardProps {
  group: GroupWithMembership;
  onPress: () => void;
}

function labelForMode(mode: NotificationMode, threshold: number) {
  switch (mode) {
    case 'ruckus_only':
      return 'Ruckus Only';
    case 'watch_threshold':
      return `${threshold}+ people`;
    case 'muted':
      return 'Muted';
    default:
      return 'All Activity';
  }
}

export default function GroupCard({ group, onPress }: GroupCardProps) {
  const ruckedCount = group.active_rucked_count ?? 0;
  const rickedCount = group.active_ricked_count ?? 0;
  const totalLive = ruckedCount + rickedCount;
  const hasActiveStatus = totalLive > 0;
  const mode = group.membership?.notification_mode ?? 'all_activity';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <View style={styles.titleCopy}>
            <Text style={styles.name} numberOfLines={1}>
              {group.name}
            </Text>
          </View>
        </View>

      </View>

      <View style={styles.metaRow}>
        <Text style={styles.memberCount}>
          {group.member_count} member{group.member_count !== 1 ? 's' : ''}
        </Text>
        <View style={styles.modeChip}>
          <Text style={styles.modeChipText}>{labelForMode(mode, group.membership?.watch_threshold ?? 3)}</Text>
        </View>
      </View>

      {hasActiveStatus ? (
        <View style={styles.statusContainer}>
          {ruckedCount > 0 && (
            <View style={[styles.statusBadge, styles.ruckedBadge]}>
              <Text style={[styles.statusText, styles.ruckedText]}>
                {ruckedCount} rucked
              </Text>
            </View>
          )}
          {rickedCount > 0 && (
            <View style={[styles.statusBadge, styles.rickedBadge]}>
              <Text style={[styles.statusText, styles.rickedText]}>
                {rickedCount} ricked
              </Text>
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.quietText}>Quiet right now</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleWrap: {
    flexDirection: 'row',
    gap: spacing.sm,
    flex: 1,
  },
  titleCopy: {
    flex: 1,
  },
  name: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  memberCount: {
    ...typography.caption,
    color: colors.textMuted,
  },
  modeChip: {
    backgroundColor: colors.surfaceHover,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  modeChipText: {
    ...typography.label,
    color: colors.textMuted,
  },
  quietText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  ruckedBadge: {
    backgroundColor: colors.ruckedBg,
  },
  rickedBadge: {
    backgroundColor: colors.rickedBg,
  },
  statusText: {
    ...typography.label,
  },
  ruckedText: {
    color: colors.ruckedText,
  },
  rickedText: {
    color: colors.rickedText,
  },
});
