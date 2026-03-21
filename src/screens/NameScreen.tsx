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
import { getSupabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';

export default function NameScreen() {
  const [firstName, setFirstName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, fetchProfile } = useAuthStore();

  const handleContinue = async () => {
    if (!firstName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      setIsLoading(true);
      const supabase = getSupabase();

      const phone = user?.email?.replace('@ruckus.app', '') || '';

      const { error } = await supabase.from('users').insert({
        id: user!.id,
        phone,
        first_name: firstName.trim(),
      });

      if (error) {
        throw new Error(error.message);
      }

      await fetchProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>What should we call you?</Text>

        <TextInput
          style={styles.input}
          placeholder="First name"
          placeholderTextColor="#666"
          value={firstName}
          onChangeText={setFirstName}
          autoFocus
          autoCapitalize="words"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#1E1E1E',
    color: '#fff',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#FF4458',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
