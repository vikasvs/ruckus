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
          placeholderTextColor="#666"
          value={inviteCode}
          onChangeText={(text) => setInviteCode(formatInviteCode(text))}
          maxLength={8}
          autoCapitalize="characters"
          editable={!isSubmitting}
        />

        <Text style={styles.helperText}>
          Codes are not case-sensitive and can contain letters and numbers
        </Text>

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleJoinGroup}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
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
    fontSize: 18,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  helperText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#2196F3',
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
