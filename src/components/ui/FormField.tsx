import { Eye, EyeOff } from 'lucide-react-native';
import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { colors, palette } from '@/theme/colors';
import { shapes } from '@/theme/radii';
import { layout, spacing } from '@/theme/spacing';
import { fontFamilies, resolveFontFamily } from '@/theme/typography';

import { Text } from './Text';

export interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  helper?: string;
  /** Renders a show/hide toggle and keeps the value masked by default. */
  password?: boolean;
  ref?: Ref<TextInput>;
}

/** Presentational text field. Errors are announced and linked to the input for screen readers. */
export function FormField({ label, error, helper, password = false, ref, onFocus, onBlur, ...inputProps }: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const borderColor = error ? colors.status.error : focused ? colors.border.focus : colors.border.warm;

  return (
    <View style={styles.container}>
      <Text variant="eyebrow" tone="secondary" nativeID={`${label}-label`}>
        {label}
      </Text>
      <View style={[styles.inputWrap, { borderColor, borderWidth: focused || error ? 1.5 : 1 }]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityLabelledBy={`${label}-label`}
          accessibilityHint={error ?? helper}
          placeholderTextColor={colors.text.tertiary}
          secureTextEntry={password && !revealed}
          selectionColor={palette.denim}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, resolveFontFamily(fontFamilies.sansRegular)]}
          maxFontSizeMultiplier={1.5}
          {...inputProps}
        />
        {password ? (
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={8}
            style={styles.reveal}>
            {revealed ? <EyeOff size={20} color={colors.text.secondary} /> : <Eye size={20} color={colors.text.secondary} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="error" accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" tone="secondary">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

type ControlledFormFieldProps<T extends FieldValues> = Omit<FormFieldProps, 'value' | 'onChangeText' | 'error'> & {
  control: Control<T>;
  name: FieldPath<T>;
};

/** `FormField` bound to react-hook-form. Validation messages come from the Zod schema. */
export function ControlledFormField<T extends FieldValues>({ control, name, ...props }: ControlledFormFieldProps<T>) {
  const {
    field: { ref, value, onChange, onBlur },
    fieldState: { error },
  } = useController({ control, name });
  return (
    <FormField
      {...props}
      ref={ref}
      value={typeof value === 'string' ? value : ''}
      onChangeText={onChange}
      onBlur={onBlur}
      error={error?.message}
    />
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[2] },
  inputWrap: {
    ...shapes.input,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.paper,
    minHeight: layout.minTouchTarget + 8,
  },
  input: {
    flex: 1,
    fontSize: 16, // ≥16 prevents iOS zoom-on-focus on web and keeps inputs legible.
    color: colors.text.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  reveal: { paddingHorizontal: spacing[3], minHeight: layout.minTouchTarget, justifyContent: 'center' },
});
