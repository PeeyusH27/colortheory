import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { ErrorState } from '@/components/ui/ErrorState';
import { ControlledFormField } from '@/components/ui/FormField';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { toast } from '@/components/ui/Toast';
import { AuthScaffold } from '@/features/auth/AuthScaffold';
import { updatePassword } from '@/features/auth/authService';
import { useAuthStore } from '@/features/auth/authStore';
import { resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/schemas';
import { palette } from '@/theme/colors';
import { toAppError } from '@/utils/errors';

/** Reached from a recovery email link once the recovery session has been established. */
export default function ResetPasswordScreen() {
  const status = useAuthStore((s) => s.status);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await updatePassword(password);
      toast.success('Password updated.');
      router.replace('/discover');
    } catch (error) {
      setFormError(toAppError(error).message);
    }
  });

  if (status !== 'signedIn') {
    return (
      <AuthScaffold eyebrow="Password reset" title="Link expired" accent={palette.blush}>
        <ErrorState
          code="session_expired"
          title="This reset link has expired"
          body="Reset links work once and only on the device that requested them. Request a new one to continue."
          secondaryLabel="Request a new link"
          onSecondary={() => router.replace('/forgot-password')}
          compact
        />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold eyebrow="Password reset" title="Choose a new password" accent={palette.lilac}>
      {formError ? <InlineAlert tone="error" message={formError} /> : null}
      <ControlledFormField control={control} name="password" label="New password" password autoComplete="new-password" textContentType="newPassword" />
      <ControlledFormField
        control={control}
        name="confirmPassword"
        label="Confirm new password"
        password
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={onSubmit}
      />
      <PrimaryButton label="Update password" onPress={onSubmit} loading={formState.isSubmitting} fullWidth />
    </AuthScaffold>
  );
}
