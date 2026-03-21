import React, { useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { createUser } from '@/services/user';
import { colors, typography, radii, spacing } from '@/theme';

export default function AuthScreen() {
  const [firstName, setFirstName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser, fetchProfile } = useAuthStore();

  const handleContinue = async () => {
    if (!firstName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      setIsLoading(true);
      const user = await createUser(firstName.trim());
      await setUser(user.id);
      await fetchProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Ruckus</Text>
            <Text style={styles.subtitle}>What should we call you?</Text>

            <TextInput
              style={styles.input}
              placeholder="First name"
              placeholderTextColor={colors.textPlaceholder}
              value={firstName}
              onChangeText={setFirstName}
              autoFocus
              autoCapitalize="words"
              returnKeyType="go"
              onSubmitEditing={handleContinue}
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleContinue}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.buttonText}>Let's Go</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.pagePadding,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    ...typography.body,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  button: {
    width: '100%',
    height: 48,
    backgroundColor: colors.accentActive,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textInverse,
    ...typography.subheading,
  },
});
