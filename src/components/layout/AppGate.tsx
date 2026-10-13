'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { useAuthStore } from '@/features/auth/authStore';

/**
 * Client half of the route guard. `proxy.ts` already redirects visitors without a session or demo
 * cookie; this covers sessions that end while a page is open (sign-out, expiry, revocation).
 *
 * Pages always render (so their shells prerender); their data queries stay pending until auth
 * state is known — see `useAuthReady` in features/data/queries.ts.
 */
export function AppGate({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const expired = useAuthStore((s) => s.sessionExpired);
  const router = useRouter();

  useEffect(() => {
    if (status !== 'signedOut') return;
    if (expired) {
      // The session ended on its own: ask to sign in again and come back here.
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/sign-in?${new URLSearchParams({ expired: '1', next })}`);
    } else {
      // Intentional sign-out or leaving demo mode.
      router.replace('/');
    }
  }, [status, expired, router]);

  return children;
}
