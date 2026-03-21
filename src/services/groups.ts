import { getSupabase } from './supabase';

export const createGroup = async (name: string, userId: string) => {
  const supabase = getSupabase();
  const inviteCode = generateInviteCode();
  
  const { data, error } = await supabase
    .from('groups')
    .insert({
      name,
      invite_code: inviteCode,
      created_by: userId,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from('group_members')
    .insert({
      group_id: data.id,
      user_id: userId,
      is_admin: true,
      notifications_enabled: true,
    });

  return data;
};

export const joinGroup = async (inviteCode: string, userId: string) => {
  const supabase = getSupabase();
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', inviteCode.toUpperCase())
    .eq('is_active', true)
    .single();

  if (groupError || !group) {
    throw new Error('Invalid invite code');
  }

  const { data: existingMember } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .single();

  if (existingMember) {
    throw new Error('Already a member of this group');
  }

  const { data: memberCount } = await supabase
    .from('group_members')
    .select('id', { count: 'exact' })
    .eq('group_id', group.id);

  if (memberCount && memberCount.length >= 50) {
    throw new Error('Group is full (50 member limit)');
  }

  const { data, error } = await supabase
    .from('group_members')
    .insert({
      group_id: group.id,
      user_id: userId,
      is_admin: false,
      notifications_enabled: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { group, membership: data };
};

export const getUserGroups = async (userId: string) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      *,
      groups (*)
    `)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getGroupMembers = async (groupId: string) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      *,
      users (first_name)
    `)
    .eq('group_id', groupId);

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
