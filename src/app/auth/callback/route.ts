import { NextResponse, type NextRequest } from 'next/server';

import { completeAuthLink } from '@/lib/auth/completeAuthLink';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Email links (sign-up confirmation, password recovery) land here. The one-time code is exchanged
 * on the server and the session is written to cookies on the redirect, so the link's secrets never
 * sit in browser history or client state.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(new URL('/sign-in?link_error=Sign-in+is+not+configured+for+this+site.', url.origin));
  }
  const outcome = await completeAuthLink(url.searchParams, supabase.auth);
  const response = NextResponse.redirect(new URL(outcome.redirectTo, url.origin));
  // Never let a CDN or the browser cache a response that sets a session.
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
