import { create } from 'zustand';
import {
  updateStatus as updateStatusService,
  getGroupStatus,
  getRecentActivity,
  checkCooldown as checkCooldownService,
} from '@/services/status';
import { StatusEventWithUser, GroupMemberWithUser } from '@/types';

interface StatusState {
  currentStatus: 'rucked' | 'ricked' | null;
  cooldownEndTime: number | null;
  cooldownRemaining: number;
  activeMembers: GroupMemberWithUser[];
  recentActivity: StatusEventWithUser[];
  isLoading: boolean;
  error: string | null;

  updateStatus: (_userId: string, _groupId: string, _statusType: 'rucked' | 'ricked') => Promise<void>;
  checkCooldown: (_userId: string, _groupId: string) => Promise<void>;
  fetchGroupStatus: (_groupId: string) => Promise<void>;
  fetchRecentActivity: (_groupId: string, _limit?: number) => Promise<void>;
  startCooldownTimer: () => void;
  stopCooldownTimer: () => void;
  setCooldownRemaining: (_seconds: number) => void;
  setCurrentStatus: (_status: 'rucked' | 'ricked' | null) => void;
  addActivityItem: (_item: StatusEventWithUser) => void;
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

  updateStatus: async (userId: string, groupId: string, statusType: 'rucked' | 'ricked') => {
    try {
      set({ isLoading: true, error: null });

      await updateStatusService(userId, groupId, statusType);

      // Set cooldown for 1 minute
      const cooldownEndTime = Date.now() + 60 * 1000;
      set({
        currentStatus: statusType,
        cooldownEndTime,
        cooldownRemaining: 60,
        isLoading: false,
      });

      // Start cooldown timer
      get().startCooldownTimer();

      // Refresh activity
      await get().fetchRecentActivity(groupId);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  checkCooldown: async (userId: string, groupId: string) => {
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

  fetchGroupStatus: async (groupId: string) => {
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

  fetchRecentActivity: async (groupId: string, limit = 20) => {
    try {
      set({ isLoading: true, error: null });

      const data = await getRecentActivity(groupId, limit);

      set({
        recentActivity: data as StatusEventWithUser[],
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  startCooldownTimer: () => {
    // Clear any existing timer
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

  setCooldownRemaining: (seconds: number) => {
    set({ cooldownRemaining: seconds });
  },

  setCurrentStatus: (status: 'rucked' | 'ricked' | null) => {
    set({ currentStatus: status });
  },

  addActivityItem: (item: StatusEventWithUser) => {
    const { recentActivity } = get();
    set({ recentActivity: [item, ...recentActivity].slice(0, 20) });
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
