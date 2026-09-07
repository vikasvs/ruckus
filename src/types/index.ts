export type StatusType = 'rucked' | 'ricked';
export type NotificationMode = 'all_activity' | 'ruckus_only' | 'watch_threshold' | 'muted';
export type ReactionEmoji = '⚡' | '🔥' | '🍻' | '🫡' | '💀';
export type RollCallResponse = 'pulling_up' | 'maybe' | 'dead';
export type AnalyticsWindow = 'week' | 'season' | 'all';

export interface User {
  id: string;
  phone: string;
  first_name: string;
  created_at: string;
  last_active: string;
  push_token?: string;
  device_platform?: string;
}

export interface GroupIdentity {
  emoji?: string | null;
  cover_gradient?: string | null;
  tagline?: string | null;
  timezone?: string | null;
}

export interface GroupSettings {
  identity?: GroupIdentity;
  streak_freezes_remaining?: number;
  last_streak_risk_week?: string | null;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
  settings?: GroupSettings | Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface GroupInviteLink {
  id?: string;
  group_id?: string;
  token: string;
  url: string;
  is_active: boolean;
  created_at: string;
}

export interface GroupStreakSummary {
  current: number;
  best: number;
  at_risk: boolean;
  used_freeze_this_week: boolean;
  freeze_count: number;
  last_burst_at: string | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  is_admin: boolean;
  notifications_enabled: boolean;
  notification_mode?: NotificationMode;
  watch_threshold?: 2 | 3 | null;
  watch_until?: string | null;
  current_status?: StatusType | null;
  status_updated_at?: string | null;
}

export interface StatusEvent {
  id: string;
  user_id: string;
  group_id: string;
  status_type: StatusType;
  created_at: string;
  expires_at: string;
  previous_status?: string | null;
  source_event_id?: string | null;
  ritual_instance_id?: string | null;
}

export interface NotificationLog {
  id: string;
  group_id: string;
  triggered_by: string;
  status_type: StatusType;
  recipient_count: number;
  created_at: string;
}

export interface ReactionSummary {
  emoji: ReactionEmoji;
  count: number;
  selected: boolean;
}

export interface FeedSourceEvent {
  id: string;
  first_name: string;
  status_type: StatusType;
}

export interface FeedRitualSummary {
  id: string;
  label: string;
  prompt_template: string;
}

export interface StatusFeedItem {
  type: 'status';
  id: string;
  created_at: string;
  group_id: string;
  user_id: string;
  first_name: string;
  status_type: StatusType;
  previous_status?: string | null;
  source_event?: FeedSourceEvent | null;
  ritual?: FeedRitualSummary | null;
  reactions: ReactionSummary[];
}

export interface BurstRollCallCounts {
  pulling_up: number;
  maybe: number;
  dead: number;
}

export interface RollCallFeedItem {
  type: 'rollcall';
  id: string;
  created_at: string;
  burst_id: string;
  group_id: string;
  ends_at: string;
  counts: BurstRollCallCounts;
  my_response: RollCallResponse | null;
}

export interface BurstFeedItem {
  type: 'burst';
  id: string;
  created_at: string;
  group_id: string;
  title: string;
  body: string;
  distinct_member_count: number;
  participant_names?: string[];
  active_until?: string;
  closer_first_name?: string | null;
  share_url: string;
  share_text: string;
  reactions: ReactionSummary[];
  streak: GroupStreakSummary;
  roll_call?: RollCallFeedItem | null;
}

export interface RitualFeedItem {
  type: 'ritual';
  id: string;
  created_at: string;
  group_id: string;
  ritual_id: string;
  label: string;
  prompt_template: string;
  scheduled_for: string;
  expires_at: string;
}

export interface RecapFeedItem {
  type: 'recap';
  id: string;
  created_at: string;
  group_id: string;
  burst_id: string;
  title: string;
  closer_first_name?: string | null;
  turnout_counts: BurstRollCallCounts;
  top_reaction?: ReactionEmoji | null;
  reaction_total: number;
  streak: GroupStreakSummary;
  photo_count: number;
  caption?: string | null;
  share_url: string;
  share_text: string;
}

export type GroupFeedItem =
  | StatusFeedItem
  | BurstFeedItem
  | RollCallFeedItem
  | RitualFeedItem
  | RecapFeedItem;

export interface GroupAnalyticsSummary {
  totalEvents: number;
  totalRucked: number;
  totalRicked: number;
  totalRuckusBursts: number;
  activeDays: number;
  sevenDayEventCount: number;
  averageBurstSize: number | null;
  fastestIgnitionMinutes: number | null;
  currentStreakWeeks: number;
  bestStreakWeeks: number;
  streakAtRisk: boolean;
  freezeCount: number;
}

export interface GroupAnalyticsDailyPoint {
  date: string;
  eventCount: number;
  burstCount: number;
}

export interface GroupAnalyticsMember {
  userId: string;
  firstName: string;
  totalEvents: number;
  ruckedCount: number;
  rickedCount: number;
  activeDays: number;
  currentStreakDays: number;
  longestStreakDays: number;
  ruckusCloses: number;
  score: number;
  rank: number;
  favoriteStatus: StatusType | 'balanced' | null;
  badges: string[];
}

export interface BurstRecapSummary {
  id: string;
  title: string;
  created_at: string;
  photo_count: number;
  caption?: string | null;
}

export interface GroupAnalytics {
  window: AnalyticsWindow;
  group: GroupAnalyticsSummary;
  me: GroupAnalyticsMember | null;
  leaderboard: GroupAnalyticsMember[];
  dailyActivity: GroupAnalyticsDailyPoint[];
  recaps: BurstRecapSummary[];
}

export interface GroupRitual {
  id: string;
  group_id: string;
  label: string;
  prompt_template: string;
  day_of_week: number;
  time_of_day: string;
  is_active: boolean;
  created_at: string;
}

export interface GroupRitualInstance {
  id: string;
  group_id: string;
  ritual_id: string;
  scheduled_for: string;
  expires_at: string;
  notified_at?: string | null;
}

export interface GroupWithMembership extends Group {
  membership?: GroupMember;
  member_count?: number;
  active_rucked_count?: number;
  active_ricked_count?: number;
  invite_link?: GroupInviteLink | null;
  streak?: GroupStreakSummary;
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

export interface GroupJoinPreview {
  group: Pick<Group, 'id' | 'name' | 'invite_code'> & {
    identity?: GroupIdentity;
  };
  member_count: number;
  active_rucked_count: number;
  active_ricked_count: number;
  invite_link: GroupInviteLink;
}

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  Group: { groupId: string; showInviteCode?: boolean };
  CreateGroup: undefined;
  JoinGroup: { inviteToken?: string } | undefined;
};

export type TabParamList = {
  Activity: { groupId: string };
  Members: { groupId: string };
  Analytics: { groupId: string };
};
