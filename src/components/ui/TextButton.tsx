import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { layout, spacing } from '@/theme/spacing';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface TextButtonProps {
  label: string;
  onPress?: () => void;
  icon?: LucideIcon;
  color?: string;
  underline?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/** Low-emphasis inline action ("See all", "Skip", "Forgot password?"). Still a 44pt touch target. */
export function TextButton({
  label,
  onPress,
  icon: Icon,
  color = colors.text.primary,
  underline = false,
  disabled,
  style,
  accessibilityHint,
}: TextButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={[styles.base, style]}>
      <View style={styles.row}>
        <Text
          variant="label"
          color={disabled ? colors.text.tertiary : color}
          style={underline ? styles.underline : undefined}>
          {label}
        </Text>
        {Icon ? <Icon size={16} color={disabled ? colors.text.tertiary : color} strokeWidth={2.2} /> : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  underline: { textDecorationLine: 'underline' },
});
