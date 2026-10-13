import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '@/theme/colors';
import { durations, easings } from '@/theme/motion';
import { spacing } from '@/theme/spacing';

import { Text } from './Text';

const DOT_COLORS = [palette.denim, palette.teal, palette.coral];

function Dot({ color, index }: { color: string; index: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withDelay(
        index * 140,
        withRepeat(
          withSequence(
            withTiming(1, { duration: durations.slow, easing: easings.editorial }),
            withTiming(0, { duration: durations.slow, easing: easings.editorial }),
          ),
          -1,
          false,
          undefined,
          ReduceMotion.System,
        ),
      ),
    );
    return () => cancelAnimation(progress);
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -8 * progress.get() }, { scale: 0.85 + 0.15 * progress.get() }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

/** Three bouncing swatches — the app's loading motif. Use `fullScreen` for route-level loading. */
export function LoadingState({
  label,
  fullScreen = false,
  inverse = false,
  style,
}: {
  label?: string;
  fullScreen?: boolean;
  inverse?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
      style={[styles.container, fullScreen && styles.fullScreen, style]}>
      <View style={styles.row}>
        {DOT_COLORS.map((c, i) => (
          <Dot key={c} color={c} index={i} />
        ))}
      </View>
      {label ? (
        <Text variant="bodyS" tone={inverse ? 'inverseSecondary' : 'secondary'} align="center">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: spacing[4], padding: spacing[6] },
  fullScreen: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing[2], height: 28, alignItems: 'flex-end' },
  dot: { width: 14, height: 14, borderRadius: 2 },
});
