import { api } from './api';

export const updateStatus = async (
  userId: string,
  groupId: string,
  statusType: 'rucked' | 'ricked'
) => {
  return api.post<any>('/api/status', { userId, groupId, statusType });
};

export const getGroupStatus = async (groupId: string) => {
  return api.get<any[]>(`/api/status/group/${groupId}`);
};

export const getRecentActivity = async (groupId: string, limit = 20) => {
  return api.get<any[]>(`/api/status/activity/${groupId}?limit=${limit}`);
};

export const checkCooldown = async (userId: string, groupId: string) => {
  const result = await api.get<{ remaining: number }>(`/api/status/cooldown/${userId}/${groupId}`);
  return result.remaining;
};
