import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { ControlledFormField } from '@/components/ui/FormField';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { AuthScaffold } from '@/features/auth/AuthScaffold';
import { sendPasswordReset } from '@/features/auth/authService';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schemas';
import { palette } from '@/theme/colors';
import { toAppError } from '@/utils/errors';

export default function ForgotPasswordScreen() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await sendPasswordReset(email);
      setSentTo(email);
    } catch (error) {
      setFormError(toAppError(error).message);
    }
  });

  return (
    <AuthScaffold
      eyebrow="Password reset"
      title="Forgot your password?"
      deck="We’ll send a secure link to set a new one."
      accent={palette.lilac}>
      {sentTo ? (
        <>
          <InlineAlert
            tone="success"
            title="Check your inbox"
            message={`If an account exists for ${sentTo}, a reset link is on its way. Open it on this device to choose a new password.`}
          />
          <SecondaryButton label="Back to sign in" onPress={() => router.replace('/sign-in')} fullWidth />
        </>
      ) : (
        <>
          {formError ? <InlineAlert tone="error" message={formError} /> : null}
          <ControlledFormField
            control={control}
            name="email"
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={onSubmit}
          />
          <PrimaryButton label="Send reset link" onPress={onSubmit} loading={formState.isSubmitting} fullWidth />
        </>
      )}
    </AuthScaffold>
  );
}
