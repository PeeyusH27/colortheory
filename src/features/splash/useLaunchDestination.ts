import type { Href } from 'expo-router';

import { selectIsAuthenticated, useAuthStore } from '@/features/auth/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';

/**
 * Single source of truth for "where should the app go from the anchor route?".
 *  - password recovery link opened → reset password
 *  - signed in (or demo)           → Discover
 *  - first launch                  → onboarding
 *  - otherwise                     → welcome / sign in
 */
export function useLaunchDestination(): Href {
  const authenticated = useAuthStore(selectIsAuthenticated);
  const recoveryPending = useAuthStore((s) => s.recoveryPending);
  const onboarded = usePreferencesStore((s) => s.hasCompletedOnboarding);

  if (recoveryPending) return '/reset-password';
  if (authenticated) return '/discover';
  if (!onboarded) return '/onboarding';
  return '/welcome';
}
