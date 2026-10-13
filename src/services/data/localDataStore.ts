import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AnalysisSession, FavoriteColor, OutfitPreview, SavedPalette } from '@/types/domain';

/**
 * On-device persistence for demo mode and for anything that must stay local.
 * Stores analysis *results* and metadata only — portrait files live in the app's document
 * directory (see storage/localFiles.ts) and are referenced by URI.
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
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ analyses, palettes, favorites, previews, savedOutfits }) => ({ analyses, palettes, favorites, previews, savedOutfits }),
    },
  ),
);

/**
 * Maps analysis IDs to portrait files kept on *this* device, for signed-in users who chose
 * "keep portraits on this device". The cloud row stores no device path (it would be meaningless
 * on another phone), so this index fills it in locally.
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
    { name: 'colortheory.portrait-index.v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
