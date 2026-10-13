import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { Text } from './Text';

interface DividerProps {
  /** Optional centred label, magazine-style ("— or —", "Nº 02"). */
  label?: string;
  tone?: 'subtle' | 'strong' | 'inverse';
  spacingY?: number;
  style?: StyleProp<ViewStyle>;
}

/** Editorial rule. `strong` is a 2pt ink line used under section titles, like the reference layout. */
export function Divider({ label, tone = 'subtle', spacingY = spacing[4], style }: DividerProps) {
  const color =
    tone === 'strong' ? colors.border.strong : tone === 'inverse' ? colors.border.inverse : colors.border.subtle;
  const thickness = tone === 'strong' ? 2 : StyleSheet.hairlineWidth;

  if (!label) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[{ height: thickness, backgroundColor: color, marginVertical: spacingY }, style]}
      />
    );
  }
  return (
    <View style={[styles.row, { marginVertical: spacingY }, style]}>
      <View style={[styles.line, { height: thickness, backgroundColor: color }]} />
      <Text variant="eyebrow" tone={tone === 'inverse' ? 'inverseSecondary' : 'secondary'}>
        {label}
      </Text>
      <View style={[styles.line, { height: thickness, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  line: { flex: 1 },
});
