import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AuthScaffold, FormSkeleton } from '@/features/auth/AuthScaffold';
import { ForgotPasswordForm } from '@/features/auth/forms/ForgotPasswordForm';
import { palette } from '@/theme/colors';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ForgotPasswordPage() {
  return (
    <AuthScaffold eyebrow="Password reset" title="Forgot your password?" deck="We’ll send a secure link to set a new one." accent={palette.lilac}>
      <Suspense fallback={<FormSkeleton />}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthScaffold>
  );
}
