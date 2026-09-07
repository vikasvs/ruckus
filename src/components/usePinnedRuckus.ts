import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState } from 'react-native';
import { BurstFeedItem, GroupFeedItem } from '@/types';
import { findActiveRuckus } from '@/utils/ruckusFeed';

export const RUCKUS_FADE_MS = 350;

export function usePinnedRuckus(items: GroupFeedItem[]) {
  const [now, setNow] = useState(Date.now);
  const active = findActiveRuckus(items, now);
  const [pinned, setPinned] = useState<BurstFeedItem | null>(active);
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => { mounted = false; motion.remove(); foreground.remove(); };
  }, []);

  useEffect(() => {
    setNow(Date.now());
    if (!active?.active_until) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, Date.parse(active.active_until) - Date.now()));
    return () => clearTimeout(timer);
  }, [active?.id, active?.active_until]);

  useEffect(() => {
    if (active) {
      opacity.stopAnimation();
      opacity.setValue(1);
      setPinned(active);
      return;
    }
    if (!pinned) return;
    if (reduceMotion) { setPinned(null); return; }
    const fade = Animated.timing(opacity, { toValue: 0, duration: RUCKUS_FADE_MS, useNativeDriver: true });
    fade.start(({ finished }) => { if (finished) setPinned(null); });
    return () => fade.stop();
  }, [active, pinned, opacity, reduceMotion]);

  return { pinned, opacity };
}
