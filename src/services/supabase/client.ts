import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { config } from '@/constants/config';
import type { Database } from '@/types/database';
import { AppError } from '@/utils/errors';

import { secureSessionStorage } from './secureSessionStorage';

export type TypedSupabaseClient = SupabaseClient<Database>;

let client: TypedSupabaseClient | null = null;

/**
 * Lazily creates the Supabase client. Returns null when the app runs without a backend (demo
 * mode), so importing this module never throws at startup.
 */
export function getSupabaseOrNull(): TypedSupabaseClient | null {
  if (!config.supabase) return null;
  if (client) return client;

  client = createClient<Database>(config.supabase.url, config.supabase.key, {
    auth: {
      storage: secureSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Mobile apps have no URL bar; auth links are handled by the auth-callback route instead.
      detectSessionInUrl: false,
      // PKCE: email links carry a one-time `code` that only this device can exchange.
      flowType: 'pkce',
    },
  });

  // Only refresh tokens while the app is in the foreground (recommended by Supabase for RN).
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }
  return client;
}

export function getSupabase(): TypedSupabaseClient {
  const c = getSupabaseOrNull();
  if (!c) throw new AppError('not_configured', 'Supabase is not configured for this build.');
  return c;
}

/** Current access token for calling Edge Functions directly (e.g. upload with progress). */
export async function getAccessToken(): Promise<string> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error || !data.session) throw new AppError('session_expired', 'Your session has expired.');
  return data.session.access_token;
}
