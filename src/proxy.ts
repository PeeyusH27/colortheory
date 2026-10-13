import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Everything except static assets, image optimisation and the email-link handler.
    '/((?!_next/static|_next/image|auth/callback|favicon\\.png|icon\\.png|grain\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
};
