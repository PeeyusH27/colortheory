import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii } from '@/theme/radii';
import { layout, spacing } from '@/theme/spacing';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  icon?: LucideIcon;
  iconPosition?: 'leading' | 'trailing';
  loading?: boolean;
  disabled?: boolean;
  size?: 'lg' | 'md' | 'sm';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
}

interface ButtonAppearance {
  background: string;
  foreground: string;
  borderColor?: string;
  disabledBackground?: string;
  disabledForeground?: string;
}

const HEIGHTS = { lg: 56, md: 48, sm: layout.minTouchTarget } as const;

/** Shared layout/behaviour for Primary/Secondary buttons. Not exported from the UI barrel. */
export function ButtonBase({
  label,
  onPress,
  icon: Icon,
  iconPosition = 'trailing',
  loading = false,
  disabled = false,
  size = 'lg',
  fullWidth = false,
  style,
  accessibilityHint,
  testID,
  appearance,
}: ButtonProps & { appearance: ButtonAppearance }) {
  const inactive = disabled || loading;
  const background = inactive && appearance.disabledBackground ? appearance.disabledBackground : appearance.background;
  const foreground = inactive && appearance.disabledForeground ? appearance.disabledForeground : appearance.foreground;
  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      hitSlop={size === 'sm' ? 6 : 0}
      style={[
        styles.base,
        {
          minHeight: HEIGHTS[size],
          paddingHorizontal: size === 'sm' ? spacing[4] : spacing[6],
          backgroundColor: background,
          borderColor: appearance.borderColor ?? background,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} accessibilityLabel="Loading" />
      ) : (
        <View style={styles.content}>
          {Icon && iconPosition === 'leading' ? <Icon size={iconSize} color={foreground} strokeWidth={2} /> : null}
          <Text variant="label" color={foreground} numberOfLines={1} style={size === 'sm' ? styles.smallLabel : undefined}>
            {label}
          </Text>
          {Icon && iconPosition === 'trailing' ? <Icon size={iconSize} color={foreground} strokeWidth={2} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  smallLabel: {
    fontSize: 14,
  },
});
