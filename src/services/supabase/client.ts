import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { config } from '@/constants/config';
import type { Database } from '@/types/database';
import { AppError } from '@/utils/errors';

export type TypedSupabaseClient = SupabaseClient<Database>;

let client: TypedSupabaseClient | null = null;

/**
 * Lazily creates the browser Supabase client. Returns null when the site runs without a backend
 * (demo mode), so importing this module never throws.
 *
 * `@supabase/ssr` keeps the session in first-party cookies so `proxy.ts` and the `/auth/callback`
 * route can refresh it and exchange email-link codes on the server. The session lives only in
 * those cookies — never in React state, Zustand stores or logs. It uses the PKCE flow: email links
 * carry a one-time `code` that only this browser (holding the code verifier) can exchange.
 */
export function getSupabaseOrNull(): TypedSupabaseClient | null {
  if (!config.supabase || typeof window === 'undefined') return null;
  if (!client) {
    client = createBrowserClient<Database>(config.supabase.url, config.supabase.key, {
      auth: { flowType: 'pkce', autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
  }
  return client;
}

export function getSupabase(): TypedSupabaseClient {
  const c = getSupabaseOrNull();
  if (!c) throw new AppError('not_configured', 'Supabase is not configured for this site.');
  return c;
}

/** Current access token for calling Storage directly (upload with progress). Never stored. */
export async function getAccessToken(): Promise<string> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error || !data.session) throw new AppError('session_expired', 'Your session has expired.');
  return data.session.access_token;
}
