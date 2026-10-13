'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { LinkButton, Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { toast } from '@/components/ui/Toast';
import { toAppError } from '@/utils/errors';

import { updatePassword } from '../authService';
import { useAuthStore } from '../authStore';
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas';

/** Reached from a recovery email link once `/auth/callback` has established the session. */
export function ResetPasswordForm() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<ResetPasswordValues>({
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

  if (status === 'initializing') return <LoadingState label="Checking your link" />;

  if (status !== 'signedIn') {
    return (
      <ErrorState
        code="session_expired"
        title="This reset link has expired"
        body="Reset links work once and only in the browser that requested them. Request a new one to continue."
        secondary={
          <LinkButton href="/forgot-password" variant="secondary">
            Request a new link
          </LinkButton>
        }
        compact
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError ? (
        <InlineAlert tone="error" role="alert">
          {formError}
        </InlineAlert>
      ) : null}
      <FormField label="New password" type="password" revealable autoComplete="new-password" error={formState.errors.password?.message} {...register('password')} />
      <FormField
        label="Confirm new password"
        type="password"
        revealable
        autoComplete="new-password"
        error={formState.errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <Button type="submit" size="lg" fullWidth loading={formState.isSubmitting}>
        Update password
      </Button>
    </form>
  );
}
