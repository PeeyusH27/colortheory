import { create } from 'zustand';

/**
 * The portrait currently moving through capture → confirmation → analysis.
 *
 * Deliberately NOT persisted: it's a temporary, sensitive image held in memory as a Blob. Client
 * navigation between the analyse pages keeps it; a reload or closing the tab discards it.
 * Nothing here is uploaded — uploads only happen in `runAnalysis` after explicit consent.
 */
export interface SelectedPortrait {
  /** Resized JPEG with all metadata (EXIF, GPS) stripped by re-encoding. */
  blob: Blob;
  /** Object URL for previews; revoked when the portrait is replaced or discarded. */
  url: string;
  width: number;
  height: number;
  source: 'camera' | 'library';
  facing?: 'front' | 'back';
  capturedAt: string;
}

interface PortraitState {
  portrait: SelectedPortrait | null;
  setPortrait: (portrait: Omit<SelectedPortrait, 'url'>) => void;
  /** Clears the selection and frees the in-memory image. */
  discard: () => void;
}

export const usePortraitStore = create<PortraitState>((set, get) => ({
  portrait: null,
  setPortrait: (portrait) => {
    const previous = get().portrait;
    if (previous) URL.revokeObjectURL(previous.url);
    set({ portrait: { ...portrait, url: URL.createObjectURL(portrait.blob) } });
  },
  discard: () => {
    const current = get().portrait;
    if (current) URL.revokeObjectURL(current.url);
    set({ portrait: null });
  },
}));
