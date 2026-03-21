export interface User {
  id: string;
  phone: string;
  first_name: string;
  created_at: string;
  last_active: string;
  push_token?: string;
  device_platform?: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
  settings?: any;
  metadata?: any;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  is_admin: boolean;
  notifications_enabled: boolean;
  current_status?: 'rucked' | 'ricked' | null;
  status_updated_at?: string;
}

export interface StatusEvent {
  id: string;
  user_id: string;
  group_id: string;
  status_type: 'rucked' | 'ricked';
  created_at: string;
  expires_at: string;
  previous_status?: string;
}

export interface NotificationLog {
  id: string;
  group_id: string;
  triggered_by: string;
  status_type: 'rucked' | 'ricked';
  recipient_count: number;
  created_at: string;
}

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  Group: { groupId: string; showInviteCode?: boolean };
  CreateGroup: undefined;
  JoinGroup: undefined;
};

export type TabParamList = {
  Activity: { groupId: string };
  Members: { groupId: string };
};

// Extended types with relationships
export interface GroupWithMembership extends Group {
  membership?: GroupMember;
  member_count?: number;
  active_rucked_count?: number;
  active_ricked_count?: number;
}

export interface GroupMemberWithUser extends GroupMember {
  users?: {
    first_name: string;
  };
}

export interface StatusEventWithUser extends StatusEvent {
  users?: {
    first_name: string;
  };
}
