import { isPrivilegedSupabaseKey, parseConfig } from '../config';

// base64url JWT payloads, unsigned — only the role claim matters here.
const b64url = (text: string) => btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (payload: object) => `eyJhbGciOiJIUzI1NiJ9.${b64url(JSON.stringify(payload))}.sig`;
const ANON = jwt({ role: 'anon', iss: 'supabase' });
const SERVICE = jwt({ role: 'service_role', iss: 'supabase' });

describe('parseConfig', () => {
  it('runs fully without a backend (demo mode available)', () => {
    const c = parseConfig({}, false);
    expect(c.supabase).toBeNull();
    expect(c.analysisProvider).toBe('device');
    expect(c.generationProvider).toBe('mock');
    expect(c.demoModeEnabled).toBe(true);
    expect(c.issues).toEqual([]);
  });

  it('accepts a publishable key or a legacy anon key', () => {
    expect(parseConfig({ supabaseUrl: 'https://x.supabase.co/', supabasePublishableKey: 'sb_publishable_abc' }, false).supabase).toEqual({
      url: 'https://x.supabase.co',
      key: 'sb_publishable_abc',
    });
    expect(parseConfig({ supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: ANON }, false).supabase?.key).toBe(ANON);
  });

  it('refuses secret / service-role keys in the client bundle', () => {
    expect(isPrivilegedSupabaseKey('sb_secret_123')).toBe(true);
    expect(isPrivilegedSupabaseKey(SERVICE)).toBe(true);
    expect(isPrivilegedSupabaseKey(ANON)).toBe(false);
    const c = parseConfig({ supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: SERVICE }, false);
    expect(c.supabase).toBeNull();
    expect(c.issues.join(' ')).toMatch(/SECRET\/service-role key/);
  });

  it('reports half-configured Supabase', () => {
    expect(parseConfig({ supabaseUrl: 'https://x.supabase.co' }, false).issues[0]).toMatch(/KEY.*missing/);
    expect(parseConfig({ supabasePublishableKey: 'sb_publishable_abc' }, false).issues[0]).toMatch(/URL is missing/);
    expect(parseConfig({ supabaseUrl: 'not a url', supabasePublishableKey: 'k' }, false).issues[0]).toMatch(/http/);
  });

  it('falls back from remote providers when Supabase is missing', () => {
    const c = parseConfig({ analysisProvider: 'remote', generationProvider: 'remote' }, false);
    expect(c.analysisProvider).toBe('device');
    expect(c.generationProvider).toBe('mock');
    expect(c.issues).toHaveLength(2);
  });

  it('hides demo mode in production builds with a backend unless enabled', () => {
    const base = { supabaseUrl: 'https://x.supabase.co', supabasePublishableKey: 'sb_publishable_abc' };
    expect(parseConfig(base, false).demoModeEnabled).toBe(false);
    expect(parseConfig(base, true).demoModeEnabled).toBe(true);
    expect(parseConfig({ ...base, enableDemoMode: 'true' }, false).demoModeEnabled).toBe(true);
  });

  it('flags unknown provider names', () => {
    expect(parseConfig({ analysisProvider: 'gpt' }, false).issues[0]).toMatch(/not one of/);
  });
});
