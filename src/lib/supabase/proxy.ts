import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { config } from '@/constants/config';
import { DEMO_COOKIE } from '@/lib/demoCookie';
import { decideRoute } from '@/lib/routeGuard';
import type { Database } from '@/types/database';

function redirect(request: NextRequest, target: string, response: NextResponse) {
  const redirectResponse = NextResponse.redirect(new URL(target, request.url));
  // Carry refreshed session cookies over to the redirect.
  for (const cookie of response.cookies.getAll()) redirectResponse.cookies.set(cookie);
  return redirectResponse;
}

/**
 * Refreshes the Supabase session cookie and makes optimistic routing decisions. This is a
 * convenience layer, not the security boundary: data is protected by Row Level Security and
 * private Storage policies, which every request is subject to.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  let signedIn = false;

  if (config.supabase) {
    const supabase = createServerClient<Database>(config.supabase.url, config.supabase.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    });
    // Validates the JWT (and refreshes it when needed). Do not put code between client creation
    // and this call, or sessions can be dropped at random.
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims?.sub);
  }

  const demo = request.cookies.get(DEMO_COOKIE)?.value === '1';
  const target = decideRoute({ pathname: request.nextUrl.pathname, search: request.nextUrl.search, signedIn, demo });
  if (target) return redirect(request, target, response);
  return response;
}
