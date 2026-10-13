import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { toast } from '@/components/ui/Toast';
import { isSupabaseConfigured } from '@/constants/config';
import { completeAuthFromUrl } from '@/features/auth/authService';
import { AppError } from '@/utils/errors';

/**
 * Landing route for email links (sign-up confirmation and password recovery).
 * Deep link: colortheory://auth-callback?code=… (add it to Supabase Auth → URL configuration).
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; type?: string; error_code?: string; error_description?: string }>();
  const linkingUrl = Linking.useLinkingURL();
  const [error, setError] = useState<unknown>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    // Prefer the full URL (it carries `#access_token` fragments); fall back to router params.
    const query = new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    ).toString();
    const url = linkingUrl?.includes('auth-callback') ? linkingUrl : `colortheory://auth-callback?${query}`;
    if (!isSupabaseConfigured) return;
    if (!linkingUrl && !params.code && !params.error_code) return; // wait for the URL
    handled.current = true;

    completeAuthFromUrl(url)
      .then((kind) => {
        if (kind === 'recovery') {
          router.replace('/reset-password');
        } else {
          toast.success('Email confirmed — welcome to ColorTheory.');
          router.replace('/discover');
        }
      })
      .catch(setError);
  }, [linkingUrl, params]);

  const shownError = isSupabaseConfigured ? error : new AppError('not_configured', 'Accounts are not configured in this build.');

  return (
    <ScreenContainer>
      {shownError ? (
        <ErrorState
          error={shownError}
          title="This link didn’t work"
          onRetry={undefined}
          secondaryLabel="Back to sign in"
          onSecondary={() => router.replace('/welcome')}
        />
      ) : (
        <LoadingState fullScreen label="Signing you in…" />
      )}
    </ScreenContainer>
  );
}
