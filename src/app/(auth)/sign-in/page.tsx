import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AuthScaffold, FormSkeleton } from '@/features/auth/AuthScaffold';
import { SignInForm } from '@/features/auth/forms/SignInForm';
import { palette } from '@/theme/colors';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <AuthScaffold eyebrow="Welcome back" title="Sign in" deck="Pick up where your palette left off." accent={palette.sky}>
      <Suspense fallback={<FormSkeleton />}>
        <SignInForm />
      </Suspense>
    </AuthScaffold>
  );
}
