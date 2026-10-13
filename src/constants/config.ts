/**
 * Typed, validated runtime configuration.
 *
 * Only `EXPO_PUBLIC_*` variables reach the app bundle, and Expo inlines them at build time — which
 * means anything here is readable by anyone who downloads the app. Only values that are *meant* to
 * be public belong here (the Supabase URL and publishable/anon key are; RLS protects the data).
 * Service-role keys, AI provider keys and signing secrets live in Supabase Edge Function secrets.
 *
 * Note: Expo requires each variable to be referenced statically (`process.env.EXPO_PUBLIC_X`);
 * dynamic lookups like `process.env[name]` are not inlined.
 */

export type AnalysisProviderKind = 'device' | 'mock' | 'remote';
export type GenerationProviderKind = 'mock' | 'remote' | 'off';

export interface SupabaseConfig {
  url: string;
  /** Publishable key (`sb_publishable_…`) or legacy anon JWT. Both are safe to ship. */
  key: string;
}

export interface AppConfig {
  supabase: SupabaseConfig | null;
  analysisProvider: AnalysisProviderKind;
  generationProvider: GenerationProviderKind;
  /** Whether the "Explore in demo mode" entry point is offered on the welcome screen. */
  demoModeEnabled: boolean;
  legal: { privacyUrl: string | null; termsUrl: string | null };
  /** Human-readable configuration problems, surfaced in development UI and the README checks. */
  issues: string[];
}

interface RawEnv {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  supabaseAnonKey?: string;
  analysisProvider?: string;
  generationProvider?: string;
  enableDemoMode?: string;
  privacyUrl?: string;
  termsUrl?: string;
}

function decodeJwtRole(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const json = globalThis.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { role?: unknown };
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

/** True when a key would bypass Row Level Security if shipped in the client. */
export function isPrivilegedSupabaseKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  return decodeJwtRole(key) === 'service_role';
}

function isHttpUrl(value: string) {
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(value);
}

function blankToUndefined(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseConfig(raw: RawEnv, isDev: boolean): AppConfig {
  const issues: string[] = [];

  const url = blankToUndefined(raw.supabaseUrl);
  const key = blankToUndefined(raw.supabasePublishableKey) ?? blankToUndefined(raw.supabaseAnonKey);
  let supabase: SupabaseConfig | null = null;

  if (url || key) {
    if (!url) issues.push('EXPO_PUBLIC_SUPABASE_URL is missing (a Supabase key was provided).');
    else if (!isHttpUrl(url)) issues.push('EXPO_PUBLIC_SUPABASE_URL must be an http(s) URL.');
    if (!key) {
      issues.push(
        'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY) is missing.',
      );
    } else if (isPrivilegedSupabaseKey(key)) {
      // Refuse to run with a key that bypasses RLS. This is a build mistake, not a runtime state.
      issues.push(
        'The Supabase key in EXPO_PUBLIC_* is a SECRET/service-role key. Remove it immediately, rotate it in the Supabase dashboard, and use the publishable (anon) key instead.',
      );
    }
    if (url && key && isHttpUrl(url) && !isPrivilegedSupabaseKey(key)) {
      supabase = { url: url.replace(/\/+$/, ''), key };
    }
  }

  const analysisRaw = blankToUndefined(raw.analysisProvider) ?? 'device';
  let analysisProvider: AnalysisProviderKind = 'device';
  if (analysisRaw === 'device' || analysisRaw === 'mock' || analysisRaw === 'remote') {
    analysisProvider = analysisRaw;
  } else {
    issues.push(`EXPO_PUBLIC_ANALYSIS_PROVIDER="${analysisRaw}" is not one of device | mock | remote.`);
  }
  if (analysisProvider === 'remote' && !supabase) {
    issues.push('EXPO_PUBLIC_ANALYSIS_PROVIDER=remote requires Supabase; falling back to on-device.');
    analysisProvider = 'device';
  }

  const generationRaw = blankToUndefined(raw.generationProvider) ?? 'mock';
  let generationProvider: GenerationProviderKind = 'mock';
  if (generationRaw === 'mock' || generationRaw === 'remote' || generationRaw === 'off') {
    generationProvider = generationRaw;
  } else {
    issues.push(`EXPO_PUBLIC_OUTFIT_GENERATION="${generationRaw}" is not one of mock | remote | off.`);
  }
  if (generationProvider === 'remote' && !supabase) {
    issues.push('EXPO_PUBLIC_OUTFIT_GENERATION=remote requires Supabase; falling back to mock.');
    generationProvider = 'mock';
  }

  const demoFlag = blankToUndefined(raw.enableDemoMode);
  // Demo mode is always available when there is no backend (otherwise the app would be unusable),
  // and in development builds. Production builds with Supabase hide it unless explicitly enabled.
  const demoModeEnabled = demoFlag ? demoFlag === 'true' : isDev || !supabase;

  return {
    supabase,
    analysisProvider,
    generationProvider,
    demoModeEnabled,
    legal: {
      privacyUrl: blankToUndefined(raw.privacyUrl) ?? null,
      termsUrl: blankToUndefined(raw.termsUrl) ?? null,
    },
    issues,
  };
}

export const config: AppConfig = parseConfig(
  {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    analysisProvider: process.env.EXPO_PUBLIC_ANALYSIS_PROVIDER,
    generationProvider: process.env.EXPO_PUBLIC_OUTFIT_GENERATION,
    enableDemoMode: process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE,
    privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL,
    termsUrl: process.env.EXPO_PUBLIC_TERMS_URL,
  },
  __DEV__,
);

if (__DEV__ && config.issues.length > 0) {
  console.warn(`[ColorTheory config]\n- ${config.issues.join('\n- ')}`);
}

export const isSupabaseConfigured = config.supabase !== null;
