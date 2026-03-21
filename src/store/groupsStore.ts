import { create } from 'zustand';
import { getSupabase } from '@/services/supabase';
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
      const supabase = getSupabase();

      const memberships = await getUserGroups(userId);

      const groupsWithDetails: GroupWithMembership[] = await Promise.all(
        memberships.map(async (membership: any) => {
          const group = membership.groups as Group;

          // Get member counts and active status counts
          const { data: members } = await supabase
            .from('group_members')
            .select('current_status')
            .eq('group_id', group.id);

          const member_count = members?.length || 0;
          const active_rucked_count = members?.filter(m => m.current_status === 'rucked').length || 0;
          const active_ricked_count = members?.filter(m => m.current_status === 'ricked').length || 0;

          return {
            ...group,
            membership: membership as GroupMember,
            member_count,
            active_rucked_count,
            active_ricked_count,
          };
        })
      );

      set({ groups: groupsWithDetails, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchGroupDetails: async (groupId: string) => {
    try {
      set({ isLoading: true, error: null });
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error) throw error;

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

      // Refresh groups list
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

      // Refresh groups list
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
