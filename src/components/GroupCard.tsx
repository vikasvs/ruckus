import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GroupWithMembership } from '@/types';
import { colors, palette, radii, spacing, shadows } from '@/theme';

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
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderLeftWidth: 4,
    borderLeftColor: colors.accentActive,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  shareButton: {
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    marginLeft: 8,
  },
  shareIcon: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.feedback.success.base,
    marginLeft: 8,
  },
  memberCount: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  ruckedBadge: {
    backgroundColor: colors.ruckedBg,
  },
  rickedBadge: {
    backgroundColor: colors.rickedBg,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ruckedText: {
    color: colors.ruckedText,
  },
  rickedText: {
    color: colors.rickedText,
  },
});
