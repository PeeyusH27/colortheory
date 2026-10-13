'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => undefined;

/**
 * Reads a browser-only or time-dependent value (greeting, "3 min ago") after hydration. The server
 * render and prerender get `fallback`, so the static shell never bakes in a stale clock value.
 */
export function useClientValue<T>(read: () => T, fallback: T): T {
  return useSyncExternalStore(noopSubscribe, read, () => fallback);
}
