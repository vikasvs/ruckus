import { create } from 'zustand';
import {
  Group,
  GroupInviteLink,
  GroupJoinPreview,
  GroupMemberWithUser,
  GroupRitual,
  GroupWithMembership,
  NotificationMode,
} from '@/types';
import {
  createGroup as createGroupService,
  getGroupDetails,
  getGroupInvite,
  getGroupMembers,
  getGroupRituals,
  getInvitePreview,
  getUserGroups,
  joinGroup as joinGroupService,
  joinGroupByInviteLink as joinGroupByInviteLinkService,
  regenerateGroupInvite,
  saveGroupRitual as saveGroupRitualService,
  updateGroupIdentity as updateGroupIdentityService,
  updateMemberNotifications as updateMemberNotificationsService,
} from '@/services/groups';

interface GroupsState {
  groups: GroupWithMembership[];
  currentGroup: GroupWithMembership | null;
  currentGroupMembers: GroupMemberWithUser[];
  currentInvitePreview: GroupJoinPreview | null;
  currentRituals: GroupRitual[];
  isLoading: boolean;
  error: string | null;

  fetchGroups: (_userId: string) => Promise<void>;
  fetchGroupDetails: (_groupId: string) => Promise<void>;
  fetchMembers: (_groupId: string) => Promise<void>;
  fetchInvitePreview: (_inviteToken: string) => Promise<GroupJoinPreview>;
  fetchRituals: (_groupId: string) => Promise<void>;
  createGroup: (_name: string, _userId: string) => Promise<Group>;
  joinGroup: (_inviteCode: string, _userId: string) => Promise<{ group: Group; membership: GroupMemberWithUser }>;
  joinGroupByInviteLink: (_inviteToken: string, _userId: string) => Promise<{ group: Group; membership: GroupMemberWithUser }>;
  refreshInviteLink: (_groupId: string) => Promise<GroupInviteLink | null>;
  regenerateInviteLink: (_groupId: string) => Promise<GroupInviteLink | null>;
  updateMemberNotifications: (
    _groupId: string,
    _userId: string,
    _payload: {
      notificationMode?: NotificationMode;
      watchThreshold?: 2 | 3 | null;
      watchTonight?: boolean;
    }
  ) => Promise<void>;
  updateGroupIdentity: (
    _groupId: string,
    _payload: {
      name?: string;
      emoji?: string | null;
      cover_gradient?: string | null;
      tagline?: string | null;
      timezone?: string | null;
    }
  ) => Promise<void>;
  saveRitual: (
    _groupId: string,
    _payload: {
      ritualId?: string;
      userId: string;
      label: string;
      promptTemplate: string;
      dayOfWeek: number;
      timeOfDay: string;
      isActive?: boolean;
    }
  ) => Promise<void>;
  setCurrentGroup: (_group: GroupWithMembership | null) => void;
  updateMemberStatus: (_userId: string, _status: 'rucked' | 'ricked' | null) => void;
  clearInvitePreview: () => void;
  clearError: () => void;
}

function normalizeGroup(row: any, userId?: string): GroupWithMembership {
  return {
    id: row.id,
    name: row.name,
    invite_code: row.invite_code,
    created_by: row.created_by,
    created_at: row.created_at,
    is_active: row.is_active,
    settings: row.settings,
    metadata: row.metadata,
    invite_link: row.invite_link ?? null,
    streak: row.streak,
    membership: row.membership ?? (
      row.membership_id
        ? {
          id: row.membership_id,
          group_id: row.id,
          user_id: userId ?? row.user_id,
          joined_at: row.joined_at,
          is_admin: row.is_admin,
          notifications_enabled: row.notifications_enabled,
          notification_mode: row.notification_mode,
          watch_threshold: row.watch_threshold,
          watch_until: row.watch_until,
          current_status: row.current_status,
          status_updated_at: row.status_updated_at,
        }
        : undefined
    ),
    member_count: Number.parseInt(`${row.member_count ?? 0}`, 10) || 0,
    active_rucked_count: Number.parseInt(`${row.active_rucked_count ?? 0}`, 10) || 0,
    active_ricked_count: Number.parseInt(`${row.active_ricked_count ?? 0}`, 10) || 0,
  };
}

function currentTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  currentGroup: null,
  currentGroupMembers: [],
  currentInvitePreview: null,
  currentRituals: [],
  isLoading: false,
  error: null,

  fetchGroups: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const rows = await getUserGroups(userId);
      set({
        groups: rows.map((row) => normalizeGroup(row, userId)),
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchGroupDetails: async (groupId: string) => {
    try {
      set({ isLoading: true, error: null });
      const data = await getGroupDetails(groupId);
      set({
        currentGroup: normalizeGroup(data),
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchMembers: async (groupId: string) => {
    try {
      set({ isLoading: true, error: null });
      const members = await getGroupMembers(groupId);
      set({
        currentGroupMembers: members,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchInvitePreview: async (inviteToken: string) => {
    try {
      set({ isLoading: true, error: null });
      const preview = await getInvitePreview(inviteToken);
      set({ currentInvitePreview: preview, isLoading: false });
      return preview;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchRituals: async (groupId: string) => {
    try {
      const rituals = await getGroupRituals(groupId);
      set({ currentRituals: rituals });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  createGroup: async (name: string, userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const group = await createGroupService(name, userId, currentTimeZone());
      await get().fetchGroups(userId);
      set({ isLoading: false });
      return group;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  joinGroup: async (inviteCode: string, userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const result = await joinGroupService(inviteCode, userId);
      await get().fetchGroups(userId);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  joinGroupByInviteLink: async (inviteToken: string, userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const result = await joinGroupByInviteLinkService(inviteToken, userId);
      await get().fetchGroups(userId);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  refreshInviteLink: async (groupId: string) => {
    try {
      const result = await getGroupInvite(groupId);
      set((state) => ({
        currentGroup: state.currentGroup
          ? { ...state.currentGroup, invite_link: result.invite_link ?? null }
          : state.currentGroup,
      }));
      return result.invite_link ?? null;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  regenerateInviteLink: async (groupId: string) => {
    try {
      const result = await regenerateGroupInvite(groupId);
      set((state) => ({
        currentGroup: state.currentGroup
          ? { ...state.currentGroup, invite_link: result.invite_link ?? null }
          : state.currentGroup,
      }));
      return result.invite_link ?? null;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateMemberNotifications: async (groupId, userId, payload) => {
    try {
      const updatedMember = await updateMemberNotificationsService(groupId, userId, payload);
      set((state) => ({
        groups: state.groups.map((group) => (
          group.id === groupId && group.membership
            ? { ...group, membership: { ...group.membership, ...updatedMember } }
            : group
        )),
        currentGroupMembers: state.currentGroupMembers.map((member) => (
          member.user_id === userId ? { ...member, ...updatedMember } : member
        )),
        currentGroup: state.currentGroup?.id === groupId && state.currentGroup.membership
          ? {
            ...state.currentGroup,
            membership: {
              ...state.currentGroup.membership,
              ...updatedMember,
            },
          }
          : state.currentGroup,
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateGroupIdentity: async (groupId, payload) => {
    try {
      const updated = await updateGroupIdentityService(groupId, payload);
      set((state) => ({
        groups: state.groups.map((group) => (
          group.id === groupId ? { ...group, ...updated } : group
        )),
        currentGroup: state.currentGroup?.id === groupId
          ? { ...state.currentGroup, ...updated }
          : state.currentGroup,
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  saveRitual: async (groupId, payload) => {
    try {
      await saveGroupRitualService(groupId, payload);
      await get().fetchRituals(groupId);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  setCurrentGroup: (group) => {
    set({ currentGroup: group });
  },

  updateMemberStatus: (userId: string, status: 'rucked' | 'ricked' | null) => {
    set((state) => ({
      currentGroupMembers: state.currentGroupMembers.map((member) => (
        member.user_id === userId
          ? {
            ...member,
            current_status: status,
            status_updated_at: new Date().toISOString(),
          }
          : member
      )),
    }));
  },

  clearInvitePreview: () => {
    set({ currentInvitePreview: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));
