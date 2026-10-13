import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { ControlledFormField } from '@/components/ui/FormField';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Text } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { AuthScaffold } from '@/features/auth/AuthScaffold';
import { signUpWithEmail } from '@/features/auth/authService';
import { passwordStrength, signUpSchema, type SignUpValues } from '@/features/auth/schemas';
import { haptics } from '@/lib/haptics';
import { colors, palette } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { toAppError } from '@/utils/errors';

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'] as const;
const STRENGTH_COLORS = [palette.linen, colors.status.error, palette.saffron, palette.steel, colors.status.success];

function StrengthMeter({ password }: { password: string }) {
  const score = passwordStrength(password);
  return (
    <View style={styles.meter} accessible accessibilityLabel={`Password strength: ${STRENGTH_LABELS[score]}`}>
      <View style={styles.meterBars}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.meterBar, { backgroundColor: i <= score ? STRENGTH_COLORS[score] : palette.linen }]} />
        ))}
      </View>
      <Text variant="caption" tone="secondary">
        {password ? STRENGTH_LABELS[score] : 'At least 8 characters, with a letter and a number'}
      </Text>
    </View>
  );
}

export default function SignUpScreen() {
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  });
  const password = useWatch({ control, name: 'password' });

  const onSubmit = handleSubmit(async ({ displayName, email, password: pw }) => {
    setFormError(null);
    try {
      const { needsVerification } = await signUpWithEmail({ displayName, email, password: pw });
      haptics.success();
      if (needsVerification) router.replace({ pathname: '/verify-email', params: { email } });
      // Otherwise the session is live and the auth guard moves us into the app.
    } catch (error) {
      haptics.error();
      setFormError(toAppError(error).message);
    }
  });

  return (
    <AuthScaffold eyebrow="Create account" title="Start your colour story" accent={palette.coral}>
      {formError ? <InlineAlert tone="error" message={formError} /> : null}
      <ControlledFormField control={control} name="displayName" label="Name" placeholder="What should we call you?" autoComplete="name" textContentType="name" returnKeyType="next" />
      <ControlledFormField
        control={control}
        name="email"
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <View style={styles.passwordGroup}>
        <ControlledFormField control={control} name="password" label="Password" password autoComplete="new-password" textContentType="newPassword" returnKeyType="next" />
        <StrengthMeter password={password ?? ''} />
      </View>
      <ControlledFormField
        control={control}
        name="confirmPassword"
        label="Confirm password"
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      <Text variant="caption" tone="secondary">
        We’ll email you a link to confirm your address. Your portraits stay on this device unless you choose cloud storage.
      </Text>
      <PrimaryButton label="Create account" onPress={onSubmit} loading={formState.isSubmitting} fullWidth />
      <View style={styles.switch}>
        <Text variant="bodyS" tone="secondary">
          Already have an account?
        </Text>
        <TextButton label="Sign in" onPress={() => router.replace('/sign-in')} underline />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  passwordGroup: { gap: spacing[2] },
  meter: { gap: spacing[1] },
  meterBars: { flexDirection: 'row', gap: 4 },
  meterBar: { flex: 1, height: 4, borderRadius: radii.pill },
  switch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
});
