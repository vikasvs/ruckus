export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone: string;
          first_name: string;
          created_at: string;
          last_active: string;
          push_token: string | null;
          device_platform: string | null;
        };
        Insert: {
          id?: string;
          phone: string;
          first_name: string;
          created_at?: string;
          last_active?: string;
          push_token?: string | null;
          device_platform?: string | null;
        };
        Update: {
          id?: string;
          phone?: string;
          first_name?: string;
          created_at?: string;
          last_active?: string;
          push_token?: string | null;
          device_platform?: string | null;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_by: string;
          created_at: string;
          is_active: boolean;
          settings: any | null;
          metadata: any | null;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code: string;
          created_by: string;
          created_at?: string;
          is_active?: boolean;
          settings?: any | null;
          metadata?: any | null;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          created_by?: string;
          created_at?: string;
          is_active?: boolean;
          settings?: any | null;
          metadata?: any | null;
        };
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          joined_at: string;
          is_admin: boolean;
          notifications_enabled: boolean;
          current_status: 'rucked' | 'ricked' | null;
          status_updated_at: string | null;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          joined_at?: string;
          is_admin?: boolean;
          notifications_enabled?: boolean;
          current_status?: 'rucked' | 'ricked' | null;
          status_updated_at?: string | null;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          joined_at?: string;
          is_admin?: boolean;
          notifications_enabled?: boolean;
          current_status?: 'rucked' | 'ricked' | null;
          status_updated_at?: string | null;
        };
      };
      status_events: {
        Row: {
          id: string;
          user_id: string;
          group_id: string;
          status_type: 'rucked' | 'ricked';
          created_at: string;
          expires_at: string;
          previous_status: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          group_id: string;
          status_type: 'rucked' | 'ricked';
          created_at?: string;
          expires_at: string;
          previous_status?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          group_id?: string;
          status_type?: 'rucked' | 'ricked';
          created_at?: string;
          expires_at?: string;
          previous_status?: string | null;
        };
      };
      notification_logs: {
        Row: {
          id: string;
          group_id: string;
          triggered_by: string;
          status_type: 'rucked' | 'ricked';
          recipient_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          triggered_by: string;
          status_type: 'rucked' | 'ricked';
          recipient_count: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          triggered_by?: string;
          status_type?: 'rucked' | 'ricked';
          recipient_count?: number;
          created_at?: string;
        };
      };
    };
  };
}