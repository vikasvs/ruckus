import { BurstFeedItem, GroupFeedItem } from '@/types';

export function findActiveRuckus(items: GroupFeedItem[], now: number): BurstFeedItem | null {
  return items.filter((item): item is BurstFeedItem => item.type === 'burst'
    && !!item.active_until && Date.parse(item.active_until) > now)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null;
}

export function orderRuckusFeed(items: GroupFeedItem[], pinned: BurstFeedItem | null): GroupFeedItem[] {
  const history = items.filter((item) => (item.type === 'status' || item.type === 'burst')
    && !(item.type === 'burst' && item.id === pinned?.id))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return pinned ? [pinned, ...history] : history;
}
