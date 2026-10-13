import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { donutSegmentPath } from '@/utils/blob';

/** Six petals of the colour wheel, clockwise from 12 o'clock. Shared with the app icon. */
export const LOGO_SEGMENTS = ['#A7C7E7', '#4682B4', '#1F8A84', '#E8C9A0', '#FF6B4A', '#7A5AF0'] as const;

interface MarkProps {
  size?: number;
  /** Colour of the centre (matches the surface the mark sits on). */
  holeColor?: string;
  dotColor?: string;
}

/** The colour-wheel mark on its own. */
export function ColorWheelMark({ size = 40, holeColor = palette.ink, dotColor = palette.cream }: MarkProps) {
  const c = 50;
  const gap = 2.4;
  const step = 360 / LOGO_SEGMENTS.length;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no">
      {LOGO_SEGMENTS.map((color, i) => (
        <Path key={color} d={donutSegmentPath(c, c, 49, 27, i * step + gap / 2, (i + 1) * step - gap / 2)} fill={color} />
      ))}
      <Circle cx={c} cy={c} r={26} fill={holeColor} />
      <Circle cx={c} cy={c} r={7.5} fill={dotColor} />
    </Svg>
  );
}

interface LogoProps {
  variant?: 'full' | 'mark' | 'stacked';
  size?: 'sm' | 'md' | 'lg';
  inverse?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SIZES = { sm: { mark: 26, text: 20 }, md: { mark: 36, text: 26 }, lg: { mark: 72, text: 40 } } as const;

/**
 * ColorTheory logo: colour-wheel mark + wordmark set in Playfair Display, with "Theory" in italic.
 */
export function ColorTheoryLogo({ variant = 'full', size = 'md', inverse = false, style }: LogoProps) {
  const s = SIZES[size];
  const fg = inverse ? palette.cream : palette.navy;
  const mark = <ColorWheelMark size={s.mark} holeColor={inverse ? palette.ink : palette.cream} dotColor={inverse ? palette.cream : palette.navy} />;

  if (variant === 'mark') {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel="ColorTheory" style={style}>
        {mark}
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="ColorTheory"
      style={[variant === 'stacked' ? styles.stacked : styles.row, style]}>
      {mark}
      <View style={styles.wordmark}>
        <Text variant="h1" color={fg} allowFontScaling={false} style={{ fontSize: s.text, lineHeight: s.text * 1.15, letterSpacing: -0.4 }}>
          Color
        </Text>
        <Text
          variant="editorial"
          color={fg}
          allowFontScaling={false}
          style={{ fontSize: s.text, lineHeight: s.text * 1.15, letterSpacing: -0.4 }}>
          Theory
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  stacked: { alignItems: 'center', gap: spacing[3] },
  wordmark: { flexDirection: 'row', alignItems: 'baseline' },
});
