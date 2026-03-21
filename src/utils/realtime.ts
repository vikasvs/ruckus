import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '@/services/supabase';
import { StatusEventWithUser } from '@/types';

export type StatusChangeCallback = (_payload: {
  userId: string;
  status: 'rucked' | 'ricked' | null;
  updatedAt: string;
}) => void;

export type ActivityCallback = (_payload: StatusEventWithUser) => void;

export function subscribeToGroupStatus(
  groupId: string,
  callback: StatusChangeCallback
): RealtimeChannel {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`group-status-${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'group_members',
        filter: `group_id=eq.${groupId}`,
      },
      async (payload) => {
        const { new: newRecord } = payload;
        if (newRecord) {
          callback({
            userId: newRecord.user_id,
            status: newRecord.current_status,
            updatedAt: newRecord.status_updated_at,
          });
        }
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToGroupActivity(
  groupId: string,
  callback: ActivityCallback
): RealtimeChannel {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`group-activity-${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'status_events',
        filter: `group_id=eq.${groupId}`,
      },
      async (payload) => {
        const { new: newRecord } = payload;
        if (newRecord) {
          // Fetch the user info for this event
          const { data: userData } = await supabase
            .from('users')
            .select('first_name')
            .eq('id', newRecord.user_id)
            .single();

          const activityItem: StatusEventWithUser = {
            id: newRecord.id,
            user_id: newRecord.user_id,
            group_id: newRecord.group_id,
            status_type: newRecord.status_type,
            created_at: newRecord.created_at,
            expires_at: newRecord.expires_at,
            previous_status: newRecord.previous_status,
            users: userData || undefined,
          };

          callback(activityItem);
        }
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToUserGroups(
  userId: string,
  onStatusChange: (_groupId: string, _status: 'rucked' | 'ricked' | null) => void
): RealtimeChannel {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`user-groups-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'group_members',
      },
      async (payload) => {
        const { new: newRecord } = payload;
        if (newRecord && newRecord.current_status) {
          onStatusChange(newRecord.group_id, newRecord.current_status);
        }
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribe(channel: RealtimeChannel): void {
  const supabase = getSupabase();
  supabase.removeChannel(channel);
}
