'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

import { initializeAuth } from '@/features/auth/authService';
import { createQueryClient } from '@/lib/queryClient';
import { useLocalDataStore, useLocalPortraitIndex } from '@/services/data/localDataStore';
import { usePreferencesStore } from '@/store/preferencesStore';

import { Toaster } from '../ui/Toast';

let bootstrapped = false;

/**
 * Client-side app state. Persisted stores are rehydrated from localStorage after the first render
 * (so the server HTML and the first client render match), then auth is initialised from the
 * Supabase cookie session. Until then `useAuthStore().status` is `initializing`.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    if (bootstrapped) return;
    bootstrapped = true;
    void (async () => {
      await Promise.all([
        usePreferencesStore.persist.rehydrate(),
        useLocalDataStore.persist.rehydrate(),
        useLocalPortraitIndex.persist.rehydrate(),
      ]);
      await initializeAuth();
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
