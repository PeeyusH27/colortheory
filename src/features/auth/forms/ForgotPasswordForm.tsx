'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button, LinkButton } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { isSupabaseConfigured } from '@/constants/config';
import { toAppError } from '@/utils/errors';

import { sendPasswordReset } from '../authService';
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas';

export function ForgotPasswordForm() {
  const linkError = useSearchParams().get('link_error');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<ForgotPasswordValues>({
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

  if (sentTo) {
    return (
      <div className="flex flex-col gap-5">
        <InlineAlert tone="success" title="Check your inbox" role="status">
          If an account exists for {sentTo}, a reset link is on its way. Open it in this browser to choose a new password.
        </InlineAlert>
        <LinkButton href="/sign-in" variant="secondary" size="lg" fullWidth>
          Back to sign in
        </LinkButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {linkError ? <InlineAlert tone="warning">{linkError}</InlineAlert> : null}
      {formError ? (
        <InlineAlert tone="error" role="alert">
          {formError}
        </InlineAlert>
      ) : null}
      <fieldset disabled={!isSupabaseConfigured} className="flex flex-col gap-5 disabled:opacity-60">
        <FormField
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          error={formState.errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" size="lg" fullWidth loading={formState.isSubmitting}>
          Send reset link
        </Button>
      </fieldset>
      <LinkButton href="/sign-in" variant="ghost">
        Back to sign in
      </LinkButton>
    </form>
  );
}
