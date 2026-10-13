/**
 * Two-account Row Level Security check against a real Supabase project.
 * Requires credentials (see vitest.integration.config.mts); skipped otherwise.
 * Uses only the publishable key and normal user sessions — exactly what the website has.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = {
  url: process.env.SUPABASE_TEST_URL,
  key: process.env.SUPABASE_TEST_PUBLISHABLE_KEY,
  a: { email: process.env.SUPABASE_TEST_USER_A_EMAIL, password: process.env.SUPABASE_TEST_USER_A_PASSWORD },
  b: { email: process.env.SUPABASE_TEST_USER_B_EMAIL, password: process.env.SUPABASE_TEST_USER_B_PASSWORD },
};
const configured = Boolean(env.url && env.key && env.a.email && env.a.password && env.b.email && env.b.password);
const describeIfConfigured = configured ? describe : describe.skip;

async function signedInClient(email: string, password: string): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(env.url!, env.key!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Sign-in failed for ${email}: ${error?.message}`);
  return { client, userId: data.user.id };
}

const randomUUID = () => globalThis.crypto.randomUUID();

// Smallest valid JPEG (1×1).
const JPEG = Uint8Array.from(
  atob('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='),
  (c) => c.charCodeAt(0),
);

describeIfConfigured('RLS with two real accounts', () => {
  let a: Awaited<ReturnType<typeof signedInClient>>;
  let b: Awaited<ReturnType<typeof signedInClient>>;
  const analysisId = randomUUID();

  beforeAll(async () => {
    a = await signedInClient(env.a.email!, env.a.password!);
    b = await signedInClient(env.b.email!, env.b.password!);
  });

  afterAll(async () => {
    await a.client.storage.from('portraits').remove([`${a.userId}/${analysisId}/original.jpg`]);
    await a.client.from('analysis_sessions').delete().eq('id', analysisId);
  });

  it('A can create an analysis and upload its portrait', async () => {
    const { error } = await a.client.from('analysis_sessions').insert({ id: analysisId, model_provider: 'on-device', status: 'processing' });
    expect(error).toBeNull();
    const upload = await a.client.storage.from('portraits').upload(`${a.userId}/${analysisId}/original.jpg`, JPEG, { contentType: 'image/jpeg' });
    expect(upload.error).toBeNull();
  });

  it('B cannot read, change or delete A’s analysis', async () => {
    const read = await b.client.from('analysis_sessions').select('*').eq('id', analysisId);
    expect(read.data).toEqual([]);
    const update = await b.client.from('analysis_sessions').update({ status: 'failed' }).eq('id', analysisId).select();
    expect(update.data).toEqual([]);
    const del = await b.client.from('analysis_sessions').delete().eq('id', analysisId).select();
    expect(del.data).toEqual([]);
  });

  it('B cannot attach data to A’s analysis', async () => {
    const { error } = await b.client.from('color_palettes').insert({ analysis_id: analysisId, name: 'Stolen', colors: [{ name: 'Navy', hex: '#172A46' }] });
    expect(error).not.toBeNull();
  });

  it('B cannot download or delete A’s portrait, or upload into A’s folder', async () => {
    const download = await b.client.storage.from('portraits').download(`${a.userId}/${analysisId}/original.jpg`);
    expect(download.data).toBeNull();
    const removed = await b.client.storage.from('portraits').remove([`${a.userId}/${analysisId}/original.jpg`]);
    expect(removed.data ?? []).toEqual([]);
    const upload = await b.client.storage.from('portraits').upload(`${a.userId}/${analysisId}/x.jpg`, JPEG, { contentType: 'image/jpeg' });
    expect(upload.error).not.toBeNull();
  });

  it('A can still read their own portrait through a short-lived signed URL', async () => {
    const { data, error } = await a.client.storage.from('portraits').createSignedUrl(`${a.userId}/${analysisId}/original.jpg`, 60);
    expect(error).toBeNull();
    expect(data?.signedUrl).toMatch(/token=/);
  });

  it('clients cannot write generated previews', async () => {
    const { error } = await a.client.storage.from('outfit-previews').upload(`${a.userId}/${analysisId}/${randomUUID()}.png`, JPEG, { contentType: 'image/png' });
    expect(error).not.toBeNull();
  });
});

if (!configured) {
  it('integration tests skipped (no SUPABASE_TEST_* credentials)', () => {
    expect(configured).toBe(false);
  });
}
