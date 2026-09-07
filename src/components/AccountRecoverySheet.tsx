import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useGroupsStore } from '@/store/groupsStore';
import { useStatusStore } from '@/store/statusStore';
import { recoverAccount } from '@/services/recovery';
import { colors, typography } from '@/theme';

export default function AccountRecoverySheet({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const restore = async () => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError('');
    try {
      const profile = await recoverAccount(code);
      await useAuthStore.getState().setUser(profile.id);
      useGroupsStore.setState({ groups: [], currentGroup: null, currentGroupMembers: [], currentInvitePreview: null, currentRituals: [], error: null });
      useStatusStore.getState().reset();
      useAuthStore.getState().setProfile(profile);
      onClose();
    } catch (err: any) { setError(err.message || 'Could not restore your account. Keep your code and try again.'); }
    finally { busy.current = false; setSaving(false); }
  };
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!busy.current) onClose(); }}>
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Get back in</Text>
            <TouchableOpacity style={styles.close} onPress={onClose} disabled={saving} accessibilityRole="button" accessibilityState={{ disabled: saving }}><Text style={styles.closeText}>Cancel</Text></TouchableOpacity>
          </View>
          <Text style={styles.body}>Restore your original account, crews, and history with a recovery code.</Text>
          <Text style={styles.label}>RECOVERY CODE</Text>
          <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="Paste your recovery code" placeholderTextColor={colors.textPlaceholder}
            accessibilityLabel="Recovery code" autoCapitalize="characters" autoCorrect={false} editable={!saving} maxLength={64} returnKeyType="go" onSubmitEditing={() => void restore()} />
          {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
          <TouchableOpacity style={[styles.button, saving && styles.disabled]} accessibilityRole="button" accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => void restore()}>
            {saving ? <ActivityIndicator color={colors.textInverse} accessibilityLabel="Restoring account" /> : <Text style={styles.buttonText}>Restore my account</Text>}
          </TouchableOpacity>
          <Text style={styles.help}>No code? Contact the person who invited you to the Ruckus beta so they can arrange account recovery. Your name alone cannot restore an account.</Text>
          <Text style={styles.help}>Codes expire after one hour. Keep yours private. Recovery does not create a new member or erase your history.</Text>
          <Text style={styles.help}>If you already made a new account, this switches back to your original account. It does not merge the two.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.pageBg },
  content: { padding: 24, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  title: { ...typography.heading, flex: 1, color: colors.textPrimary },
  close: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  closeText: { ...typography.body, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
  label: { ...typography.label, color: colors.textMuted },
  input: { ...typography.body, minHeight: 52, padding: 14, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: 8, backgroundColor: colors.surfaceHover, color: colors.textPrimary },
  button: { minHeight: 52, padding: 14, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: colors.accentActive },
  buttonText: { ...typography.body, fontWeight: '600', color: colors.textInverse },
  disabled: { opacity: 0.6 },
  help: { ...typography.caption, fontSize: 14, lineHeight: 21, color: colors.textMuted },
  error: { ...typography.body, color: colors.textPrimary },
});
