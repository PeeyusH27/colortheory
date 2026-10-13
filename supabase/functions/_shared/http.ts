// Shared HTTP helpers for ColorTheory Edge Functions.
// Every error response has the shape { error: { code, message } } — the app maps `code` to
// friendly copy (src/services/supabase/functions.ts).

// The website calls these functions from the browser, so preflight must allow every header the
// Supabase SDK may send (kept in sync with `@supabase/supabase-js/cors`). `*` is safe here: requests
// authenticate with a bearer token, never with cookies.
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export type ErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'invalid_input'
  | 'quota_exceeded'
  | 'provider_not_configured'
  | 'provider_timeout'
  | 'provider_error'
  | 'invalid_provider_response'
  | 'internal';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return json({ error: { code: error.code, message: error.message } }, error.status);
  }
  // Never echo internal error details to clients; they go to the function logs only.
  console.error('[unhandled]', error);
  return json({ error: { code: 'internal', message: 'Something went wrong.' } }, 500);
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;
}

export async function readJson(req: Request): Promise<unknown> {
  if (req.method !== 'POST') throw new HttpError(405, 'invalid_input', 'Use POST.');
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, 'invalid_input', 'Request body must be JSON.');
  }
}

/** Constant-time string comparison for shared secrets. */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function envInt(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
