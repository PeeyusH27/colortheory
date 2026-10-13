import type { EmailOtpType } from '@supabase/supabase-js';

import { mapAuthError } from '@/features/auth/authErrors';

/**
 * Resolves an email link (sign-up confirmation, password recovery) into where the browser should
 * go next. Runs in the `/auth/callback` route handler with a server Supabase client, so the session
 * cookie is set on the redirect response.
 *
 * Supports the PKCE `?code=` format (what this site's client requests) and the `?token_hash=&type=`
 * format (the recommended email template for SSR, which also works when the link is opened in a
 * different browser). Implicit-flow `#access_token` links are not supported: fragments never reach
 * the server, and this client never asks for them.
 */
export interface AuthLinkClient {
  exchangeCodeForSession(code: string): Promise<{ error: unknown }>;
  verifyOtp(params: { type: EmailOtpType; token_hash: string }): Promise<{ error: unknown }>;
}

export type AuthLinkOutcome =
  | { kind: 'signed-in'; redirectTo: string }
  | { kind: 'recovery'; redirectTo: string }
  | { kind: 'error'; redirectTo: string; message: string };

const OTP_TYPES = new Set<EmailOtpType>(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']);

/** Only same-site, path-only destinations are allowed (no `//evil.com`, no `https://…`). */
export function safeNextPath(value: string | null | undefined, fallback = '/discover'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  try {
    const url = new URL(value, 'https://colortheory.invalid');
    return url.origin === 'https://colortheory.invalid' ? `${url.pathname}${url.search}` : fallback;
  } catch {
    return fallback;
  }
}

function errorOutcome(message: string, isRecovery: boolean): AuthLinkOutcome {
  const params = new URLSearchParams({ link_error: message });
  return { kind: 'error', message, redirectTo: `${isRecovery ? '/forgot-password' : '/sign-in'}?${params}` };
}

export async function completeAuthLink(params: URLSearchParams, auth: AuthLinkClient): Promise<AuthLinkOutcome> {
  const type = params.get('type');
  const isRecovery = type === 'recovery';
  const next = safeNextPath(params.get('next'));

  const errorCode = params.get('error_code');
  if (errorCode) {
    return errorOutcome(mapAuthError({ code: errorCode, message: params.get('error_description') ?? '' }).message, isRecovery);
  }

  const code = params.get('code');
  const tokenHash = params.get('token_hash');
  let error: unknown = null;
  if (code) {
    ({ error } = await auth.exchangeCodeForSession(code));
  } else if (tokenHash && type && OTP_TYPES.has(type as EmailOtpType)) {
    ({ error } = await auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash }));
  } else {
    return errorOutcome('This link is incomplete. Request a new one.', isRecovery);
  }

  if (error) {
    const mapped = mapAuthError(error);
    // A PKCE sign-up link opened in another browser has still confirmed the email address on
    // Supabase's side; only the session exchange failed. Say so instead of implying it failed.
    const message =
      !isRecovery && /different browser/.test(mapped.message)
        ? 'Your email is confirmed. Sign in with your password to continue.'
        : mapped.message;
    return errorOutcome(message, isRecovery);
  }

  return isRecovery ? { kind: 'recovery', redirectTo: '/reset-password' } : { kind: 'signed-in', redirectTo: next };
}
