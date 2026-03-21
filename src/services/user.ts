import { api } from './api';
import { User } from '@/types';
import { Platform } from 'react-native';

export const createUser = async (firstName: string, phone?: string): Promise<User> => {
  return api.post<User>('/api/users', { first_name: firstName, phone });
};

export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    return await api.get<User>(`/api/users/${userId}`);
  } catch {
    return null;
  }
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<Pick<User, 'first_name' | 'push_token' | 'device_platform'>>
): Promise<User> => {
  return api.patch<User>(`/api/users/${userId}`, updates);
};

export const savePushToken = async (userId: string, token: string): Promise<void> => {
  await api.patch(`/api/users/${userId}`, {
    push_token: token,
    device_platform: Platform.OS,
  });
};

export const updateLastActive = async (userId: string): Promise<void> => {
  await api.patch(`/api/users/${userId}`, {});
};
