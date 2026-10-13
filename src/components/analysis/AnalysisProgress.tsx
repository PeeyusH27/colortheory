import { Image } from 'expo-image';
import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { STAGE_COPY } from '@/features/analysis/analysisStore';
import type { AnalysisStage } from '@/services/color-analysis';
import { palette } from '@/theme/colors';
import { durations } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { donutSegmentPath } from '@/utils/blob';

const RINGS = [
  { r: 1, inner: 0.84, colors: [palette.navy, palette.denim, palette.petrol, palette.teal, palette.steel, palette.sky, palette.indigo, palette.mist], duration: 16000, dir: 1 },
  { r: 0.8, inner: 0.66, colors: [palette.coral, palette.saffron, palette.camel, palette.blush, palette.violet, palette.lilac], duration: 11000, dir: -1 },
  { r: 0.62, inner: 0.52, colors: [palette.sage, palette.sky, palette.coral, palette.denim], duration: 8000, dir: 1 },
];

function Ring({ size, ring }: { size: number; ring: (typeof RINGS)[number] }) {
  const reduced = useReducedMotion();
  const spin = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    spin.set(withRepeat(withTiming(1, { duration: ring.duration, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(spin);
  }, [reduced, ring.duration, spin]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get() * 360 * ring.dir}deg` }] }));
  const c = size / 2;
  const step = 360 / ring.colors.length;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.center, style]}>
      <Svg width={size} height={size}>
        {ring.colors.map((color, i) => (
          <Path key={`${color}-${i}`} d={donutSegmentPath(c, c, c * ring.r, c * ring.inner, i * step + 1.5, (i + 1) * step - 1.5)} fill={color} />
        ))}
      </Svg>
    </Animated.View>
  );
}

const MARQUEE = [palette.navy, palette.coral, palette.sky, palette.petrol, palette.saffron, palette.denim, palette.blush, palette.teal, palette.violet, palette.camel];

/** Swatches drifting past — the "exploring palettes" motif. */
function SwatchMarquee() {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    x.set(withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(x);
  }, [reduced, x]);
  const chip = 26;
  const gap = 8;
  const loop = MARQUEE.length * (chip + gap);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -x.get() * loop }] }));
  return (
    <View style={styles.marquee} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.marqueeRow, { gap }, style]}>
        {[...MARQUEE, ...MARQUEE].map((c, i) => (
          <View key={i} style={{ width: chip, height: chip, backgroundColor: c, borderRadius: 2 }} />
        ))}
      </Animated.View>
    </View>
  );
}

interface AnalysisProgressProps {
  portraitUri: string | null;
  stages: AnalysisStage[];
  completed: AnalysisStage[];
  current: AnalysisStage | null;
  uploadProgress?: number;
  demo?: boolean;
  size?: number;
}

export function AnalysisProgress({ portraitUri, stages, completed, current, uploadProgress = 0, demo = false, size = 220 }: AnalysisProgressProps) {
  const done = completed.length;
  return (
    <View style={styles.root}>
      <View style={{ width: size, height: size }} accessible accessibilityRole="progressbar" accessibilityLabel={`Analysis step ${Math.min(done + 1, stages.length)} of ${stages.length}`}>
        {RINGS.map((ring) => (
          <Ring key={ring.duration} size={size} ring={ring} />
        ))}
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <View style={[styles.portrait, { width: size * 0.48, height: size * 0.48, borderRadius: size * 0.24 }]}>
            {portraitUri ? <Image source={{ uri: portraitUri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          </View>
        </View>
      </View>

      <SwatchMarquee />

      <View style={styles.list} accessibilityRole="list">
        {stages.map((stage) => {
          const isDone = completed.includes(stage);
          const isCurrent = current === stage && !isDone;
          const copy = STAGE_COPY[stage];
          return (
            <Animated.View
              key={stage}
              entering={FadeIn.duration(durations.base).reduceMotion(ReduceMotion.System)}
              style={[styles.stage, !isDone && !isCurrent && styles.pending]}
              accessible
              accessibilityLabel={`${copy.title}: ${isDone ? 'done' : isCurrent ? 'in progress' : 'waiting'}`}>
              <View style={[styles.marker, isDone && styles.markerDone, isCurrent && styles.markerCurrent]}>
                {isDone ? <Check size={12} color={palette.ink} strokeWidth={3} /> : null}
              </View>
              <View style={styles.stageCopy}>
                <Text variant="label" color={palette.cream}>
                  {demo ? `Demo · ${copy.title}` : copy.title}
                </Text>
                {isCurrent ? (
                  <Text variant="caption" color="rgba(247,243,236,0.7)">
                    {demo ? 'Simulated step — sample results, your photo is not analysed.' : copy.detail}
                  </Text>
                ) : null}
                {isCurrent && stage === 'uploading' ? (
                  <View style={styles.bar}>
                    <View style={[styles.barFill, { width: `${Math.round(uploadProgress * 100)}%` }]} />
                  </View>
                ) : null}
              </View>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: spacing[6] },
  center: { alignItems: 'center', justifyContent: 'center' },
  portrait: { overflow: 'hidden', backgroundColor: palette.navy, borderWidth: 3, borderColor: palette.cream },
  marquee: { width: '100%', height: 26, overflow: 'hidden' },
  marqueeRow: { flexDirection: 'row' },
  list: { alignSelf: 'stretch', gap: spacing[3] },
  stage: { flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' },
  pending: { opacity: 0.4 },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(247,243,236,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  markerDone: { backgroundColor: palette.sage, borderColor: palette.sage },
  markerCurrent: { borderColor: palette.coral, backgroundColor: 'rgba(255,107,74,0.25)' },
  stageCopy: { flex: 1, gap: 2 },
  bar: { height: 4, borderRadius: radii.pill, backgroundColor: 'rgba(247,243,236,0.18)', overflow: 'hidden', marginTop: spacing[1] },
  barFill: { height: 4, backgroundColor: palette.coral },
});
