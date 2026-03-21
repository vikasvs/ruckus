import { getSupabase } from './supabase';
import { User } from '@/types';
import { Platform } from 'react-native';

export const getUserProfile = async (userId: string): Promise<User | null> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(error.message);
  }

  return data as User;
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<Pick<User, 'first_name' | 'push_token' | 'device_platform'>>
): Promise<User> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      last_active: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as User;
};

export const savePushToken = async (userId: string, token: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('users')
    .update({
      push_token: token,
      device_platform: Platform.OS,
      last_active: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }
};

export const updateLastActive = async (userId: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('users')
    .update({
      last_active: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }
};
