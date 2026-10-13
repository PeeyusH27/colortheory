'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { FormField } from '@/components/ui/FormField';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { isSupabaseConfigured } from '@/constants/config';
import { toAppError } from '@/utils/errors';

import { signUpWithEmail } from '../authService';
import { DemoEntry } from '../DemoEntry';
import { passwordStrength, signUpSchema, type SignUpValues } from '../schemas';

const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'] as const;
const STRENGTH_COLORS = ['bg-linen', 'bg-error', 'bg-saffron', 'bg-steel', 'bg-success'] as const;

function StrengthMeter({ password }: { password: string }) {
  const score = passwordStrength(password);
  return (
    <div className="flex flex-col gap-1.5">
      <div aria-hidden className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cx('h-1.5 flex-1 rounded-full', i <= score && password ? STRENGTH_COLORS[score] : 'bg-linen')} />
        ))}
      </div>
      <p className="type-caption text-muted" aria-live="polite">
        {password ? `Strength: ${STRENGTH_LABELS[score]}` : 'At least 8 characters, with a letter and a number'}
      </p>
    </div>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, control, formState } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  });
  const password = useWatch({ control, name: 'password' });

  const onSubmit = handleSubmit(async ({ displayName, email, password: pw }) => {
    setFormError(null);
    try {
      const { needsVerification } = await signUpWithEmail({ displayName, email, password: pw });
      router.replace(needsVerification ? `/verify-email?${new URLSearchParams({ email })}` : '/discover');
    } catch (error) {
      setFormError(toAppError(error).message);
    }
  });

  return (
    <div className="flex flex-col gap-6">
      {!isSupabaseConfigured ? (
        <InlineAlert tone="info" title="Accounts aren’t set up on this site">
          Sign-up needs a Supabase project. You can still explore everything in demo mode.
        </InlineAlert>
      ) : null}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {formError ? (
          <InlineAlert tone="error" role="alert">
            {formError}
          </InlineAlert>
        ) : null}
        <fieldset disabled={!isSupabaseConfigured} className="flex flex-col gap-5 disabled:opacity-60">
          <FormField label="Name" placeholder="What should we call you?" autoComplete="name" error={formState.errors.displayName?.message} {...register('displayName')} />
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
            <FormField label="Password" type="password" revealable autoComplete="new-password" error={formState.errors.password?.message} {...register('password')} />
            <StrengthMeter password={password ?? ''} />
          </div>
          <FormField
            label="Confirm password"
            type="password"
            revealable
            autoComplete="new-password"
            error={formState.errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <p className="type-caption text-muted">
            We’ll email you a link to confirm your address. Your portraits stay in this browser unless you choose cloud storage.
          </p>
          <Button type="submit" size="lg" fullWidth loading={formState.isSubmitting}>
            Create account
          </Button>
        </fieldset>
      </form>
      <p className="type-body-s text-muted">
        Already have an account?{' '}
        <Link href="/sign-in" className="type-label text-navy underline underline-offset-4">
          Sign in
        </Link>
      </p>
      <p className="type-caption text-muted">
        By creating an account you agree to the{' '}
        <Link href="/legal/terms" className="underline underline-offset-2">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/legal/privacy" className="underline underline-offset-2">
          Privacy notes
        </Link>
        .
      </p>
      <DemoEntry className="border-t border-line-warm pt-5" />
    </div>
  );
}
