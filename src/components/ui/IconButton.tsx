import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, palette } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { layout } from '@/theme/spacing';

import { PressableScale } from './PressableScale';

export interface IconButtonProps {
  icon: LucideIcon;
  /** Required: icon-only controls must be named for screen readers. */
  accessibilityLabel: string;
  onPress?: () => void;
  variant?: 'plain' | 'filled' | 'outline' | 'glass' | 'inverse';
  size?: number;
  iconSize?: number;
  color?: string;
  disabled?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}

const VARIANTS = {
  plain: { backgroundColor: 'transparent', borderColor: 'transparent', color: colors.text.primary },
  filled: { backgroundColor: palette.navy, borderColor: palette.navy, color: palette.cream },
  outline: { backgroundColor: 'transparent', borderColor: colors.border.strong, color: colors.text.primary },
  // Over the camera feed / photography: a dark translucent disc so the icon reads on any image.
  glass: { backgroundColor: colors.surface.cameraChrome, borderColor: 'rgba(247,243,236,0.18)', color: palette.cream },
  inverse: { backgroundColor: palette.cream, borderColor: palette.cream, color: palette.navy },
} as const;

export function IconButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
  variant = 'plain',
  size = layout.minTouchTarget,
  iconSize = 20,
  color,
  disabled,
  selected,
  style,
  accessibilityHint,
  testID,
}: IconButtonProps) {
  const v = VARIANTS[variant];
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      hitSlop={size < layout.minTouchTarget ? (layout.minTouchTarget - size) / 2 : 0}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          backgroundColor: v.backgroundColor,
          borderColor: v.borderColor,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      <Icon size={iconSize} color={color ?? v.color} strokeWidth={2} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
