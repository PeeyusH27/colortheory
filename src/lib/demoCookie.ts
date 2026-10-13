/**
 * Demo mode marker cookie. It lets `proxy.ts` admit a demo visitor to app routes without a
 * Supabase session. It grants nothing on the server: demo data lives only in this browser, and
 * every Supabase request still needs a real session (RLS).
 */
export const DEMO_COOKIE = 'ct_demo';

export function setDemoCookie(enabled: boolean) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = enabled
    ? `${DEMO_COOKIE}=1; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`
    : `${DEMO_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
