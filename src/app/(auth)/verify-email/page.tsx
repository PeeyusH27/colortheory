import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AuthScaffold, FormSkeleton } from '@/features/auth/AuthScaffold';
import { VerifyEmailPanel } from '@/features/auth/forms/VerifyEmailPanel';
import { palette } from '@/theme/colors';

export const metadata: Metadata = { title: 'Confirm your email' };

export default function VerifyEmailPage() {
  return (
    <AuthScaffold eyebrow="One more step" title="Confirm your email" accent={palette.sage}>
      <Suspense fallback={<FormSkeleton />}>
        <VerifyEmailPanel />
      </Suspense>
    </AuthScaffold>
  );
}
