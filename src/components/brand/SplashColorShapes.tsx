import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { palette } from '@/theme/colors';
import { easings, springs } from '@/theme/motion';

import { Blob } from './Blob';

interface BlobSpec {
  seed: number;
  color: string;
  /** Diameter as a fraction of screen width. */
  size: number;
  /** Centre positions as fractions of the screen; start is usually off-screen ("splashing in"). */
  start: { x: number; y: number };
  end: { x: number; y: number };
  rotate: number;
  delay: number;
  /** Idle drift radius in points once the blob has landed. */
  drift: number;
}

/**
 * Composition: large cool blues anchor the corners, warm accents collide on the right, leaving a
 * calm band through the middle for the oversized wordmark.
 */
const BLOBS: BlobSpec[] = [
  { seed: 11, color: palette.denim, size: 1.05, start: { x: -0.7, y: 0.1 }, end: { x: 0.08, y: 0.16 }, rotate: 18, delay: 0, drift: 10 },
  { seed: 23, color: palette.petrol, size: 0.85, start: { x: 1.6, y: -0.1 }, end: { x: 0.92, y: 0.08 }, rotate: -24, delay: 70, drift: 8 },
  { seed: 37, color: palette.teal, size: 0.5, start: { x: 0.5, y: -0.5 }, end: { x: 0.52, y: 0.02 }, rotate: 40, delay: 160, drift: 6 },
  { seed: 41, color: palette.coral, size: 0.62, start: { x: 1.5, y: 0.62 }, end: { x: 0.94, y: 0.66 }, rotate: -12, delay: 120, drift: 12 },
  { seed: 53, color: palette.sky, size: 0.8, start: { x: -0.6, y: 0.95 }, end: { x: 0.06, y: 0.86 }, rotate: 30, delay: 90, drift: 9 },
  { seed: 67, color: palette.violet, size: 0.55, start: { x: 0.55, y: 1.5 }, end: { x: 0.6, y: 0.98 }, rotate: -30, delay: 210, drift: 7 },
  { seed: 71, color: palette.camel, size: 0.4, start: { x: 1.4, y: 1.1 }, end: { x: 0.98, y: 0.9 }, rotate: 22, delay: 260, drift: 6 },
  { seed: 83, color: palette.saffron, size: 0.2, start: { x: -0.3, y: 0.5 }, end: { x: 0.12, y: 0.62 }, rotate: 0, delay: 320, drift: 5 },
];

/** Paint droplets thrown off where blobs collide. Offsets in points from the impact point. */
const DROPLETS = [
  { x: 0.78, y: 0.56, dx: -46, dy: -38, size: 14, color: palette.coral },
  { x: 0.78, y: 0.56, dx: -70, dy: 12, size: 9, color: palette.coral },
  { x: 0.78, y: 0.56, dx: -28, dy: 52, size: 18, color: palette.blush },
  { x: 0.25, y: 0.3, dx: 54, dy: 34, size: 12, color: palette.sky },
  { x: 0.25, y: 0.3, dx: 80, dy: -6, size: 7, color: palette.mist },
  { x: 0.62, y: 0.16, dx: -30, dy: 60, size: 10, color: palette.teal },
  { x: 0.62, y: 0.16, dx: 30, dy: 78, size: 6, color: palette.saffron },
  { x: 0.3, y: 0.82, dx: 60, dy: -48, size: 16, color: palette.violet },
  { x: 0.3, y: 0.82, dx: 92, dy: -16, size: 8, color: palette.lilac },
  { x: 0.9, y: 0.86, dx: -54, dy: -30, size: 11, color: palette.camel },
];

function AnimatedBlob({ spec, width, height, reduced }: { spec: BlobSpec; width: number; height: number; reduced: boolean }) {
  const size = spec.size * width;
  const appear = useSharedValue(reduced ? 1 : 0);
  const float = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    appear.set(withDelay(spec.delay, withSpring(1, springs.splash)));
    float.set(withDelay(spec.delay + 600, withRepeat(withTiming(1, { duration: 5200, easing: Easing.linear }), -1, false)));
    return () => {
      cancelAnimation(appear);
      cancelAnimation(float);
    };
  }, [appear, float, reduced, spec.delay]);

  const dx = (spec.start.x - spec.end.x) * width;
  const dy = (spec.start.y - spec.end.y) * height;

  const style = useAnimatedStyle(() => {
    const t = appear.get();
    const angle = float.get() * Math.PI * 2;
    return {
      transform: [
        { translateX: dx * (1 - t) + Math.sin(angle) * spec.drift },
        { translateY: dy * (1 - t) + Math.cos(angle) * spec.drift * 0.6 },
        { scale: 0.35 + 0.65 * t },
        { rotate: `${spec.rotate * t - 30 * (1 - t)}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.abs,
        { width: size, height: size, left: spec.end.x * width - size / 2, top: spec.end.y * height - size / 2 },
        style,
      ]}>
      <Blob seed={spec.seed} color={spec.color} size={size} />
    </Animated.View>
  );
}

function Droplet({
  drop,
  index,
  width,
  height,
  reduced,
}: {
  drop: (typeof DROPLETS)[number];
  index: number;
  width: number;
  height: number;
  reduced: boolean;
}) {
  const t = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    t.set(withDelay(420 + index * 35, withTiming(1, { duration: 820, easing: easings.decelerate })));
    return () => cancelAnimation(t);
  }, [index, reduced, t]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.get() * 3),
    transform: [{ translateX: drop.dx * t.get() }, { translateY: drop.dy * t.get() }, { scale: 0.3 + 0.7 * t.get() }],
  }));

  return (
    <Animated.View
      style={[
        styles.abs,
        styles.drop,
        {
          width: drop.size,
          height: drop.size,
          borderRadius: drop.size / 2,
          backgroundColor: drop.color,
          left: drop.x * width - drop.size / 2,
          top: drop.y * height - drop.size / 2,
        },
        style,
      ]}
    />
  );
}

interface SplashColorShapesProps {
  /** 0 → 1 as the splash hands over to the next screen; blobs swell and soften. */
  exit?: SharedValue<number>;
}

/**
 * Procedural paint splash: organic SVG blobs that fly in from the edges, collide and drift.
 * Geometry is static; only transforms animate (on the UI thread), so it stays cheap on low-end
 * Android. With "Reduce Motion" on, the composition renders in its final state.
 */
export function SplashColorShapes({ exit }: SplashColorShapesProps) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();

  const exitStyle = useAnimatedStyle(() => {
    const e = exit ? exit.get() : 0;
    return { transform: [{ scale: 1 + e * 0.35 }], opacity: 1 - e * 0.4 };
  });

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, exitStyle]}>
      {BLOBS.map((spec) => (
        <AnimatedBlob key={spec.seed} spec={spec} width={width} height={height} reduced={reduced} />
      ))}
      <View style={StyleSheet.absoluteFill}>
        {DROPLETS.map((drop, i) => (
          <Droplet key={`${drop.x}-${drop.dx}`} drop={drop} index={i} width={width} height={height} reduced={reduced} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  drop: {},
});
