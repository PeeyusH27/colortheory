'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { isSupabaseConfigured } from '@/constants/config';
import { safeNextPath } from '@/lib/auth/completeAuthLink';
import { toAppError } from '@/utils/errors';

import { signInWithEmail } from '../authService';
import { DemoEntry } from '../DemoEntry';
import { signInSchema, type SignInValues } from '../schemas';

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const linkError = params.get('link_error');
  const expired = params.get('expired') === '1';
  const [formError, setFormError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const { register, handleSubmit, getValues, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    setNeedsConfirmation(false);
    try {
      await signInWithEmail(email, password);
      router.replace(safeNextPath(params.get('next')));
    } catch (error) {
      const appError = toAppError(error);
      setFormError(appError.message);
      setNeedsConfirmation(/confirm your email/i.test(appError.message));
    }
  });

  return (
    <div className="flex flex-col gap-6">
      {expired ? (
        <InlineAlert tone="warning" title="You were signed out">
          Your session expired. Sign in again to sync your colours.
        </InlineAlert>
      ) : null}
      {linkError ? <InlineAlert tone="info">{linkError}</InlineAlert> : null}
      {!isSupabaseConfigured ? (
        <InlineAlert tone="info" title="Accounts aren’t set up on this site">
          Add your Supabase URL and publishable key to <code>.env.local</code> to enable sign-in. Meanwhile, demo mode has every
          feature with data kept in this browser.
        </InlineAlert>
      ) : null}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {formError ? (
          <InlineAlert
            tone="error"
            role="alert"
            action={
              needsConfirmation ? (
                <Link className="type-label underline" href={`/verify-email?${new URLSearchParams({ email: getValues('email') })}`}>
                  Resend confirmation email
                </Link>
              ) : undefined
            }>
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
          <div className="flex flex-col gap-2">
            <FormField
              label="Password"
              type="password"
              revealable
              autoComplete="current-password"
              error={formState.errors.password?.message}
              {...register('password')}
            />
            <Link href="/forgot-password" className="type-label self-end py-1 text-denim underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" size="lg" fullWidth loading={formState.isSubmitting}>
            Sign in
          </Button>
        </fieldset>
      </form>
      <p className="type-body-s text-muted">
        New to ColorTheory?{' '}
        <Link href="/sign-up" className="type-label text-navy underline underline-offset-4">
          Create an account
        </Link>
      </p>
      <DemoEntry className="border-t border-line-warm pt-5" />
    </div>
  );
}
