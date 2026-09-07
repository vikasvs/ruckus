import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useGroupsStore } from '@/store/groupsStore';
import { colors, radii, spacing, typography } from '@/theme';

type JoinGroupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'JoinGroup'>;

export default function JoinGroupScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigation = useNavigation<JoinGroupScreenNavigationProp>();
  const route = useRoute();
  const { user } = useAuthStore();
  const {
    currentInvitePreview,
    fetchInvitePreview,
    clearInvitePreview,
    joinGroup,
    joinGroupByInviteLink,
  } = useGroupsStore();

  const inviteToken = (route.params as RootStackParamList['JoinGroup'])?.inviteToken;

  useEffect(() => {
    if (!inviteToken) {
      clearInvitePreview();
      return;
    }

    fetchInvitePreview(inviteToken).catch((error: any) => {
      Alert.alert('Invite unavailable', error.message || 'That invite link has expired.');
    });

    return () => {
      clearInvitePreview();
    };
  }, [inviteToken]);

  const formatInviteCode = (text: string) => {
    const cleaned = text.replace(/[^A-Za-z0-9]/g, '');
    return cleaned.substring(0, 8).toUpperCase();
  };

  const handleJoinViaCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }

    if (inviteCode.length !== 8) {
      Alert.alert('Error', 'Invite code must be 8 characters');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'You must be signed in to join a group');
      return;
    }

    try {
      setIsSubmitting(true);
      const { group } = await joinGroup(inviteCode, user.id);
      if (Platform.OS === 'web') {
        navigation.replace('Group', { groupId: group.id });
        return;
      }

      Alert.alert('Success', `You've joined ${group.name}!`, [
        {
          text: 'OK',
          onPress: () => navigation.replace('Group', { groupId: group.id }),
        },
      ]);
    } catch (error: any) {
      let errorMessage = error.message || 'Failed to join group';

      if (errorMessage.includes('Invalid invite code')) {
        errorMessage = 'Invalid invite code. Please check and try again.';
      } else if (errorMessage.includes('Already a member')) {
        errorMessage = "You're already a member of this group.";
      } else if (errorMessage.includes('full')) {
        errorMessage = 'This group is full (50 member limit).';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinViaLink = async () => {
    if (!inviteToken || !user?.id) {
      return;
    }

    try {
      setIsSubmitting(true);
      const { group } = await joinGroupByInviteLink(inviteToken, user.id);
      if (Platform.OS === 'web') {
        navigation.replace('Group', { groupId: group.id });
        return;
      }

      Alert.alert('Success', `You've joined ${group.name}!`, [
        {
          text: 'OK',
          onPress: () => navigation.replace('Group', { groupId: group.id }),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Join a Group</Text>
        <Text style={styles.subtitle}>
          Enter an invite code or follow a crew's invite link.
        </Text>

        {inviteToken && currentInvitePreview ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewEyebrow}>
              You're invited
            </Text>
            <Text style={styles.previewTitle}>{currentInvitePreview.group.name}</Text>
            <Text style={styles.previewBody}>
              {currentInvitePreview.member_count} {currentInvitePreview.member_count === 1 ? 'member' : 'members'}
            </Text>
            <Text style={styles.previewCode}>Code: {currentInvitePreview.group.invite_code}</Text>

            <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleJoinViaLink}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.buttonText}>Join This Crew</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.codeSection}>
          <Text style={styles.sectionLabel}>Join with code</Text>
          <TextInput
            style={styles.input}
            placeholder="ABCD1234"
            placeholderTextColor={colors.textPlaceholder}
            value={inviteCode}
            onChangeText={(text) => setInviteCode(formatInviteCode(text))}
            maxLength={8}
            autoCapitalize="characters"
            editable={!isSubmitting}
          />

          <Text style={styles.helperText}>
            Codes are not case-sensitive
          </Text>

          <TouchableOpacity
            style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleJoinViaCode}
            disabled={isSubmitting}
          >
            <Text style={styles.secondaryButtonText}>Use Invite Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.pagePadding,
    justifyContent: 'center',
    maxWidth: 420,
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
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.xl,
  },
  previewEyebrow: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  previewTitle: {
    ...typography.subheading,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  previewBody: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  previewCode: {
    ...typography.caption,
    color: colors.textPrimary,
    fontFamily: typography.monoFamily,
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  codeSection: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceHover,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: 3,
    fontFamily: typography.monoFamily,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  helperText: {
    color: colors.textLabel,
    ...typography.small,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.accentActive,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: colors.surfaceHover,
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
  secondaryButtonText: {
    color: colors.textPrimary,
    ...typography.subheading,
  },
});
