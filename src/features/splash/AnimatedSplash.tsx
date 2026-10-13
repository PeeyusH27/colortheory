import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ColorWheelMark } from '@/components/brand/ColorTheoryLogo';
import { SplashColorShapes } from '@/components/brand/SplashColorShapes';
import { GrainOverlay } from '@/components/ui/GrainOverlay';
import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/colors';
import { durations, easings, springs } from '@/theme/motion';
import { spacing } from '@/theme/spacing';

/** Timeline (ms from mount). Total stays under ~2.7s; tapping skips straight to the exit. */
const T = {
  color: 420,
  theory: 560,
  mark: 880,
  tagline: 1200,
  exit: 2080,
  exitDuration: 520,
} as const;

interface AnimatedSplashProps {
  /** Called once the cream reveal has covered the screen; navigate from here. */
  onFinish: () => void;
}

/**
 * Brand splash: paint blobs collide, the oversized wordmark rises out of a mask, the colour wheel
 * spins in, then a cream disc expands from the centre into the (cream) next screen so the
 * navigation hand-off is seamless.
 */
export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const colorWord = useSharedValue(reduced ? 1 : 0);
  const theoryWord = useSharedValue(reduced ? 1 : 0);
  const mark = useSharedValue(reduced ? 1 : 0);
  const tagline = useSharedValue(reduced ? 1 : 0);
  const exit = useSharedValue(0);
  const fadeIn = useSharedValue(reduced ? 0 : 1);

  const finished = useRef(false);
  const exiting = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onFinish();
  };

  const startExit = () => {
    if (exiting.current) return;
    exiting.current = true;
    timers.current.forEach(clearTimeout);
    exit.set(withTiming(1, { duration: reduced ? durations.base : T.exitDuration, easing: easings.decelerate }));
    timers.current = [setTimeout(finish, (reduced ? durations.base : T.exitDuration) + 40)];
  };

  useEffect(() => {
    if (reduced) {
      fadeIn.set(withTiming(1, { duration: durations.slow }));
      timers.current.push(setTimeout(startExit, durations.splashReduced));
    } else {
      const rise = { duration: durations.slower, easing: easings.editorial };
      colorWord.set(withDelay(T.color, withTiming(1, rise)));
      theoryWord.set(withDelay(T.theory, withTiming(1, rise)));
      mark.set(withDelay(T.mark, withSpring(1, springs.splash)));
      tagline.set(withDelay(T.tagline, withTiming(1, { duration: durations.slow, easing: easings.decelerate })));
      timers.current.push(setTimeout(startExit, T.exit));
    }
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
    // Runs once on mount; the timeline is fire-and-forget.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wordSize = Math.round(Math.min(width * 0.27, 150));
  const lineHeight = Math.round(wordSize * 1.02);

  const colorStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(colorWord.get(), [0, 1], [lineHeight, 0]) }],
  }));
  const theoryStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(theoryWord.get(), [0, 1], [lineHeight, 0]) }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, mark.get() * 1.5),
    transform: [{ rotate: `${interpolate(mark.get(), [0, 1], [-200, 0])}deg` }, { scale: interpolate(mark.get(), [0, 1], [0.3, 1]) }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.get(),
    transform: [{ translateY: interpolate(tagline.get(), [0, 1], [12, 0]) }],
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: fadeIn.get() * (1 - exit.get() * 0.6) }));

  // Cream disc large enough to cover the screen diagonal from the centre.
  const discSize = Math.ceil(Math.hypot(width, height)) + 8;
  const discStyle = useAnimatedStyle(() =>
    reduced
      ? { opacity: exit.get(), transform: [{ scale: 1 }] }
      : { opacity: 1, transform: [{ scale: exit.get() }] },
  );

  return (
    <Pressable
      style={styles.root}
      onPress={startExit}
      accessibilityRole="button"
      accessibilityLabel="ColorTheory. Discover the colors that are yours. Tap to continue."
      accessibilityHint="Skips the intro animation">
      <StatusBar style="light" />
      <SplashColorShapes exit={exit} />
      <GrainOverlay opacity={0.22} />

      <Animated.View
        style={[styles.content, { paddingTop: insets.top + spacing[6], paddingBottom: insets.bottom + spacing[8] }, contentStyle]}
        pointerEvents="none">
        <Animated.View style={[styles.markWrap, markStyle]}>
          <ColorWheelMark size={64} holeColor={palette.ink} dotColor={palette.cream} />
        </Animated.View>

        <View style={styles.wordmark}>
          <View style={[styles.mask, { height: lineHeight }]}>
            <Animated.View style={colorStyle}>
              <Text
                variant="displayXL"
                color={palette.cream}
                allowFontScaling={false}
                style={{ fontSize: wordSize, lineHeight, letterSpacing: -wordSize * 0.035 }}>
                Color
              </Text>
            </Animated.View>
          </View>
          <View style={[styles.mask, styles.theoryMask, { height: lineHeight + 8 }]}>
            <Animated.View style={theoryStyle}>
              <Text
                variant="editorial"
                color={palette.sky}
                allowFontScaling={false}
                style={{ fontSize: wordSize * 0.98, lineHeight: lineHeight + 8, letterSpacing: -wordSize * 0.03 }}>
                Theory
              </Text>
            </Animated.View>
          </View>
        </View>

        <Animated.View style={[styles.taglineWrap, taglineStyle]}>
          <View style={styles.rule} />
          <Text variant="editorial" color={palette.cream} style={styles.tagline}>
            Discover the colors that are yours.
          </Text>
        </Animated.View>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.disc,
          { width: discSize, height: discSize, borderRadius: discSize / 2, left: (width - discSize) / 2, top: (height - discSize) / 2 },
          discStyle,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink, overflow: 'hidden' },
  content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: spacing[5] },
  markWrap: { alignSelf: 'flex-start' },
  wordmark: { marginTop: -spacing[6] },
  mask: { overflow: 'hidden' },
  theoryMask: { alignSelf: 'flex-end', marginTop: -spacing[2] },
  taglineWrap: { gap: spacing[3] },
  rule: { width: 56, height: 3, backgroundColor: palette.coral },
  tagline: { fontSize: 22, lineHeight: 30, maxWidth: 280 },
  disc: { position: 'absolute', backgroundColor: palette.cream },
});
