import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Small, non-sensitive preferences persisted to localStorage (this browser only).
 * Never store tokens, portraits or analysis data here. `skipHydration` keeps the first client
 * render identical to the server HTML; `AppProviders` rehydrates on mount.
 */
export type PortraitStoragePreference = 'device' | 'cloud';

interface PreferencesState {
  hasHydrated: boolean;
  hasCompletedOnboarding: boolean;
  /** The user explicitly chose "Explore in demo mode". */
  demoMode: boolean;
  /** Where to keep the original portrait after an analysis. Cloud requires sign-in. */
  portraitStorage: PortraitStoragePreference;
  /** Profile picture as a small JPEG data URL, kept in this browser only (never uploaded). */
  avatarUri: string | null;
  /** Hexes / outfit IDs the user looked at recently (device-only, capped). */
  recentlyViewed: { kind: 'color' | 'outfit'; id: string; label: string; hex: string; at: string }[];
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setDemoMode: (enabled: boolean) => void;
  setPortraitStorage: (value: PortraitStoragePreference) => void;
  setAvatarUri: (uri: string | null) => void;
  addRecentlyViewed: (item: { kind: 'color' | 'outfit'; id: string; label: string; hex: string }) => void;
  clearRecentlyViewed: () => void;
  setHydrated: () => void;
}

const MAX_RECENT = 12;

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      hasCompletedOnboarding: false,
      demoMode: false,
      portraitStorage: 'device',
      avatarUri: null,
      recentlyViewed: [],
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
      setDemoMode: (enabled) => set({ demoMode: enabled }),
      setPortraitStorage: (value) => set({ portraitStorage: value }),
      setAvatarUri: (uri) => set({ avatarUri: uri }),
      addRecentlyViewed: (item) =>
        set((s) => ({
          recentlyViewed: [
            { ...item, at: new Date().toISOString() },
            ...s.recentlyViewed.filter((r) => !(r.kind === item.kind && r.id === item.id)),
          ].slice(0, MAX_RECENT),
        })),
      clearRecentlyViewed: () => set({ recentlyViewed: [] }),
      setHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: 'colortheory.preferences.v1',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ hasCompletedOnboarding, demoMode, portraitStorage, avatarUri, recentlyViewed }) => ({
        hasCompletedOnboarding,
        demoMode,
        portraitStorage,
        avatarUri,
        recentlyViewed,
      }),
      onRehydrateStorage: () => (state, error) => {
        // Even if storage is unreadable, mark hydrated so the app can start with defaults.
        if (error) console.warn('[preferences] rehydrate failed', error);
        (state ?? usePreferencesStore.getState()).setHydrated();
      },
    },
  ),
);
