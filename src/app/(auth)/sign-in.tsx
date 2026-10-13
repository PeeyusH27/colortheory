import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { ControlledFormField } from '@/components/ui/FormField';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Text } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { AuthScaffold } from '@/features/auth/AuthScaffold';
import { signInWithEmail } from '@/features/auth/authService';
import { signInSchema, type SignInValues } from '@/features/auth/schemas';
import { haptics } from '@/lib/haptics';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { toAppError } from '@/utils/errors';

export default function SignInScreen() {
  const [formError, setFormError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const { control, handleSubmit, getValues, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    setNeedsConfirmation(false);
    try {
      await signInWithEmail(email, password);
      haptics.success();
      // No navigation: the auth guard swaps route groups as soon as the session lands.
    } catch (error) {
      haptics.error();
      const appError = toAppError(error);
      setFormError(appError.message);
      setNeedsConfirmation(/confirm your email/i.test(appError.message));
    }
  });

  return (
    <AuthScaffold eyebrow="Welcome back" title="Sign in" deck="Pick up where your palette left off." accent={palette.sky}>
      {formError ? (
        <InlineAlert
          tone="error"
          message={formError}
          action={
            needsConfirmation ? (
              <TextButton label="Resend confirmation email" onPress={() => router.push({ pathname: '/verify-email', params: { email: getValues('email') } })} />
            ) : undefined
          }
        />
      ) : null}
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
      <ControlledFormField
        control={control}
        name="password"
        label="Password"
        password
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      <View style={styles.forgot}>
        <TextButton label="Forgot password?" onPress={() => router.push('/forgot-password')} color={palette.denim} />
      </View>
      <PrimaryButton label="Sign in" onPress={onSubmit} loading={formState.isSubmitting} fullWidth />
      <View style={styles.switch}>
        <Text variant="bodyS" tone="secondary">
          New to ColorTheory?
        </Text>
        <TextButton label="Create an account" onPress={() => router.replace('/sign-up')} underline />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  forgot: { alignItems: 'flex-end', marginTop: -spacing[3] },
  switch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
});
