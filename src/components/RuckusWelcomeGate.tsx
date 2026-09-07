import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, palette, spacing, typography } from '@/theme';
import { shouldOpenWelcome } from '@/utils/welcome';

const STICKERS = [
  { symbol: '⚡', x: 0.13, y: 0.31, rotate: '-14deg', size: 52 },
  { symbol: '🤡', x: 0.78, y: 0.25, rotate: '12deg', size: 58 },
  { symbol: '🍻', x: 0.50, y: 0.13, rotate: '-5deg', size: 52 },
  { symbol: '🪩', x: 0.28, y: 0.40, rotate: '9deg', size: 46 },
  { symbol: '🔥', x: 0.78, y: 0.41, rotate: '-10deg', size: 48 },
  { symbol: '📍', x: 0.52, y: 0.34, rotate: '6deg', size: 42 },
  { symbol: '😈', x: 0.29, y: 0.20, rotate: '-8deg', size: 38 },
  { symbol: '🥂', x: 0.68, y: 0.10, rotate: '11deg', size: 38 },
  { symbol: '🕺', x: 0.08, y: 0.16, rotate: '-11deg', size: 34 },
  { symbol: '🚕', x: 0.88, y: 0.15, rotate: '8deg', size: 34 },
  { symbol: '👀', x: 0.40, y: 0.27, rotate: '-4deg', size: 32 },
  { symbol: '💥', x: 0.61, y: 0.22, rotate: '9deg', size: 34 },
] as const;

interface RuckusWelcomeGateProps {
  children: ReactNode;
}

export default function RuckusWelcomeGate({ children }: RuckusWelcomeGateProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const xOffset = useRef(new Animated.Value(0)).current;
  const force = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const stickerMotion = useRef(STICKERS.map(() => new Animated.Value(0))).current;
  const progressRef = useRef(0);
  const dragStartProgress = useRef(0);
  const dragStartX = useRef(0);
  const openRef = useRef(false);
  const revealedRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLanded, setIsLanded] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const stageWidth = Math.min(width, 480);
  const sphereSize = Math.min(stageWidth * 1.22, 510);
  const buttonDiameter = 88 * (stageWidth / 402);
  const openScale = buttonDiameter / sphereSize;
  const travelDistance = height * 0.531;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  const hideOpenState = useCallback(() => {
    if (!revealedRef.current) return;
    revealedRef.current = false;
    setIsLanded(false);

    Animated.parallel([
      Animated.timing(reveal, {
        toValue: 0,
        duration: reduceMotion ? 100 : 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      ...[...stickerMotion].reverse().map((value, index) => Animated.timing(value, {
        toValue: 0,
        delay: reduceMotion ? 0 : index * 16,
        duration: reduceMotion ? 100 : 240,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      })),
    ]).start();
  }, [reduceMotion, reveal, stickerMotion]);

  const showOpenState = useCallback(() => {
    revealedRef.current = true;
    setIsLanded(true);
    Animated.timing(reveal, {
      toValue: 1,
      duration: reduceMotion ? 100 : 240,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: true,
    }).start();

    if (reduceMotion) {
      stickerMotion.forEach((value) => value.setValue(1));
      return;
    }

      Animated.stagger(
        18,
        stickerMotion.map((value) => Animated.timing(value, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }))
      ).start();
  }, [reduceMotion, reveal, stickerMotion]);

  const settle = useCallback((open: boolean) => {
    openRef.current = open;
    setIsOpen(open);
    if (open) showOpenState();
    else hideOpenState();

    Animated.timing(force, {
      toValue: 0,
      duration: reduceMotion ? 100 : 260,
      useNativeDriver: true,
    }).start();

    const positionAnimation = Animated.timing(progress, {
        toValue: open ? 1 : 0,
        duration: reduceMotion ? 100 : 420,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      });
    const horizontalAnimation = Animated.timing(xOffset, {
        toValue: 0,
        duration: reduceMotion ? 100 : 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });

    Animated.parallel([positionAnimation, horizontalAnimation]).start(({ finished }) => {
      if (!finished) return;
      progressRef.current = open ? 1 : 0;
    });
  }, [force, hideOpenState, progress, reduceMotion, showOpenState, xOffset]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => (
      !openRef.current && Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 0.7
    ),
    onPanResponderGrant: () => {
      progress.stopAnimation((value) => {
        progressRef.current = value;
        dragStartProgress.current = value;
      });
      xOffset.stopAnimation((value) => {
        dragStartX.current = value;
      });
    },
    onPanResponderMove: (_, gesture) => {
      const raw = dragStartProgress.current - gesture.dy / travelDistance;
      const next = raw < 0 ? raw * 0.25 : raw > 1 ? 1 + (raw - 1) * 0.25 : raw;
      const leash = 150 * (stageWidth / 402);
      const nextX = leash * Math.tanh((dragStartX.current + gesture.dx) / leash);

      progressRef.current = next;
      progress.setValue(next);
      xOffset.setValue(nextX);
      force.setValue(Math.min(1, Math.hypot(gesture.vx, gesture.vy) * 1000 / 650));
      if (revealedRef.current && next < 0.8) hideOpenState();
    },
    onPanResponderRelease: (_, gesture) => {
      const open = shouldOpenWelcome(
        gesture.dy,
        gesture.vy * 1000,
        travelDistance,
        dragStartProgress.current
      );
      settle(open);
    },
    onPanResponderTerminate: () => settle(openRef.current),
  }), [force, hideOpenState, progress, settle, stageWidth, travelDistance, xOffset]);

  const sphereScale = progress.interpolate({
    inputRange: [0, 1], outputRange: [1, openScale], extrapolate: 'clamp',
  });
  const sphereTranslateY = progress.interpolate({
    inputRange: [0, 1], outputRange: [0, -travelDistance], extrapolate: 'clamp',
  });
  const gateOpacity = progress.interpolate({
    inputRange: [0.08, 0.62], outputRange: [1, 0], extrapolate: 'clamp',
  });
  const hintOpacity = progress.interpolate({
    inputRange: [0.04, 0.3], outputRange: [1, 0], extrapolate: 'clamp',
  });
  const plusOpacity = progress.interpolate({
    inputRange: [0.72, 0.92], outputRange: [0, 1], extrapolate: 'clamp',
  });
  const contentTranslateY = reveal.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const refractionShift = xOffset.interpolate({
    inputRange: [-150, 150], outputRange: [-28, 28], extrapolate: 'clamp',
  });

  return (
    <View
      style={styles.container}
      accessibilityLabel={isLanded
        ? 'Welcome to Ruckus. Enter your first name to continue.'
        : 'Welcome to Ruckus. Pull the glass dome upward or tap it to continue.'}
      {...panResponder.panHandlers}
    >
      <LinearGradient
        colors={[palette.primary.base, '#FF8A4C', palette.primary.light, colors.pageBg]}
        locations={[0, 0.3, 0.66, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glow, styles.glowOrange]} />
      <View style={[styles.glow, styles.glowBlue]} />

      <Animated.View
        pointerEvents="none"
        style={[styles.wordmark, { top: insets.top + 60, opacity: gateOpacity }]}
      >
        <Image
          source={require('../../assets/ruckus-balloon-wordmark.png')}
          style={styles.wordmarkImage}
          resizeMode="contain"
          accessibilityLabel="Ruckus"
        />
      </Animated.View>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: reveal }]}>
        {STICKERS.map((sticker, index) => {
          const motion = stickerMotion[index];
          const finalLeft = width * sticker.x - sticker.size / 2;
          const finalTop = insets.top + height * sticker.y;
          const birthLeft = width / 2 - sticker.size / 2;
          const birthTop = height * 0.469 - sticker.size / 2;
          const translateX = motion.interpolate({
            inputRange: [0, 1], outputRange: [birthLeft - finalLeft, 0],
          });
          const translateY = motion.interpolate({
            inputRange: [0, 1], outputRange: [birthTop - finalTop, 0],
          });
          const scale = motion.interpolate({
            inputRange: [0, 0.45, 1], outputRange: [0.16, 0.64, 1],
          });
          const opacity = motion.interpolate({
            inputRange: [0, 0.12, 1], outputRange: [0, 1, 1],
          });
          return (
            <Animated.View
              key={`${sticker.symbol}-${index}`}
              style={[
                styles.sticker,
                {
                  left: finalLeft,
                  top: finalTop,
                  width: sticker.size,
                  height: sticker.size,
                  opacity,
                  transform: [
                    { translateX }, { translateY }, { scale }, { rotate: sticker.rotate },
                  ],
                },
              ]}
            >
              <Text style={[styles.stickerText, { fontSize: sticker.size * 0.53 }]}>{sticker.symbol}</Text>
            </Animated.View>
          );
        })}
      </Animated.View>

      <Animated.View
        style={[
          styles.spherePosition,
          {
            width: sphereSize,
            height: sphereSize,
            left: (width - sphereSize) / 2,
            bottom: -sphereSize / 2,
            transform: [
              { translateX: xOffset }, { translateY: sphereTranslateY }, { scale: sphereScale },
            ],
          },
        ]}
      >
        <Pressable
          style={styles.sphere}
          onPress={() => settle(!openRef.current)}
          accessibilityRole="button"
          accessibilityLabel={isOpen ? 'Close welcome' : 'Open welcome'}
          accessibilityHint={isOpen ? 'Returns to the start screen' : 'Launches the welcome animation'}
        >
          <BlurView intensity={72} tint="light" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(255,255,255,0.90)', 'rgba(255,255,255,0.26)', 'rgba(59,130,246,0.25)']}
            locations={[0.03, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sphereRim} />
          <Animated.View style={[styles.sphereHighlight, { opacity: force }]} />
          <Animated.View style={[
            styles.sphereRefractionOne,
            { transform: [{ translateX: refractionShift }, { rotate: '-12deg' }] },
          ]} />
          <Animated.View style={[
            styles.sphereRefractionTwo,
            { transform: [{ translateX: refractionShift }, { rotate: '14deg' }] },
          ]} />
          <Animated.View pointerEvents="none" style={[styles.pullPrompt, { opacity: hintOpacity }]}>
            <View style={styles.pullArrowCircle}><Text style={styles.pullArrow}>↑</Text></View>
            <Text style={styles.pullTitle}>Start a ruckus</Text>
          </Animated.View>
          <Animated.Text pointerEvents="none" style={[styles.plus, { opacity: plusOpacity }]}>+</Animated.Text>
        </Pressable>
      </Animated.View>

      <Animated.View
        pointerEvents={isLanded ? 'auto' : 'none'}
        style={[
          styles.openContent,
          {
            bottom: insets.bottom + spacing.lg,
            opacity: reveal,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        <Text style={styles.headline}>Start a ruckus</Text>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: palette.primary.light },
  glow: { position: 'absolute', borderRadius: 999, opacity: 0.32 },
  glowOrange: {
    width: 280, height: 280, right: -100, top: 120, backgroundColor: palette.primary.hover,
  },
  glowBlue: {
    width: 240,
    height: 240,
    left: -120,
    bottom: 100,
    backgroundColor: palette.status.ricked.base,
    opacity: 0.12,
  },
  wordmark: {
    position: 'absolute',
    left: spacing.pagePadding,
    right: spacing.pagePadding,
    alignItems: 'center',
  },
  wordmarkImage: { width: '100%', height: 112 },
  sticker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.90)',
    backgroundColor: 'rgba(255,255,255,0.88)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  stickerText: { textAlign: 'center' },
  spherePosition: { position: 'absolute' },
  sphere: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.92)',
    shadowColor: palette.status.ricked.base,
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.32,
    shadowRadius: 30,
    elevation: 10,
  },
  sphereRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 9,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  sphereHighlight: {
    position: 'absolute',
    width: '64%',
    height: '18%',
    top: '2%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.78)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.9,
    shadowRadius: 24,
  },
  sphereRefractionOne: {
    position: 'absolute',
    width: '74%',
    height: '15%',
    top: '30%',
    left: '-18%',
    borderRadius: 48,
    backgroundColor: 'rgba(255,92,0,0.18)',
  },
  sphereRefractionTwo: {
    position: 'absolute',
    width: '70%',
    height: '12%',
    top: '20%',
    right: '-22%',
    borderRadius: 48,
    backgroundColor: 'rgba(59,130,246,0.16)',
  },
  pullPrompt: { position: 'absolute', top: '16%', alignItems: 'center' },
  pullArrowCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: colors.charcoalBg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  pullArrow: { color: colors.textInverse, fontSize: 29, lineHeight: 32, fontWeight: '500' },
  pullTitle: { ...typography.subheading, fontSize: 21, fontWeight: '600', color: colors.textPrimary, letterSpacing: -0.6 },
  plus: {
    position: 'absolute',
    color: colors.textPrimary,
    fontSize: 104,
    lineHeight: 112,
    fontWeight: '300',
  },
  openContent: { position: 'absolute', left: spacing.pagePadding, right: spacing.pagePadding },
  headline: {
    ...typography.heading,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
