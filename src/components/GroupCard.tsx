import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GroupWithMembership } from '@/types';
import { colors, palette, radii, spacing, typography } from '@/theme';

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
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.cardPadding,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderLeftWidth: 4,
    borderLeftColor: colors.accentActive,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    ...typography.subheading,
    color: colors.textPrimary,
    flex: 1,
  },
  shareButton: {
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    marginLeft: spacing.sm,
  },
  shareIcon: {
    color: colors.textMuted,
    ...typography.caption,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.feedback.success.base,
    marginLeft: spacing.sm,
  },
  memberCount: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
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
