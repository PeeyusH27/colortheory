import type { Metadata } from 'next';

import { AuthScaffold } from '@/features/auth/AuthScaffold';
import { ResetPasswordForm } from '@/features/auth/forms/ResetPasswordForm';
import { palette } from '@/theme/colors';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage() {
  return (
    <AuthScaffold eyebrow="Password reset" title="Choose a new password" accent={palette.lilac}>
      <ResetPasswordForm />
    </AuthScaffold>
  );
}
