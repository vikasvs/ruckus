import { BurstFeedItem, StatusFeedItem } from '@/types';
import { findActiveRuckus, orderRuckusFeed } from './ruckusFeed';

export const burst: BurstFeedItem = {
  type: 'burst', id: 'burst', group_id: 'crew', created_at: '2026-09-07T12:00:00Z',
  active_until: '2026-09-07T12:05:00Z', title: 'Crew is in a Ruckus', body: '',
  distinct_member_count: 2, share_url: '', share_text: '', reactions: [],
  streak: { current: 0, best: 0, at_risk: false, used_freeze_this_week: false, freeze_count: 0, last_burst_at: null },
};
const post: StatusFeedItem = {
  type: 'status', id: 'post', group_id: 'crew', created_at: '2026-09-07T12:01:00Z',
  user_id: 'user', first_name: 'Maya', status_type: 'ricked', reactions: [],
};

describe('Ruckus feed ordering', () => {
  it('pins an active burst above newer posts without duplication', () => {
    const active = findActiveRuckus([post, burst], Date.parse('2026-09-07T12:04:59Z'));
    expect(orderRuckusFeed([post, burst], active).map(i => i.id)).toEqual(['burst', 'post']);
  });
  it('returns the burst to chronological history at the quiet deadline', () => {
    const active = findActiveRuckus([burst, post], Date.parse(burst.active_until!));
    expect(active).toBeNull();
    expect(orderRuckusFeed([burst, post], active).map(i => i.id)).toEqual(['post', 'burst']);
  });
  it('uses the extended server deadline even when recent posts are off-page', () => {
    const extended = { ...burst, active_until: '2026-09-07T12:20:00Z' };
    expect(findActiveRuckus([extended], Date.parse('2026-09-07T12:15:00Z'))).toBe(extended);
  });
  it('does not revive ended or legacy bursts just because new posts arrive', () => {
    expect(findActiveRuckus([post, burst], Date.parse('2026-09-07T13:00:00Z'))).toBeNull();
    expect(findActiveRuckus([{ ...burst, active_until: undefined }], Date.parse(burst.created_at))).toBeNull();
  });
  it('selects only the newest active burst', () => {
    const newer = { ...burst, id: 'newer', created_at: '2026-09-07T12:02:00Z' };
    expect(findActiveRuckus([burst, newer], Date.parse('2026-09-07T12:03:00Z'))?.id).toBe('newer');
  });
});
