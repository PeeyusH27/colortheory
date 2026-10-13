import type {
  AnalysisSession,
  AnalysisStatus,
  CollectionStats,
  ColorAnalysisResult,
  FavoriteColor,
  OutfitPreview,
  PaletteColor,
  SavedOutfit,
  SavedPalette,
  UserProfile,
} from '@/types/domain';

/**
 * Persistence contract shared by the local (demo / signed-out) and Supabase (signed-in)
 * implementations. Screens use TanStack Query hooks built on this interface and never know which
 * backend they're talking to.
 */
export interface CreateAnalysisInput {
  id: string;
  provider: AnalysisSession['provider'];
  status: AnalysisStatus;
  portrait: AnalysisSession['portrait'];
  isDemo: boolean;
}

export type OutfitPreviewInput = Omit<OutfitPreview, 'id' | 'createdAt'> & { id?: string };

export interface DataRepository {
  readonly mode: 'local' | 'cloud';
  /** Cache-key scope: the user ID for cloud data, `local` for on-device data. */
  readonly scope: string;

  listAnalyses(): Promise<AnalysisSession[]>;
  getAnalysis(id: string): Promise<AnalysisSession | null>;
  createAnalysis(input: CreateAnalysisInput): Promise<AnalysisSession>;
  updateAnalysis(id: string, patch: { status?: AnalysisStatus; result?: ColorAnalysisResult; portrait?: Partial<AnalysisSession['portrait']> }): Promise<AnalysisSession>;
  /** Deletes the session, its portrait and generated previews. */
  deleteAnalysis(id: string): Promise<void>;
  deleteAllAnalyses(): Promise<void>;
  /** Removes only the portrait image; colour results are kept. */
  deletePortrait(id: string): Promise<void>;

  listPalettes(): Promise<SavedPalette[]>;
  savePalette(input: { name: string; analysisId: string | null; kind: SavedPalette['kind']; colors: PaletteColor[]; isFavorite?: boolean }): Promise<SavedPalette>;
  updatePalette(id: string, patch: { name?: string; isFavorite?: boolean; colors?: PaletteColor[] }): Promise<SavedPalette>;
  deletePalette(id: string): Promise<void>;

  listFavoriteColors(): Promise<FavoriteColor[]>;
  addFavoriteColor(input: { name: string; hex: string; analysisId: string | null }): Promise<FavoriteColor>;
  removeFavoriteColor(id: string): Promise<void>;

  listSavedOutfits(): Promise<SavedOutfit[]>;
  /** Creates (or reuses) a preview record and marks it saved. */
  saveOutfit(preview: OutfitPreviewInput): Promise<SavedOutfit>;
  removeSavedOutfit(id: string): Promise<void>;
  /** Records a preview without saving it (e.g. an AI generation the user hasn't saved yet). */
  upsertOutfitPreview(preview: OutfitPreviewInput): Promise<OutfitPreview>;
  listOutfitPreviews(analysisId: string): Promise<OutfitPreview[]>;

  getProfile(): Promise<UserProfile | null>;
  getStats(): Promise<CollectionStats>;
}
