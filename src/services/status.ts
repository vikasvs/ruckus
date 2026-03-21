import { getSupabase } from './supabase';

export const updateStatus = async (
  userId: string,
  groupId: string,
  statusType: 'rucked' | 'ricked'
) => {
  const supabase = getSupabase();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const { data: currentMember } = await supabase
    .from('group_members')
    .select('current_status')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .single();

  const { data: statusEvent, error: statusError } = await supabase
    .from('status_events')
    .insert({
      user_id: userId,
      group_id: groupId,
      status_type: statusType,
      expires_at: expiresAt.toISOString(),
      previous_status: currentMember?.current_status || null,
    })
    .select()
    .single();

  if (statusError) {
    throw new Error(statusError.message);
  }

  const { error: memberError } = await supabase
    .from('group_members')
    .update({
      current_status: statusType,
      status_updated_at: now.toISOString(),
    })
    .eq('user_id', userId)
    .eq('group_id', groupId);

  if (memberError) {
    throw new Error(memberError.message);
  }

  // Trigger push notifications via edge function
  try {
    await supabase.functions.invoke('send-status-notification', {
      body: { statusEventId: statusEvent.id },
    });
  } catch (notifError) {
    // Don't fail the status update if notifications fail
    console.error('Failed to send notifications:', notifError);
  }

  return statusEvent;
};

export const getGroupStatus = async (groupId: string) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      user_id,
      current_status,
      status_updated_at,
      users (first_name)
    `)
    .eq('group_id', groupId)
    .not('current_status', 'is', null);

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getRecentActivity = async (groupId: string, limit = 20) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('status_events')
    .select(`
      *,
      users (first_name)
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const checkCooldown = async (userId: string, groupId: string) => {
  const supabase = getSupabase();
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  
  const { data, error } = await supabase
    .from('status_events')
    .select('created_at')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .gte('created_at', oneMinuteAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  if (data) {
    const lastAction = new Date(data.created_at);
    const timeDiff = Date.now() - lastAction.getTime();
    const remainingCooldown = 60 * 1000 - timeDiff;
    
    if (remainingCooldown > 0) {
      return Math.ceil(remainingCooldown / 1000);
    }
  }

  return 0;
};
