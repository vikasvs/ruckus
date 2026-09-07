import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { GroupIdentity, GroupMemberWithUser, NotificationMode, TabParamList } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useGroupsStore } from '@/store/groupsStore';
import { useStatusStore } from '@/store/statusStore';
import { colors, getStatusBg, getStatusText, typography } from '@/theme';
import { copyToClipboard, formatRelativeTime } from '@/utils';
import MemberHistorySheet from './MemberHistorySheet';

export default function GroupMembersTab() {
  const { params: { groupId } } = useRoute<RouteProp<TabParamList, 'Members'>>();
  const { user, profile, updateName } = useAuthStore();
  const { currentGroup: group, currentGroupMembers: members, fetchMembers, refreshInviteLink, updateMemberNotifications, updateGroupIdentity } = useGroupsStore();
  const me = members.find((member) => member.user_id === user?.id);
  const [name, setName] = useState(profile?.first_name ?? '');
  const [saving, setSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMemberWithUser | null>(null);
  const [editingCrew, setEditingCrew] = useState(false);
  const [crewName, setCrewName] = useState('');
  const [crewEmoji, setCrewEmoji] = useState('');
  const [crewSaving, setCrewSaving] = useState(false);
  const [crewError, setCrewError] = useState('');

  useEffect(() => { setName(profile?.first_name ?? ''); }, [profile?.first_name]);
  useEffect(() => {
    if (group && !group.invite_link?.url) void refreshInviteLink(groupId).catch(() => {});
  }, [group?.id, group?.invite_link?.url, groupId, refreshInviteLink]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const saveName = async () => {
    if (saving || !user) return;
    if (!name.trim()) { setError('Add your name before saving.'); return; }
    setSaving(true); setError(''); setNameSaved(false);
    try {
      await updateName(name.trim());
      await fetchMembers(groupId);
      await useStatusStore.getState().fetchRecentActivity(groupId, user.id);
      setNameSaved(true);
    } catch (err: any) { setError(err.message || 'Could not save your name.'); }
    finally { setSaving(false); }
  };

  const copyInvite = async () => {
    if (!group || copying) return;
    setCopying(true); setError('');
    try {
      const invite = group.invite_link?.url ? group.invite_link : await refreshInviteLink(groupId);
      if (!invite?.url) throw new Error('Invite link is unavailable. Please try again.');
      copyToClipboard(invite.url);
      setCopied(true);
    } catch (err: any) { setError(err.message || 'Could not copy the invite.'); }
    finally { setCopying(false); }
  };

  const changeNotifications = async (mode: NotificationMode) => {
    if (!user || notificationSaving) return;
    setNotificationSaving(true); setError('');
    try {
      await updateMemberNotifications(groupId, user.id, { notificationMode: mode, watchThreshold: mode === 'watch_threshold' ? (me?.watch_threshold ?? 3) : null });
    } catch (err: any) { setError(err.message || 'Could not save notifications.'); }
    finally { setNotificationSaving(false); }
  };

  const saveCrew = async () => {
    if (crewSaving || !me?.is_admin) return;
    if (!crewName.trim()) { setCrewError('Add a crew name before saving.'); return; }
    setCrewSaving(true); setCrewError('');
    try {
      await updateGroupIdentity(groupId, { name: crewName.trim(), emoji: crewEmoji.trim() });
      setEditingCrew(false);
    } catch (err: any) { setCrewError(err.message || 'Could not save crew details.'); }
    finally { setCrewSaving(false); }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={
        <RefreshControl refreshing={refreshing} tintColor={colors.accentActive} onRefresh={async () => {
          setRefreshing(true);
          try { await fetchMembers(groupId); } catch (err: any) { setError(err.message); } finally { setRefreshing(false); }
        }} />
      }>
        <View style={styles.header}>
          <View><Text style={styles.title}>The crew</Text><Text style={styles.subtitle}>{members.length} {members.length === 1 ? 'member' : 'members'}</Text></View>
          <TouchableOpacity style={styles.invite} onPress={() => void copyInvite()} disabled={copying} accessibilityRole="button" accessibilityLabel={copied ? 'Invite link copied' : 'Copy invite link'}>
            <Text style={styles.inviteIcon}>{copied ? '✓' : '🔗'}</Text>
          </TouchableOpacity>
        </View>

        <View>
          {members.map((member) => (
            <TouchableOpacity key={member.id} style={styles.member} onPress={() => setSelectedMember(member)} accessibilityRole="button" accessibilityLabel={`View ${member.users?.first_name ?? 'member'}'s history`}>
              <View style={[styles.avatar, { backgroundColor: getStatusBg(member.current_status ?? null) }]}><Text style={[styles.initial, { color: getStatusText(member.current_status ?? null) }]}>{(member.users?.first_name ?? '?').slice(0, 1).toUpperCase()}</Text></View>
              <View style={styles.memberInfo}><Text style={styles.memberName}>{member.users?.first_name ?? 'Unknown'}{member.user_id === user?.id ? ' (you)' : ''}</Text><Text style={styles.memberMeta}>{member.current_status ? `${member.current_status} up` : 'No active status'}{member.status_updated_at ? ` · ${formatRelativeTime(member.status_updated_at)}` : ''}</Text></View>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>NOTIFICATIONS</Text>
          <View style={styles.modeRow}>
            {([{ label: 'All', mode: 'all_activity' }, { label: 'Ruckus', mode: 'ruckus_only' }, { label: `${me?.watch_threshold ?? 3}+ people`, mode: 'watch_threshold' }, { label: 'Mute', mode: 'muted' }] as const).map(({ label, mode }) => (
              <TouchableOpacity key={mode} style={[styles.mode, (me?.notification_mode ?? 'all_activity') === mode && styles.modeActive]} onPress={() => void changeNotifications(mode)} disabled={notificationSaving} accessibilityRole="button" accessibilityState={{ selected: (me?.notification_mode ?? 'all_activity') === mode, disabled: notificationSaving }}>
                <Text style={[styles.modeText, (me?.notification_mode ?? 'all_activity') === mode && styles.modeTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>YOUR NAME</Text>
          <View style={styles.nameRow}>
            <TextInput style={[styles.input, styles.nameInput]} value={name} onChangeText={(value) => { setName(value); setNameSaved(false); }} accessibilityLabel="Your name" autoCorrect={false} autoCapitalize="words" returnKeyType="done" onSubmitEditing={() => void saveName()} editable={!saving} />
            <TouchableOpacity style={styles.save} onPress={() => void saveName()} disabled={saving} accessibilityRole="button" accessibilityLabel="Save name">
              {saving ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.saveText}>{nameSaved ? 'Saved' : 'Save'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
        {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}

        {me?.is_admin && <TouchableOpacity style={styles.crewDetails} accessibilityRole="button" accessibilityLabel="Edit crew details" onPress={() => {
          setCrewName(group?.name ?? ''); setCrewEmoji((group?.settings?.identity as GroupIdentity)?.emoji ?? ''); setCrewError(''); setEditingCrew(true);
        }}><View style={styles.memberInfo}><Text style={styles.memberName}>Crew details</Text><Text style={styles.memberMeta}>{group?.name}</Text></View><Text style={styles.edit}>Edit</Text></TouchableOpacity>}
      </ScrollView>

      {selectedMember && <MemberHistorySheet key={selectedMember.user_id} groupId={groupId} member={selectedMember} onClose={() => setSelectedMember(null)} />}
      <Modal visible={editingCrew} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingCrew(false)}>
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <View style={styles.header}><Text style={styles.title}>Crew details</Text><TouchableOpacity style={styles.done} onPress={() => setEditingCrew(false)} accessibilityRole="button"><Text style={styles.edit}>Done</Text></TouchableOpacity></View>
              <Text style={styles.label}>CREW NAME</Text><TextInput style={styles.input} value={crewName} onChangeText={setCrewName} accessibilityLabel="Crew name" autoCapitalize="words" />
              <Text style={styles.label}>CREW EMOJI</Text><TextInput style={styles.input} value={crewEmoji} onChangeText={setCrewEmoji} accessibilityLabel="Crew emoji" />
              {!!crewError && <Text style={styles.error} accessibilityRole="alert">{crewError}</Text>}
              <TouchableOpacity style={styles.save} disabled={crewSaving} onPress={() => void saveCrew()} accessibilityRole="button"><Text style={styles.saveText}>{crewSaving ? 'Saving…' : 'Save crew details'}</Text></TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBg },
  content: { padding: 24, gap: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  title: { ...typography.heading, color: colors.textPrimary },
  subtitle: { ...typography.caption, fontSize: 14, color: colors.textMuted, marginTop: 6 },
  invite: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHover, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 8 },
  inviteIcon: { fontSize: 23, color: colors.textPrimary },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  initial: { ...typography.body, fontWeight: '600' },
  memberInfo: { flex: 1, gap: 4 },
  memberName: { ...typography.body, fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  memberMeta: { ...typography.caption, fontSize: 12, color: colors.textMuted },
  section: { gap: 12, paddingTop: 4 },
  label: { ...typography.label, color: colors.textMuted },
  modeRow: { flexDirection: 'row', gap: 6 },
  mode: { flex: 1, minHeight: 44, paddingHorizontal: 4, paddingVertical: 8, borderRadius: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceMuted },
  modeActive: { backgroundColor: colors.charcoalBg },
  modeText: { ...typography.caption, textAlign: 'center', color: colors.textPrimary },
  modeTextActive: { color: colors.textInverse, fontWeight: '600' },
  nameRow: { flexDirection: 'row', gap: 8 },
  nameInput: { flex: 1 },
  input: { ...typography.body, fontSize: 16, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.surfaceHover, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 6, color: colors.textPrimary },
  save: { minHeight: 48, minWidth: 78, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentActive, borderRadius: 6 },
  saveText: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.textInverse },
  crewDetails: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  edit: { ...typography.body, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  done: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  error: { ...typography.caption, color: colors.textPrimary },
});
