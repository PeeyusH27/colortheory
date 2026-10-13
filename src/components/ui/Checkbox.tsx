import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { palette } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { layout, spacing } from '@/theme/spacing';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: ReactNode;
  inverse?: boolean;
  disabled?: boolean;
}

/** Explicit opt-in control (used for cloud-processing consent). Never pre-checked by callers. */
export function Checkbox({ checked, onChange, label, description, inverse, disabled }: CheckboxProps) {
  const fg = inverse ? palette.cream : palette.navy;
  return (
    <PressableScale
      onPress={() => onChange(!checked)}
      disabled={disabled}
      haptic="selection"
      pressedScale={0.98}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      style={styles.row}>
      <View style={[styles.box, { borderColor: fg, backgroundColor: checked ? fg : 'transparent' }]}>
        {checked ? <Check size={16} color={inverse ? palette.navy : palette.cream} strokeWidth={3} /> : null}
      </View>
      <View style={styles.copy}>
        <Text variant="label" tone={inverse ? 'inverse' : 'primary'}>
          {label}
        </Text>
        {typeof description === 'string' ? (
          <Text variant="bodyS" tone={inverse ? 'inverseSecondary' : 'secondary'}>
            {description}
          </Text>
        ) : (
          description
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start', minHeight: layout.minTouchTarget, paddingVertical: spacing[1] },
  box: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  copy: { flex: 1, gap: 2 },
});
