import { create } from 'zustand';
import {
  Group,
  GroupMember,
  GroupWithMembership,
  GroupMemberWithUser,
} from '@/types';
import {
  createGroup as createGroupService,
  joinGroup as joinGroupService,
  getUserGroups,
  getGroupMembers,
  getGroupDetails,
} from '@/services/groups';

interface GroupsState {
  groups: GroupWithMembership[];
  currentGroup: Group | null;
  currentGroupMembers: GroupMemberWithUser[];
  isLoading: boolean;
  error: string | null;

  fetchGroups: (_userId: string) => Promise<void>;
  fetchGroupDetails: (_groupId: string) => Promise<void>;
  fetchMembers: (_groupId: string) => Promise<void>;
  createGroup: (_name: string, _userId: string) => Promise<Group>;
  joinGroup: (_inviteCode: string, _userId: string) => Promise<{ group: Group; membership: GroupMember }>;
  setCurrentGroup: (_group: Group | null) => void;
  updateMemberStatus: (_userId: string, _status: 'rucked' | 'ricked' | null) => void;
  clearError: () => void;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  currentGroup: null,
  currentGroupMembers: [],
  isLoading: false,
  error: null,

  fetchGroups: async (userId: string) => {
    try {
      set({ isLoading: true, error: null });

      const rows = await getUserGroups(userId);

      const groupsWithDetails: GroupWithMembership[] = rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        invite_code: row.invite_code,
        created_by: row.created_by,
        created_at: row.created_at,
        is_active: row.is_active,
        settings: row.settings,
        metadata: row.metadata,
        membership: {
          id: row.membership_id,
          group_id: row.id,
          user_id: userId,
          joined_at: row.joined_at,
          is_admin: row.is_admin,
          notifications_enabled: row.notifications_enabled,
          current_status: row.current_status,
          status_updated_at: row.status_updated_at,
        } as GroupMember,
        member_count: parseInt(row.member_count) || 0,
        active_rucked_count: parseInt(row.active_rucked_count) || 0,
        active_ricked_count: parseInt(row.active_ricked_count) || 0,
      }));

      set({ groups: groupsWithDetails, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchGroupDetails: async (groupId: string) => {
    try {
      set({ isLoading: true, error: null });
      const data = await getGroupDetails(groupId);
      set({ currentGroup: data as Group, isLoading: false });
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
        currentGroupMembers: members as GroupMemberWithUser[],
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createGroup: async (name: string, userId: string) => {
    try {
      set({ isLoading: true, error: null });
      const group = await createGroupService(name, userId);
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

  setCurrentGroup: (group: Group | null) => {
    set({ currentGroup: group });
  },

  updateMemberStatus: (userId: string, status: 'rucked' | 'ricked' | null) => {
    const { currentGroupMembers } = get();
    const updatedMembers = currentGroupMembers.map(member => {
      if (member.user_id === userId) {
        return {
          ...member,
          current_status: status,
          status_updated_at: new Date().toISOString(),
        };
      }
      return member;
    });
    set({ currentGroupMembers: updatedMembers });
  },

  clearError: () => {
    set({ error: null });
  },
}));
