import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { getSupabase, getSupabaseOrNull } from '@/services/supabase/client';
import { usePreferencesStore } from '@/store/preferencesStore';
import { AppError } from '@/utils/errors';

import { mapAuthError } from './authErrors';
import { useAuthStore, type AuthUser } from './authStore';

/**
 * Auth operations. Screens call these; routing reacts to `useAuthStore` changes through
 * `Stack.Protected` guards, so no screen needs to navigate after sign-in/out itself.
 */

let intentionalSignOut = false;
let unsubscribe: (() => void) | null = null;

function toAuthUser(user: User): AuthUser {
  const meta = (user.user_metadata ?? {}) as { display_name?: unknown; full_name?: unknown };
  const displayName =
    typeof meta.display_name === 'string' ? meta.display_name : typeof meta.full_name === 'string' ? meta.full_name : null;
  return {
    id: user.id,
    email: user.email ?? null,
    displayName,
    emailConfirmed: Boolean(user.email_confirmed_at),
  };
}

function applySession(session: Session | null) {
  const store = useAuthStore.getState();
  if (session?.user) {
    // A real session always wins over demo mode.
    if (usePreferencesStore.getState().demoMode) usePreferencesStore.getState().setDemoMode(false);
    store.setSignedIn(toAuthUser(session.user));
  } else if (usePreferencesStore.getState().demoMode) {
    store.setDemo();
  } else {
    store.setSignedOut();
  }
}

/** Where email links (verification, password reset) send the user back into the app. */
export function authRedirectUrl(type?: 'recovery') {
  return Linking.createURL('/auth-callback', type ? { queryParams: { type } } : undefined);
}

/**
 * Restores the persisted session (or demo mode) and subscribes to auth changes.
 * Called once by the root layout after preferences have rehydrated.
 */
export async function initializeAuth(): Promise<void> {
  const supabase = getSupabaseOrNull();
  if (!supabase) {
    applySession(null);
    return;
  }

  try {
    const { data } = await supabase.auth.getSession();
    applySession(data.session);
  } catch {
    // Corrupt storage or offline refresh: start signed out instead of blocking launch.
    applySession(null);
  }

  unsubscribe?.();
  const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
    // Keep this callback synchronous: calling other supabase methods here can deadlock.
    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
      case 'USER_UPDATED':
        applySession(session);
        break;
      case 'PASSWORD_RECOVERY':
        applySession(session);
        useAuthStore.getState().setRecoveryPending(true);
        break;
      case 'SIGNED_OUT': {
        const expired = !intentionalSignOut && useAuthStore.getState().status === 'signedIn';
        intentionalSignOut = false;
        if (usePreferencesStore.getState().demoMode) useAuthStore.getState().setDemo();
        else useAuthStore.getState().setSignedOut({ expired });
        break;
      }
      default:
        break;
    }
  });
  unsubscribe = () => sub.subscription.unsubscribe();
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw mapAuthError(error);
}

export async function signUpWithEmail(input: { email: string; password: string; displayName: string }) {
  const { data, error } = await getSupabase().auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { display_name: input.displayName }, emailRedirectTo: authRedirectUrl() },
  });
  if (error) throw mapAuthError(error);
  // With "Confirm email" enabled (the Supabase default) no session is returned until the link is
  // opened. Supabase also returns a user without a session for an existing address, to avoid
  // revealing which emails are registered, so the UI shows the same "check your inbox" state.
  return { needsVerification: !data.session };
}

export async function resendVerificationEmail(email: string) {
  const { error } = await getSupabase().auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: authRedirectUrl() },
  });
  if (error) throw mapAuthError(error);
}

export async function sendPasswordReset(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl('recovery') });
  if (error) throw mapAuthError(error);
}

export async function updatePassword(password: string) {
  const { error } = await getSupabase().auth.updateUser({ password });
  if (error) throw mapAuthError(error);
  useAuthStore.getState().setRecoveryPending(false);
}

export async function updateDisplayName(displayName: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.updateUser({ data: { display_name: displayName } });
  if (error) throw mapAuthError(error);
  if (data.user) {
    // Mirror into the profiles table (RLS: users can only update their own row).
    await supabase.from('profiles').update({ display_name: displayName }).eq('id', data.user.id);
  }
}

/**
 * Completes an email-link flow. Supports both the PKCE `?code=` format (default for this client)
 * and the implicit `#access_token=…&refresh_token=…` format, in case the project uses it.
 */
export async function completeAuthFromUrl(url: string): Promise<'signed-in' | 'recovery'> {
  const supabase = getSupabase();
  const parsed = new URL(url);
  const query = parsed.searchParams;
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const errorCode = query.get('error_code') ?? hash.get('error_code');
  if (errorCode) throw mapAuthError({ code: errorCode, message: query.get('error_description') ?? hash.get('error_description') ?? '' });

  const isRecovery = query.get('type') === 'recovery' || hash.get('type') === 'recovery';
  const code = query.get('code');
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw mapAuthError(error);
  } else if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw mapAuthError(error);
  } else {
    throw new AppError('invalid_response', 'This link is incomplete. Request a new one.');
  }

  if (isRecovery) useAuthStore.getState().setRecoveryPending(true);
  return isRecovery ? 'recovery' : 'signed-in';
}

export async function signOut() {
  const supabase = getSupabaseOrNull();
  if (useAuthStore.getState().status === 'demo' || !supabase) {
    exitDemoMode();
    return;
  }
  intentionalSignOut = true;
  // `local` ends this device's session only; other devices stay signed in.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    intentionalSignOut = false;
    throw mapAuthError(error);
  }
}

export function enterDemoMode() {
  usePreferencesStore.getState().setDemoMode(true);
  useAuthStore.getState().setDemo();
}

export function exitDemoMode() {
  usePreferencesStore.getState().setDemoMode(false);
  useAuthStore.getState().setSignedOut();
}

/**
 * Permanently deletes the account. The Edge Function verifies the caller's JWT, removes their
 * storage objects and deletes the auth user (rows cascade). The client never holds the
 * service-role key needed for this.
 */
export async function deleteAccount() {
  const supabase = getSupabase();
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST', body: { confirm: true } });
  if (error) throw new AppError('unknown', 'We couldn’t delete your account. Please try again.', { cause: error });
  intentionalSignOut = true;
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  useAuthStore.getState().setSignedOut();
}
