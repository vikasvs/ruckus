import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useGroupsStore } from '@/store/groupsStore';
import { colors, radii, spacing, typography } from '@/theme';

type CreateGroupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateGroup'>;

interface CreatedGroup {
  id: string;
  invite_code: string;
  name: string;
}

export default function CreateGroupScreen() {
  const [groupName, setGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<CreatedGroup | null>(null);
  const [copied, setCopied] = useState(false);
  const navigation = useNavigation<CreateGroupScreenNavigationProp>();
  const { user } = useAuthStore();
  const { createGroup } = useGroupsStore();

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (groupName.length > 100) {
      Alert.alert('Error', 'Group name must be 100 characters or less');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be signed in to create a group');
      return;
    }

    try {
      setIsSubmitting(true);
      const group = await createGroup(groupName.trim(), user.id);
      setCreatedGroup(group);
      // Auto-copy to clipboard
      Clipboard.setString(group.invite_code);
      setCopied(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (createdGroup) {
      Clipboard.setString(createdGroup.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGoToGroup = () => {
    if (createdGroup) {
      // Replace so back button goes to Home, not back to CreateGroup
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Home' },
          { name: 'Group', params: { groupId: createdGroup.id } },
        ],
      });
    }
  };

  // Success state — show invite code inline
  if (createdGroup) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.successContent}>
          <Text style={styles.successTitle}>{createdGroup.name}</Text>
          <Text style={styles.successSubtitle}>Share this code with your crew</Text>

          <TouchableOpacity style={styles.codeCard} onPress={handleCopyCode} activeOpacity={0.7}>
            <Text style={styles.codeText}>{createdGroup.invite_code}</Text>
            <Text style={styles.copyIcon}>{copied ? '✓' : '⧉'}</Text>
          </TouchableOpacity>
          <Text style={styles.copiedHint}>
            {copied ? 'Copied to clipboard' : 'Tap to copy'}
          </Text>

          <TouchableOpacity style={styles.button} onPress={handleGoToGroup}>
            <Text style={styles.buttonText}>Go to Group</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Create a Group</Text>
            <Text style={styles.subtitle}>
              Give your group a name that your crew will recognize
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Group name (e.g., 'Friday Night Crew')"
              placeholderTextColor={colors.textPlaceholder}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={100}
              editable={!isSubmitting}
              returnKeyType="go"
              onSubmitEditing={handleCreateGroup}
            />

            <Text style={styles.characterCount}>
              {groupName.length}/100
            </Text>

            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleCreateGroup}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.buttonText}>Create Group</Text>
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
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: 22,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    ...typography.body,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  characterCount: {
    color: colors.textLabel,
    ...typography.small,
    textAlign: 'right',
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.accentActive,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.textInverse,
    ...typography.subheading,
  },

  // Success state
  successContent: {
    flex: 1,
    paddingHorizontal: spacing.pagePadding,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  successTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  codeText: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 3,
    fontFamily: typography.monoFamily,
  },
  copyIcon: {
    fontSize: 20,
    color: colors.textMuted,
  },
  copiedHint: {
    ...typography.small,
    color: colors.textLabel,
    marginTop: spacing.sm,
    marginBottom: spacing['2xl'],
  },
});
