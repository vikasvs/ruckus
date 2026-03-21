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
          placeholderTextColor="#666"
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
            <ActivityIndicator color="#fff" />
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
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#fff',
    fontSize: 16,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  characterCount: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
