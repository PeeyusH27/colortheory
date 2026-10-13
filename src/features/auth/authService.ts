import type { Session, User } from '@supabase/supabase-js';

import { setDemoCookie } from '@/lib/demoCookie';
import { getSupabase, getSupabaseOrNull } from '@/services/supabase/client';
import { usePreferencesStore } from '@/store/preferencesStore';
import { AppError } from '@/utils/errors';

import { mapAuthError } from './authErrors';
import { useAuthStore, type AuthUser } from './authStore';

/**
 * Auth operations. Pages call these; the app shell reacts to `useAuthStore` changes (and
 * `proxy.ts` guards routes on the server), so no form needs to know where to go after sign-out.
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
    if (usePreferencesStore.getState().demoMode) {
      usePreferencesStore.getState().setDemoMode(false);
      setDemoCookie(false);
    }
    store.setSignedIn(toAuthUser(session.user));
  } else if (usePreferencesStore.getState().demoMode) {
    setDemoCookie(true);
    store.setDemo();
  } else {
    store.setSignedOut();
  }
}

/**
 * Where email links (verification, password reset) return to. The `/auth/callback` route handler
 * exchanges the one-time code on the server and sets the session cookie.
 */
export function authRedirectUrl(options: { type?: 'recovery'; next?: string } = {}) {
  const url = new URL('/auth/callback', window.location.origin);
  if (options.type) url.searchParams.set('type', options.type);
  if (options.next) url.searchParams.set('next', options.next);
  return url.toString();
}

/**
 * Restores the cookie session (or demo mode) and subscribes to auth changes.
 * Called once by `AppProviders` after preferences have rehydrated.
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
    // Corrupt cookie or offline refresh: start signed out instead of blocking the page.
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
    options: { data: { display_name: input.displayName }, emailRedirectTo: authRedirectUrl({ next: '/discover' }) },
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
    options: { emailRedirectTo: authRedirectUrl({ next: '/discover' }) },
  });
  if (error) throw mapAuthError(error);
}

export async function sendPasswordReset(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl({ type: 'recovery' }) });
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

export async function signOut() {
  const supabase = getSupabaseOrNull();
  if (useAuthStore.getState().status === 'demo' || !supabase) {
    exitDemoMode();
    return;
  }
  intentionalSignOut = true;
  // `local` ends this browser's session only; other devices stay signed in.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    intentionalSignOut = false;
    throw mapAuthError(error);
  }
}

export function enterDemoMode() {
  usePreferencesStore.getState().setDemoMode(true);
  setDemoCookie(true);
  useAuthStore.getState().setDemo();
}

export function exitDemoMode() {
  usePreferencesStore.getState().setDemoMode(false);
  setDemoCookie(false);
  useAuthStore.getState().setSignedOut();
}

/**
 * Permanently deletes the account. The Edge Function verifies the caller's JWT, removes their
 * storage objects and deletes the auth user (rows cascade). The browser never holds the
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
