import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AnalysisSession, FavoriteColor, OutfitPreview, SavedPalette } from '@/types/domain';

/**
 * Browser-local persistence for demo mode and for anything that must stay local.
 * Stores analysis *results* and metadata only (localStorage) — portrait images live in IndexedDB
 * (see storage/localPortraits.ts) and are referenced by `local-portrait:{id}`.
 *
 * Stores are created with `skipHydration` so the first client render matches the server HTML;
 * `AppProviders` rehydrates them once on mount, before auth initialises.
 */
interface LocalDataState {
  analyses: AnalysisSession[];
  palettes: SavedPalette[];
  favorites: FavoriteColor[];
  previews: OutfitPreview[];
  savedOutfits: { id: string; previewId: string; createdAt: string }[];
  set: (updater: (state: LocalDataSnapshot) => Partial<LocalDataSnapshot>) => void;
  reset: () => void;
}

export type LocalDataSnapshot = Pick<LocalDataState, 'analyses' | 'palettes' | 'favorites' | 'previews' | 'savedOutfits'>;

const EMPTY: LocalDataSnapshot = { analyses: [], palettes: [], favorites: [], previews: [], savedOutfits: [] };

export const useLocalDataStore = create<LocalDataState>()(
  persist(
    (set) => ({
      ...EMPTY,
      set: (updater) => set((state) => updater(state)),
      reset: () => set(EMPTY),
    }),
    {
      name: 'colortheory.local-data.v1',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ analyses, palettes, favorites, previews, savedOutfits }) => ({ analyses, palettes, favorites, previews, savedOutfits }),
    },
  ),
);

/**
 * Maps analysis IDs to portraits kept in *this* browser, for signed-in users who chose "keep
 * portraits on this device". The cloud row stores no local reference (it would be meaningless in
 * another browser), so this index fills it in locally.
 */
interface LocalPortraitIndexState {
  uris: Record<string, string>;
  setUri: (analysisId: string, uri: string) => void;
  remove: (analysisId: string) => void;
  clear: () => void;
}

export const useLocalPortraitIndex = create<LocalPortraitIndexState>()(
  persist(
    (set) => ({
      uris: {},
      setUri: (analysisId, uri) => set((s) => ({ uris: { ...s.uris, [analysisId]: uri } })),
      remove: (analysisId) =>
        set((s) => {
          const next = { ...s.uris };
          delete next[analysisId];
          return { uris: next };
        }),
      clear: () => set({ uris: {} }),
    }),
    { name: 'colortheory.portrait-index.v1', storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
