import type { Metadata } from 'next';

import { AuthScaffold } from '@/features/auth/AuthScaffold';
import { SignUpForm } from '@/features/auth/forms/SignUpForm';
import { palette } from '@/theme/colors';

export const metadata: Metadata = { title: 'Create an account' };

export default function SignUpPage() {
  return (
    <AuthScaffold eyebrow="Create account" title="Start your colour story" accent={palette.coral}>
      <SignUpForm />
    </AuthScaffold>
  );
}
