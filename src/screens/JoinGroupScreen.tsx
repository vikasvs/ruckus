import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
  const { user } = useAuthStore();
  const { joinGroup } = useGroupsStore();

  const formatInviteCode = (text: string) => {
    const cleaned = text.replace(/[^A-Za-z0-9]/g, '');
    return cleaned.substring(0, 8).toUpperCase();
  };

  const handleJoinGroup = async () => {
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

      Alert.alert('Success', `You've joined ${group.name}!`, [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Group', { groupId: group.id }),
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Join a Group</Text>
        <Text style={styles.subtitle}>
          Enter the 8-character invite code from your friend
        </Text>

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
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleJoinGroup}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.buttonText}>Join Group</Text>
          )}
        </TouchableOpacity>
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
});
