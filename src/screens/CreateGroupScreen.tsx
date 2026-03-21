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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useGroupsStore } from '@/store/groupsStore';
import { colors, palette, radii, spacing, typography } from '@/theme';

type CreateGroupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateGroup'>;

export default function CreateGroupScreen() {
  const [groupName, setGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

      Alert.alert(
        'Group Created!',
        `Your invite code is: ${group.invite_code}\n\nShare this code with your friends to let them join.`,
        [
          {
            text: 'Copy Code',
            onPress: () => {
              Clipboard.setString(group.invite_code);
              navigation.navigate('Group', { groupId: group.id });
            },
          },
          {
            text: 'OK',
            onPress: () => navigation.navigate('Group', { groupId: group.id }),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
        />

        <Text style={styles.characterCount}>
          {groupName.length}/100 characters
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
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    fontSize: 16,
    padding: 15,
    borderRadius: radii.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  characterCount: {
    color: colors.textLabel,
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 30,
  },
  button: {
    backgroundColor: colors.accentActive,
    padding: 15,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '500',
  },
});
