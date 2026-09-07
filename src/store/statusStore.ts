import { create } from 'zustand';
import {
  checkCooldown as checkCooldownService,
  getGroupFeed,
  getGroupStatus,
  reactToFeedItem as reactToFeedItemService,
  respondToRollCall as respondToRollCallService,
  updateStatus as updateStatusService,
} from '@/services/status';
import {
  GroupFeedItem,
  GroupMemberWithUser,
  ReactionEmoji,
  RollCallResponse,
  StatusType,
} from '@/types';

interface StatusState {
  currentStatus: StatusType | null;
  cooldownEndTime: number | null;
  cooldownRemaining: number;
  activeMembers: GroupMemberWithUser[];
  recentActivity: GroupFeedItem[];
  isLoading: boolean;
  error: string | null;

  updateStatus: (
    _userId: string,
    _groupId: string,
    _statusType: StatusType,
    _options?: {
      sourceEventId?: string | null;
      ritualInstanceId?: string | null;
    }
  ) => Promise<void>;
  checkCooldown: (_userId: string, _groupId: string) => Promise<void>;
  fetchGroupStatus: (_groupId: string) => Promise<void>;
  fetchRecentActivity: (_groupId: string, _userId: string, _limit?: number) => Promise<void>;
  reactToFeedItem: (
    _groupId: string,
    _userId: string,
    _targetType: 'status_event' | 'burst',
    _targetId: string,
    _emoji: ReactionEmoji | null
  ) => Promise<void>;
  respondToRollCall: (
    _rollCallId: string,
    _userId: string,
    _response: RollCallResponse
  ) => Promise<void>;
  startCooldownTimer: () => void;
  stopCooldownTimer: () => void;
  setCooldownRemaining: (_seconds: number) => void;
  setCurrentStatus: (_status: StatusType | null) => void;
  clearError: () => void;
  reset: () => void;
}

let cooldownInterval: ReturnType<typeof setInterval> | null = null;

export const useStatusStore = create<StatusState>((set, get) => ({
  currentStatus: null,
  cooldownEndTime: null,
  cooldownRemaining: 0,
  activeMembers: [],
  recentActivity: [],
  isLoading: false,
  error: null,

  updateStatus: async (userId, groupId, statusType, options) => {
    try {
      set({ isLoading: true, error: null });
      await updateStatusService(userId, groupId, statusType, options);

      const cooldownEndTime = Date.now() + 60 * 1000;
      set({
        currentStatus: statusType,
        cooldownEndTime,
        cooldownRemaining: 60,
        isLoading: false,
      });

      get().startCooldownTimer();
      await get().fetchRecentActivity(groupId, userId);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  checkCooldown: async (userId, groupId) => {
    try {
      const remaining = await checkCooldownService(userId, groupId);

      if (remaining > 0) {
        const cooldownEndTime = Date.now() + remaining * 1000;
        set({ cooldownEndTime, cooldownRemaining: remaining });
        get().startCooldownTimer();
      } else {
        set({ cooldownEndTime: null, cooldownRemaining: 0 });
      }
    } catch (error: any) {
      console.error('Error checking cooldown:', error);
    }
  },

  fetchGroupStatus: async (groupId) => {
    try {
      set({ isLoading: true, error: null });
      const data = await getGroupStatus(groupId);
      set({
        activeMembers: data as unknown as GroupMemberWithUser[],
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchRecentActivity: async (groupId, userId, limit = 24) => {
    try {
      set({ isLoading: true, error: null });
      const data = await getGroupFeed(groupId, userId, limit);
      set({
        recentActivity: data.filter((item) => item.type !== 'ritual'),
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  reactToFeedItem: async (groupId, userId, targetType, targetId, emoji) => {
    try {
      await reactToFeedItemService(groupId, userId, targetType, targetId, emoji);
      set((state) => ({
        recentActivity: state.recentActivity.map((item) => {
          if (
            (targetType === 'status_event' && item.type === 'status' && item.id === targetId) ||
            (targetType === 'burst' && item.type === 'burst' && item.id === targetId)
          ) {
            const existing = item.reactions.find((reaction) => reaction.selected);
            const withoutSelection = item.reactions.map((reaction) => ({
              ...reaction,
              selected: false,
            }));

            let nextReactions = withoutSelection;
            if (existing?.emoji === emoji || emoji == null) {
              nextReactions = withoutSelection
                .map((reaction) => (
                  reaction.emoji === existing?.emoji
                    ? { ...reaction, count: Math.max(0, reaction.count - 1) }
                    : reaction
                ))
                .filter((reaction) => reaction.count > 0);
            } else {
              nextReactions = withoutSelection
                .map((reaction) => {
                  if (reaction.emoji === existing?.emoji) {
                    return { ...reaction, count: Math.max(0, reaction.count - 1) };
                  }
                  if (reaction.emoji === emoji) {
                    return { ...reaction, count: reaction.count + 1, selected: true };
                  }
                  return reaction;
                })
                .filter((reaction) => reaction.count > 0);

              if (!nextReactions.some((reaction) => reaction.emoji === emoji)) {
                nextReactions = [...nextReactions, { emoji, count: 1, selected: true }];
              }
            }

            return { ...item, reactions: nextReactions };
          }

          return item;
        }),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  respondToRollCall: async (rollCallId, userId, response) => {
    try {
      await respondToRollCallService(rollCallId, userId, response);
      set((state) => ({
        recentActivity: state.recentActivity.map((item) => {
          if (item.type === 'burst' && item.roll_call?.id === rollCallId) {
            const previous = item.roll_call.my_response;
            const counts = { ...item.roll_call.counts };

            if (previous) {
              counts[previous] = Math.max(0, counts[previous] - 1);
            }

            counts[response] += 1;

            return {
              ...item,
              roll_call: {
                ...item.roll_call,
                my_response: response,
                counts,
              },
            };
          }

          return item;
        }),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  startCooldownTimer: () => {
    if (cooldownInterval) {
      clearInterval(cooldownInterval);
    }

    cooldownInterval = setInterval(() => {
      const { cooldownEndTime } = get();

      if (!cooldownEndTime) {
        get().stopCooldownTimer();
        return;
      }

      const remaining = Math.max(0, Math.ceil((cooldownEndTime - Date.now()) / 1000));

      if (remaining <= 0) {
        set({ cooldownRemaining: 0, cooldownEndTime: null });
        get().stopCooldownTimer();
      } else {
        set({ cooldownRemaining: remaining });
      }
    }, 1000);
  },

  stopCooldownTimer: () => {
    if (cooldownInterval) {
      clearInterval(cooldownInterval);
      cooldownInterval = null;
    }
  },

  setCooldownRemaining: (seconds) => {
    set({ cooldownRemaining: seconds });
  },

  setCurrentStatus: (status) => {
    set({ currentStatus: status });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    get().stopCooldownTimer();
    set({
      currentStatus: null,
      cooldownEndTime: null,
      cooldownRemaining: 0,
      activeMembers: [],
      recentActivity: [],
      isLoading: false,
      error: null,
    });
  },
}));
