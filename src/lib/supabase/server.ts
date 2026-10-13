import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { config } from '@/constants/config';
import type { Database } from '@/types/database';

/**
 * Server Supabase client for Route Handlers. Uses the same public URL and publishable key as the
 * browser — never a service-role key — so Row Level Security applies to everything it does.
 */
export async function createSupabaseServerClient() {
  if (!config.supabase) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(config.supabase.url, config.supabase.key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
      },
    },
  });
}
