import { api } from './api';
import {
  AnalyticsWindow,
  GroupAnalytics,
  GroupFeedItem,
  ReactionEmoji,
  RollCallResponse,
  StatusType,
  StatusEvent,
} from '@/types';

export const updateStatus = async (
  userId: string,
  groupId: string,
  statusType: StatusType,
  options?: {
    sourceEventId?: string | null;
    ritualInstanceId?: string | null;
  }
) => {
  return api.post<any>('/api/status', {
    userId,
    groupId,
    statusType,
    sourceEventId: options?.sourceEventId ?? null,
    ritualInstanceId: options?.ritualInstanceId ?? null,
  });
};

export const getGroupStatus = async (groupId: string) => {
  return api.get<any[]>(`/api/status/group/${groupId}`);
};

export const getRecentActivity = async (groupId: string, limit = 20) => {
  return api.get<any[]>(`/api/status/activity/${groupId}?limit=${limit}`);
};

export type MemberHistoryEvent = StatusEvent & { users: { first_name: string } };

export const getMemberHistory = (groupId: string, memberId: string, offset = 0) => (
  api.get<MemberHistoryEvent[]>(`/api/status/activity/${groupId}?userId=${encodeURIComponent(memberId)}&limit=30&offset=${offset}`)
);

export const getGroupFeed = async (groupId: string, userId: string, limit = 24) => {
  return api.get<GroupFeedItem[]>(`/api/status/feed/${groupId}/${userId}?limit=${limit}`);
};

export const reactToFeedItem = async (
  groupId: string,
  userId: string,
  targetType: 'status_event' | 'burst',
  targetId: string,
  emoji: ReactionEmoji | null
) => {
  return api.post<void>('/api/status/reactions', {
    groupId,
    userId,
    targetType,
    targetId,
    emoji,
  });
};

export const respondToRollCall = async (
  rollCallId: string,
  userId: string,
  response: RollCallResponse
) => {
  return api.post<void>(`/api/status/roll-call/${rollCallId}/respond`, {
    userId,
    response,
  });
};

export const checkCooldown = async (userId: string, groupId: string) => {
  const result = await api.get<{ remaining: number }>(`/api/status/cooldown/${userId}/${groupId}`);
  return result.remaining;
};

export const getGroupAnalytics = async (
  groupId: string,
  userId: string,
  window: AnalyticsWindow = 'week'
) => {
  return api.get<GroupAnalytics>(`/api/status/analytics/${groupId}/${userId}?window=${window}`);
};
