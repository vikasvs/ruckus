import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { GroupAnalytics, GroupWithMembership, StatusFeedItem } from '@/types';
import GroupAnalyticsTab, { AnalyticsContent } from './GroupAnalyticsTab';
import GroupCard from './GroupCard';
import ActivityFeedItem from './ActivityFeedItem';
import { getGroupAnalytics } from '@/services/status';

const { act, create } = require('react-test-renderer');
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { groupId: 'crew' } }),
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@/store/authStore', () => ({ useAuthStore: () => ({ user: { id: 'me' } }) }));
jest.mock('@/services/status', () => ({ getGroupAnalytics: jest.fn() }));

const sample = {
  window: 'week',
  group: { totalEvents: 6, totalRucked: 4, totalRicked: 2, totalRuckusBursts: 2, currentStreakWeeks: 8, freezeCount: 3 },
  me: { score: 999, badges: ['Fresh Meat'], favoriteStatus: 'rucked' },
  leaderboard: [{ firstName: 'Kas', score: 999 }],
  recaps: [{ title: 'Afterglow Archive' }],
  dailyActivity: [{ date: '2026-09-06', eventCount: 2, burstCount: 1 }, { date: '2026-09-07', eventCount: 4, burstCount: 1 }],
} as GroupAnalytics;

describe('plain activity UI', () => {
  let tree: any;
  const labels = () => tree.root.findAllByType(Text).map((node: any) => node.props.children).flat().join(' ');
  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
  afterEach(() => { act(() => tree?.unmount()); jest.useRealTimers(); });

  it('shows real counts and dated history without gamification', async () => {
    const onViewFeed = jest.fn();
    await act(async () => { tree = create(<AnalyticsContent analytics={sample} onViewFeed={onViewFeed} />); });
    const text = labels();
    expect(text).toContain('Posts 6 Ruckuses started 2 Rucked up 4 Ricked up 2');
    expect(text).toContain('Activity history Last 7 days');
    expect(text.indexOf('Sep 7')).toBeLessThan(text.indexOf('Sep 6'));
    expect(text).not.toMatch(/score|signature|afterglow|archive|points|badge|streak|rank|freeze|999/i);
    act(() => tree.root.findByType(TouchableOpacity).props.onPress());
    expect(onViewFeed).toHaveBeenCalledTimes(1);
  });

  it('handles empty periods honestly', async () => {
    const empty = { ...sample, group: { ...sample.group, totalEvents: 0, totalRucked: 0, totalRicked: 0, totalRuckusBursts: 0 } };
    await act(async () => { tree = create(<AnalyticsContent analytics={empty} onViewFeed={jest.fn()} />); });
    expect(labels()).toContain('No posts in this period yet.');
  });

  it('ignores an older response after the time filter changes', async () => {
    let resolveWeek!: (_value: GroupAnalytics) => void;
    jest.mocked(getGroupAnalytics).mockImplementation((_group, _user, window) => window === 'week'
      ? new Promise((resolve) => { resolveWeek = resolve; })
      : Promise.resolve({ ...sample, window: 'all', group: { ...sample.group, totalEvents: 12 } }));
    await act(async () => { tree = create(<GroupAnalyticsTab />); });
    await act(async () => { tree.root.findAllByType(TouchableOpacity)[2].props.onPress(); });
    expect(labels()).toContain('Posts 12');
    await act(async () => { resolveWeek(sample); });
    expect(labels()).toContain('Posts 12');
    expect(getGroupAnalytics).toHaveBeenCalledTimes(2);
  });

  it('allows retry after a network failure', async () => {
    jest.mocked(getGroupAnalytics).mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValue(sample);
    await act(async () => { tree = create(<GroupAnalyticsTab />); });
    expect(labels()).toContain('Network unavailable');
    await act(async () => { tree.root.findAllByType(TouchableOpacity)[3].props.onPress(); });
    expect(labels()).toContain('Posts 6');
    expect(labels()).not.toContain('Network unavailable');
  });

  it('removes legacy crew decoration and explains the notification threshold', async () => {
    const group = { name: 'Motor City Roo Crew', member_count: 4, settings: { identity: { emoji: '⚡', tagline: 'Signature mode' } }, streak: { current: 8, at_risk: true }, membership: { notification_mode: 'watch_threshold', watch_threshold: 3 } } as GroupWithMembership;
    await act(async () => { tree = create(<GroupCard group={group} onPress={jest.fn()} />); });
    expect(labels()).toContain('3+ people');
    expect(labels()).not.toMatch(/streak|signature|⚡|Watching/i);
  });

  it('keeps old reposts in history without Echo terminology', async () => {
    const item = { type: 'status', first_name: 'Kas', status_type: 'ricked', created_at: '2026-09-07T12:00:00Z', source_event: { first_name: 'Maya', status_type: 'ricked' } } as StatusFeedItem;
    await act(async () => { tree = create(<ActivityFeedItem item={item} />); });
    expect(labels()).toContain('is ricked up');
    expect(labels()).not.toMatch(/echo/i);
  });
});
