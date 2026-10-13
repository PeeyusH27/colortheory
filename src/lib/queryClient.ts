import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState, Platform } from 'react-native';

import { AppError } from '@/utils/errors';

/**
 * TanStack Query caches *server* state (Supabase rows, signed URLs). Client-only workflow state
 * lives in Zustand stores. Keeping them separate avoids two sources of truth for the same data.
 */
export const queryClient = new QueryClient({
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
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// Pause/resume queries with real connectivity instead of browser `online` events.
if (Platform.OS !== 'web') {
  onlineManager.setEventListener((setOnline) => {
    const subscription = Network.addNetworkStateListener((state) => {
      setOnline(state.isConnected !== false);
    });
    return () => subscription.remove();
  });

  // Refetch stale data when the app returns to the foreground.
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener('change', (status) => setFocused(status === 'active'));
    return () => subscription.remove();
  });
}
