import { QueryClient } from '@tanstack/react-query';

import { AppError } from '@/utils/errors';

/**
 * TanStack Query caches *server* state (Supabase rows, signed URLs, IndexedDB lookups). Client-only
 * workflow state lives in Zustand stores, so there is never a second source of truth.
 * Browser focus and online/offline events are wired up by TanStack Query itself.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        retry: (failureCount, error) => {
          if (error instanceof AppError && !error.retryable) return false;
          return failureCount < 2;
        },
        networkMode: 'offlineFirst',
      },
      mutations: { networkMode: 'offlineFirst' },
    },
  });
}
