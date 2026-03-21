import { api } from './api';

export const createGroup = async (name: string, userId: string) => {
  return api.post<any>('/api/groups', { name, userId });
};

export const joinGroup = async (inviteCode: string, userId: string) => {
  return api.post<any>('/api/groups/join', { inviteCode, userId });
};

export const getUserGroups = async (userId: string) => {
  return api.get<any[]>(`/api/groups/user/${userId}`);
};

export const getGroupMembers = async (groupId: string) => {
  return api.get<any[]>(`/api/groups/${groupId}/members`);
};

export const getGroupDetails = async (groupId: string) => {
  return api.get<any>(`/api/groups/${groupId}`);
};

export const updateMemberNotifications = async (
  groupId: string,
  userId: string,
  enabled: boolean
) => {
  return api.patch<any>(`/api/groups/${groupId}/members/${userId}`, {
    notifications_enabled: enabled,
  });
};
