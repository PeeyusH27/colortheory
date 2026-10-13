import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { colors, palette } from '@/theme/colors';
import { layout, spacing } from '@/theme/spacing';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Right-aligned text value (e.g. "12 saved"). */
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  /** Renders a native switch instead of a chevron. */
  toggle?: { value: boolean; onChange: (value: boolean) => void; disabled?: boolean };
  trailing?: ReactNode;
  disabled?: boolean;
  last?: boolean;
}

/** Settings/profile row. Switch rows expose `switch` semantics; tappable rows expose `button`. */
export function ListRow({ title, subtitle, icon: Icon, value, onPress, destructive, toggle, trailing, disabled, last }: ListRowProps) {
  const tint = destructive ? colors.status.error : colors.text.primary;
  const content = (
    <>
      {Icon ? (
        <View style={[styles.iconWrap, destructive && styles.iconWrapDestructive]}>
          <Icon size={18} color={tint} strokeWidth={2} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text variant="label" color={tint}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodyS" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="bodyS" tone="secondary">
          {value}
        </Text>
      ) : null}
      {trailing}
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          disabled={toggle.disabled || disabled}
          trackColor={{ false: palette.linen, true: palette.denim }}
          thumbColor={palette.paper}
          ios_backgroundColor={palette.linen}
          accessibilityLabel={title}
          accessibilityHint={subtitle}
        />
      ) : onPress ? (
        <ChevronRight size={18} color={colors.text.tertiary} />
      ) : null}
    </>
  );

  const rowStyle = [styles.row, !last && styles.separator, disabled && styles.disabled];

  if (onPress && !toggle) {
    return (
      <PressableScale
        onPress={onPress}
        disabled={disabled}
        pressedScale={0.985}
        accessibilityRole="button"
        accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
        accessibilityState={{ disabled }}
        style={rowStyle}>
        {content}
      </PressableScale>
    );
  }
  return <View style={rowStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: layout.minTouchTarget + 12,
    paddingVertical: spacing[3],
  },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.warm },
  disabled: { opacity: 0.5 },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.sand,
  },
  iconWrapDestructive: { backgroundColor: colors.status.errorSoft },
  copy: { flex: 1, gap: 2 },
});
