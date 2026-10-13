'use client';

import { ArrowRight } from 'lucide-react';

import { isSupabaseConfigured } from '@/constants/config';
import { useAuthStore } from '@/features/auth/authStore';

import { LinkButton } from '../ui/Button';

/** Landing header action: "Open app" for members revisiting the intro, otherwise "Sign in". */
export function LandingAccountLink() {
  const status = useAuthStore((s) => s.status);
  if (status === 'signedIn' || status === 'demo') {
    return (
      <LinkButton href="/discover" variant="secondary" tone="cream" size="sm" iconRight={ArrowRight}>
        Open app
      </LinkButton>
    );
  }
  if (!isSupabaseConfigured || status === 'initializing') return null;
  return (
    <LinkButton href="/sign-in" variant="ghost" tone="cream" className="px-3">
      Sign in
    </LinkButton>
  );
}
