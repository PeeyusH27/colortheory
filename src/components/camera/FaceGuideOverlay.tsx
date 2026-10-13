import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { FACE_GUIDE_OVAL } from '@/features/analysis/faceRegion';
import { palette } from '@/theme/colors';
import { durations, easings } from '@/theme/motion';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

/**
 * Darkened frame with an oval window for the face. The oval geometry is shared with the
 * on-device sampler (faceRegion.ts) so "fill the oval" means "fill the sampled region".
 */
export function FaceGuideOverlay({ active = true }: { active?: boolean }) {
  const { width, height } = useWindowDimensions();
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    if (!active) return;
    pulse.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: easings.editorial }),
          withTiming(0.55, { duration: 1100, easing: easings.editorial }),
        ),
        -1,
        false,
        undefined,
        ReduceMotion.System,
      ),
    );
    return () => cancelAnimation(pulse);
  }, [active, pulse]);

  const cx = width * FACE_GUIDE_OVAL.cx;
  const cy = height * FACE_GUIDE_OVAL.cy;
  const rx = width * FACE_GUIDE_OVAL.rx;
  const ry = height * FACE_GUIDE_OVAL.ry;

  // Outer rectangle + inner ellipse with even-odd fill = scrim with an oval hole.
  const scrim = `M0 0 H${width} V${height} H0 Z M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;

  const ringProps = useAnimatedProps(() => ({ strokeOpacity: pulse.get() }));

  return (
    <Animated.View
      entering={FadeIn.duration(durations.slow).delay(150).reduceMotion(ReduceMotion.System)}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height}>
        <Path d={scrim} fill="rgba(13, 22, 38, 0.58)" fillRule="evenodd" />
        <AnimatedEllipse cx={cx} cy={cy} rx={rx} ry={ry} stroke={palette.cream} strokeWidth={2.5} strokeDasharray="10 8" fill="none" animatedProps={ringProps} />
        <Ellipse cx={cx} cy={cy} rx={rx + 10} ry={ry + 10} stroke={palette.coral} strokeWidth={1.2} fill="none" opacity={0.7} />
      </Svg>
      <View style={[styles.tick, { left: cx - 1, top: cy - ry - 26 }]} />
      <View style={[styles.tick, { left: cx - 1, top: cy + ry + 12 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tick: { position: 'absolute', width: 2, height: 14, backgroundColor: palette.coral },
});
