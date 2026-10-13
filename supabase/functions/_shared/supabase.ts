import { createClient, type SupabaseClient, type User } from 'jsr:@supabase/supabase-js@2.117.2';

import { HttpError } from './http.ts';

/**
 * Service-role client. It bypasses Row Level Security, so it exists ONLY inside Edge Functions
 * (server-side) and every query below scopes by the verified user's id explicitly.
 *
 * Supabase injects SUPABASE_URL and the service key into every function. Newer projects expose
 * the secret key as SUPABASE_SECRET_KEY; legacy projects as SUPABASE_SERVICE_ROLE_KEY.
 */
export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new HttpError(500, 'internal', 'Function is missing Supabase credentials.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Resolves the caller from their access token. The token is verified by Supabase Auth — never
 * trust a user id sent in the request body.
 */
export async function requireUser(req: Request, admin: SupabaseClient): Promise<User> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new HttpError(401, 'unauthorized', 'Missing access token.');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'unauthorized', 'Your session has expired.');
  return data.user;
}

export const BUCKETS = { portraits: 'portraits', previews: 'outfit-previews', garmentRefs: 'garment-references' } as const;

export const portraitPath = (userId: string, analysisId: string) => `${userId}/${analysisId}/original.jpg`;
export const previewPath = (userId: string, analysisId: string, previewId: string) => `${userId}/${analysisId}/${previewId}.png`;

/** Removes every object under `{prefix}/` (one level of sub-folders, matching our path scheme). */
export async function removeFolder(admin: SupabaseClient, bucket: string, prefix: string): Promise<number> {
  let removed = 0;
  const { data: entries, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw error;
  const files: string[] = [];
  for (const entry of entries ?? []) {
    if (entry.id) {
      files.push(`${prefix}/${entry.name}`);
    } else {
      // A "folder" (analysis id): list its files.
      const { data: inner, error: innerError } = await admin.storage.from(bucket).list(`${prefix}/${entry.name}`, { limit: 1000 });
      if (innerError) throw innerError;
      for (const f of inner ?? []) if (f.id) files.push(`${prefix}/${entry.name}/${f.name}`);
    }
  }
  for (let i = 0; i < files.length; i += 100) {
    const batch = files.slice(i, i + 100);
    const { error: removeError } = await admin.storage.from(bucket).remove(batch);
    if (removeError) throw removeError;
    removed += batch.length;
  }
  return removed;
}
