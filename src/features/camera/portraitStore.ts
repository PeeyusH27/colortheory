import { create } from 'zustand';

import { deleteFileQuietly, isAppOwnedPortrait } from '@/services/storage/localFiles';

/**
 * The portrait currently moving through capture → confirmation → analysis.
 *
 * Deliberately NOT persisted: it's a temporary, sensitive file. Keeping it in memory means
 * ordinary back/forward navigation never loses it, while killing the app discards it.
 */
export interface SelectedPortrait {
  uri: string;
  width: number;
  height: number;
  source: 'camera' | 'library';
  facing?: 'front' | 'back';
  capturedAt: string;
}

interface PortraitState {
  portrait: SelectedPortrait | null;
  setPortrait: (portrait: SelectedPortrait) => void;
  /** Clears the selection and deletes the temporary file (unless it was persisted for history). */
  discard: () => void;
  /** Clears the selection without deleting the file (it now belongs to a saved analysis). */
  release: () => void;
}

export const usePortraitStore = create<PortraitState>((set, get) => ({
  portrait: null,
  setPortrait: (portrait) => {
    const previous = get().portrait;
    if (previous && previous.uri !== portrait.uri && !isAppOwnedPortrait(previous.uri)) deleteFileQuietly(previous.uri);
    set({ portrait });
  },
  discard: () => {
    const current = get().portrait;
    if (current && !isAppOwnedPortrait(current.uri)) deleteFileQuietly(current.uri);
    set({ portrait: null });
  },
  release: () => set({ portrait: null }),
}));
