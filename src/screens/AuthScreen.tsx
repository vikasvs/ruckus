import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '@/store/authStore';
import { createUser } from '@/services/user';
import { colors, typography, radii, spacing } from '@/theme';
import RuckusWelcomeGate from '@/components/RuckusWelcomeGate';
import AccountRecoverySheet from '@/components/AccountRecoverySheet';

export default function AuthScreen() {
  const [firstName, setFirstName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const busy = useRef(false);
  const { setUser, fetchProfile } = useAuthStore();

  const handleContinue = async () => {
    if (busy.current) return;
    if (!firstName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      busy.current = true; setIsLoading(true);
      const user = await createUser(firstName.trim());
      await setUser(user.id);
      await fetchProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      busy.current = false; setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <RuckusWelcomeGate>
          <View style={styles.glassForm}>
            <BlurView intensity={72} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.formContent}>
              <Text style={styles.formLabel}>WHAT SHOULD WE CALL YOU?</Text>
              <TextInput
                style={styles.input}
                placeholder="First name"
                placeholderTextColor={colors.textPlaceholder}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleContinue}
                accessibilityLabel="First name"
              />

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleContinue}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Enter Ruckus"
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <Text style={styles.buttonText}>Enter Ruckus</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.recoveryLink} onPress={() => setRecovering(true)} disabled={isLoading} accessibilityRole="button">
                <Text style={styles.recoveryText}>Already had an account? Recover it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </RuckusWelcomeGate>
      </KeyboardAvoidingView>
      {recovering && <AccountRecoverySheet onClose={() => setRecovering(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  recoveryLink: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  recoveryText: { ...typography.caption, color: colors.textPrimary, textAlign: 'center' },
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  keyboardAvoid: {
    flex: 1,
  },
  glassForm: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.82)',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.58)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  formContent: {
    padding: spacing.lg,
  },
  formLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    width: '100%',
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    ...typography.body,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    color: colors.textPrimary,
  },
  button: {
    width: '100%',
    minHeight: 48,
    backgroundColor: colors.charcoalBg,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: colors.textInverse,
    ...typography.subheading,
  },
});
