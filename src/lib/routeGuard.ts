/**
 * Pure routing rules used by `proxy.ts` (kept free of Next.js imports so they're unit-testable).
 * These are optimistic UX redirects, not access control: Row Level Security and private Storage
 * policies protect the data.
 */

/** Pages that need a signed-in user or demo mode. */
export const APP_PREFIXES = [
  '/discover',
  '/colors',
  '/outfits',
  '/profile',
  '/analyze',
  '/results',
  '/palette',
  '/gallery',
  '/outfit',
  '/history',
  '/settings',
  '/portraits',
] as const;

/** Pages only for signed-out visitors. */
export const GUEST_ONLY = ['/sign-in', '/sign-up', '/forgot-password', '/verify-email'] as const;

const matches = (pathname: string, prefixes: readonly string[]) => prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export interface RouteContext {
  pathname: string;
  /** Query string including the leading `?`, or an empty string. */
  search: string;
  signedIn: boolean;
  demo: boolean;
}

/** Where to send the visitor instead, or `null` to continue. */
export function decideRoute({ pathname, search, signedIn, demo }: RouteContext): string | null {
  if (matches(pathname, APP_PREFIXES) && !signedIn && !demo) {
    return `/sign-in?${new URLSearchParams({ next: `${pathname}${search}` })}`;
  }
  if (pathname === '/reset-password' && !signedIn) {
    return `/forgot-password?${new URLSearchParams({ link_error: 'Your reset link has expired. Request a new one.' })}`;
  }
  // The landing page doubles as the introduction; `/?intro=1` lets members revisit it.
  const landing = pathname === '/' && new URLSearchParams(search).get('intro') !== '1';
  if (signedIn && (matches(pathname, GUEST_ONLY) || landing)) return '/discover';
  if (demo && landing) return '/discover';
  return null;
}
