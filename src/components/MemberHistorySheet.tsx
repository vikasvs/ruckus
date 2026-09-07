import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMemberHistory, MemberHistoryEvent } from '@/services/status';
import { GroupMemberWithUser } from '@/types';
import { colors, getStatusBg, getStatusText, typography } from '@/theme';
import { formatDateTime } from '@/utils';

export default function MemberHistorySheet({ groupId, member, onClose }: {
  groupId: string;
  member: GroupMemberWithUser;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<MemberHistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const busy = useRef(false);
  const mounted = useRef(true);
  const load = useCallback(async (offset: number) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError('');
    try {
      const page = await getMemberHistory(groupId, member.user_id, offset);
      if (!mounted.current) return;
      setEvents((previous) => offset ? [...previous, ...page] : page);
      setHasMore(page.length === 30);
    } catch (err: any) {
      if (mounted.current) setError(err.message || 'Could not load history.');
    } finally {
      busy.current = false;
      if (mounted.current) setLoading(false);
    }
  }, [groupId, member.user_id]);

  useEffect(() => {
    mounted.current = true;
    void load(0);
    return () => { mounted.current = false; };
  }, [load]);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{member.users?.first_name ?? 'Member'}'s history</Text>
          <TouchableOpacity onPress={onClose} style={styles.button} accessibilityRole="button"><Text style={styles.action}>Done</Text></TouchableOpacity>
        </View>
        <FlatList
          data={events}
          keyExtractor={(event) => event.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={[styles.status, { color: getStatusText(item.status_type), backgroundColor: getStatusBg(item.status_type) }]}>{item.status_type} up</Text>
              <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
            </View>
          )}
          ListEmptyComponent={!loading && !error ? <Text style={styles.date}>No posts yet.</Text> : null}
          ListFooterComponent={
            <View>
              {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
              {loading ? <ActivityIndicator color={colors.accentActive} /> : (hasMore || !!error) && (
                <TouchableOpacity style={styles.button} onPress={() => void load(events.length)} accessibilityRole="button"><Text style={styles.action}>{error ? 'Try again' : 'Load earlier posts'}</Text></TouchableOpacity>
              )}
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBg },
  header: { paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  title: { ...typography.subheading, fontWeight: '600', flex: 1, color: colors.textPrimary },
  content: { padding: 24 },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  status: { ...typography.caption, borderRadius: 4, padding: 8, overflow: 'hidden' },
  date: { ...typography.caption, color: colors.textMuted },
  button: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  action: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  error: { ...typography.caption, color: colors.textPrimary, paddingVertical: 8 },
});
