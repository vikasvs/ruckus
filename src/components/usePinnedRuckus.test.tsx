import React from 'react';
import { AccessibilityInfo, Animated } from 'react-native';
import { BurstFeedItem, GroupFeedItem } from '@/types';
import { RUCKUS_FADE_MS, usePinnedRuckus } from './usePinnedRuckus';
import ActivityFeedItem from './ActivityFeedItem';

const { act, create } = require('react-test-renderer');
const start = Date.parse('2026-09-07T12:00:00Z');
const burst = {
  type: 'burst', id: 'burst', created_at: new Date(start).toISOString(),
  active_until: new Date(start + 300000).toISOString(),
  title: 'Crew is in a Ruckus', distinct_member_count: 2,
  reactions: [{ emoji: '🔥', count: 3, selected: true }],
} as BurstFeedItem;

describe('pinned Ruckus lifecycle', () => {
  let latest: ReturnType<typeof usePinnedRuckus>;
  let tree: any;
  function Probe({ items }: { items: GroupFeedItem[] }) { latest = usePinnedRuckus(items); return null; }
  beforeEach(() => {
    jest.useFakeTimers(); jest.setSystemTime(start);
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.spyOn(Animated, 'timing').mockImplementation((_value, config) => {
      let timer: ReturnType<typeof setTimeout>;
      return {
        start: (callback) => { timer = setTimeout(() => callback?.({ finished: true }), config.duration); },
        stop: () => clearTimeout(timer), reset: jest.fn(),
      };
    });
  });
  afterEach(() => { act(() => tree?.unmount()); jest.restoreAllMocks(); jest.useRealTimers(); });

  it('fades after five quiet minutes then releases the card to history', async () => {
    await act(async () => { tree = create(<Probe items={[burst]} />); });
    expect(latest!.pinned?.id).toBe('burst');
    act(() => jest.advanceTimersByTime(300000));
    expect(latest!.pinned?.id).toBe('burst');
    expect(Animated.timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: RUCKUS_FADE_MS }));
    act(() => jest.advanceTimersByTime(RUCKUS_FADE_MS));
    expect(latest!.pinned).toBeNull();
  });
  it('reschedules expiry when more posts extend the session', async () => {
    await act(async () => { tree = create(<Probe items={[burst]} />); });
    act(() => jest.advanceTimersByTime(240000));
    act(() => tree.update(<Probe items={[{ ...burst, active_until: new Date(start + 540000).toISOString() }]} />));
    act(() => jest.advanceTimersByTime(60000 + RUCKUS_FADE_MS));
    expect(latest!.pinned?.id).toBe('burst');
    act(() => jest.advanceTimersByTime(240000));
    act(() => jest.advanceTimersByTime(RUCKUS_FADE_MS));
    expect(latest!.pinned).toBeNull();
  });
  it('skips the animation with Reduce Motion', async () => {
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
    await act(async () => { tree = create(<Probe items={[burst]} />); });
    act(() => jest.advanceTimersByTime(300000));
    expect(latest!.pinned).toBeNull();
    expect(Animated.timing).not.toHaveBeenCalled();
  });
  it('renders no reaction controls or counts, including existing reactions', async () => {
    await act(async () => { tree = create(<ActivityFeedItem item={burst} />); });
    const content = JSON.stringify(tree.toJSON());
    expect(content).not.toContain('🔥');
    expect(content).not.toContain('reaction');
    expect(content).toContain('A RUCKUS HAPPENED');
  });
});
