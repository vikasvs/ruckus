import { api } from './api';
import {
  Group,
  GroupInviteLink,
  GroupJoinPreview,
  GroupMemberWithUser,
  GroupRitual,
  GroupWithMembership,
  NotificationMode,
} from '@/types';

export const createGroup = async (
  name: string,
  userId: string,
  timezone?: string
) => {
  return api.post<Group>('/api/groups', { name, userId, timezone });
};

export const joinGroup = async (inviteCode: string, userId: string) => {
  return api.post<{ group: Group; membership: GroupMemberWithUser }>('/api/groups/join', {
    inviteCode,
    userId,
  });
};

export const joinGroupByInviteLink = async (inviteToken: string, userId: string) => {
  return api.post<{ group: Group; membership: GroupMemberWithUser }>('/api/groups/join-link', {
    inviteToken,
    userId,
  });
};

export const getInvitePreview = async (inviteToken: string) => {
  return api.get<GroupJoinPreview>(`/api/groups/invite/${inviteToken}`);
};

export const getUserGroups = async (userId: string) => {
  return api.get<GroupWithMembership[]>(`/api/groups/user/${userId}`);
};

export const getGroupMembers = async (groupId: string) => {
  return api.get<GroupMemberWithUser[]>(`/api/groups/${groupId}/members`);
};

export const getGroupDetails = async (groupId: string) => {
  return api.get<GroupWithMembership>(`/api/groups/${groupId}`);
};

export const getGroupInvite = async (groupId: string) => {
  return api.get<{ invite_link: GroupInviteLink | null }>(`/api/groups/${groupId}/invite`);
};

export const regenerateGroupInvite = async (groupId: string) => {
  return api.post<{ invite_link: GroupInviteLink | null }>(`/api/groups/${groupId}/invite/regenerate`, {});
};

export const updateMemberNotifications = async (
  groupId: string,
  userId: string,
  {
    notificationMode,
    watchThreshold,
    watchTonight,
  }: {
    notificationMode?: NotificationMode;
    watchThreshold?: 2 | 3 | null;
    watchTonight?: boolean;
  }
) => {
  return api.patch<GroupMemberWithUser>(`/api/groups/${groupId}/members/${userId}`, {
    notification_mode: notificationMode,
    watch_threshold: watchThreshold,
    watch_tonight: watchTonight,
  });
};

export const updateGroupIdentity = async (
  groupId: string,
  payload: {
    name?: string;
    emoji?: string | null;
    cover_gradient?: string | null;
    tagline?: string | null;
    timezone?: string | null;
  }
) => {
  return api.patch<Group>(`/api/groups/${groupId}`, payload);
};

export const getGroupRituals = async (groupId: string) => {
  return api.get<GroupRitual[]>(`/api/groups/${groupId}/rituals`);
};

export const saveGroupRitual = async (
  groupId: string,
  payload: {
    ritualId?: string;
    userId: string;
    label: string;
    promptTemplate: string;
    dayOfWeek: number;
    timeOfDay: string;
    isActive?: boolean;
  }
) => {
  return api.post<GroupRitual>(`/api/groups/${groupId}/rituals`, {
    id: payload.ritualId,
    userId: payload.userId,
    label: payload.label,
    prompt_template: payload.promptTemplate,
    day_of_week: payload.dayOfWeek,
    time_of_day: payload.timeOfDay,
    is_active: payload.isActive,
  });
};
