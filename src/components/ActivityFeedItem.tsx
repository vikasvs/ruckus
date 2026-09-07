import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GroupFeedItem } from '@/types';
import { colors, getStatusBg, getStatusText, palette, radii, typography } from '@/theme';
import { formatDateTime, formatRelativeTime } from '@/utils';

interface ActivityFeedItemProps {
  item: GroupFeedItem;
  pinned?: boolean;
}

export default function ActivityFeedItem({ item, pinned = false }: ActivityFeedItemProps) {
  if (item.type === 'status') {
    return (
      <View style={styles.statusCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            <Text style={styles.bold}>{item.first_name}</Text>
            {` is ${item.status_type} up`}
          </Text>
          <Text style={styles.cardMeta}>{formatRelativeTime(item.created_at)}</Text>
        </View>
        <View style={styles.statusMetadata}>
          <Text style={[styles.statusChip, { color: getStatusText(item.status_type), backgroundColor: getStatusBg(item.status_type) }]}>{item.status_type} up</Text>
          <Text style={styles.cardMeta}>{formatDateTime(item.created_at)}</Text>
        </View>
      </View>
    );
  }

  if (item.type === 'burst') {
    const names = item.participant_names;
    const headline = names && names.length >= 2
      ? `${names.slice(0, 2).join(' + ')}${names.length > 2 ? ` + ${names.length - 2} more` : ''}.\n${pinned ? "It's a ruckus." : 'That was a ruckus.'}`
      : pinned ? item.title : item.title.replace('is in a Ruckus', 'got into a ruckus');
    return (
      <View style={styles.burstCard} testID={pinned ? 'pinned-ruckus' : 'historical-ruckus'}>
        <View style={styles.cardHeader}>
          <Text style={styles.burstLabel}>{pinned ? 'RUCKUS IN PROGRESS' : 'A RUCKUS HAPPENED'}</Text>
          <Text style={styles.cardMeta}>{pinned ? 'Pinned' : formatRelativeTime(item.created_at)}</Text>
        </View>
        <Text style={styles.burstTitle}>{headline}</Text>
        <Text style={styles.burstBody}>{pinned ? 'The crew is getting into it.' : `${item.distinct_member_count} people started this ruckus.`}</Text>
      </View>
    );
  }

  // Roll calls, rituals and turnout recaps are no longer part of the feed.
  return null;
}

const styles = StyleSheet.create({
  statusCard: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, marginBottom: 4 },
  burstCard: { padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accentActive, borderRadius: radii.lg, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { ...typography.body, fontSize: 16, lineHeight: 22, color: colors.textPrimary, flex: 1 },
  bold: { fontWeight: '600' },
  cardMeta: { ...typography.caption, fontSize: 12, lineHeight: 18, color: colors.textMuted },
  burstLabel: { ...typography.label, color: palette.primary.deep, flex: 1 },
  burstTitle: { ...typography.heading, fontSize: 24, lineHeight: 28, color: colors.textPrimary, marginTop: 8 },
  burstBody: { ...typography.caption, lineHeight: 19, color: colors.textTertiary, marginTop: 8 },
  statusMetadata: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12 },
  statusChip: { ...typography.caption, fontSize: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 4, overflow: 'hidden' },
});
