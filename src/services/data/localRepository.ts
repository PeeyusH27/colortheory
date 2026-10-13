import { deleteLocalPortrait } from '@/services/storage/localPortraits';
import type { AnalysisSession, CollectionStats, FavoriteColor, OutfitPreview, SavedOutfit, SavedPalette } from '@/types/domain';
import { AppError } from '@/utils/errors';
import { createId } from '@/utils/id';

import { useLocalDataStore } from './localDataStore';
import type { DataRepository, OutfitPreviewInput } from './types';

const now = () => new Date().toISOString();
const state = () => useLocalDataStore.getState();
const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);

function requireAnalysis(id: string): AnalysisSession {
  const found = state().analyses.find((a) => a.id === id);
  if (!found) throw new AppError('not_found', 'Analysis not found.');
  return found;
}

/** Device-only repository (demo mode). Mirrors cloud semantics, including cascading deletes. */
export class LocalRepository implements DataRepository {
  readonly mode = 'local' as const;
  readonly scope = 'local';

  async listAnalyses() {
    return [...state().analyses].sort(byNewest);
  }

  async getAnalysis(id: string) {
    return state().analyses.find((a) => a.id === id) ?? null;
  }

  async createAnalysis(input: Parameters<DataRepository['createAnalysis']>[0]) {
    const session: AnalysisSession = {
      id: input.id,
      createdAt: now(),
      status: input.status,
      provider: input.provider,
      portrait: input.portrait,
      result: null,
    };
    state().set((s) => ({ analyses: [session, ...s.analyses.filter((a) => a.id !== input.id)] }));
    return session;
  }

  async updateAnalysis(id: string, patch: Parameters<DataRepository['updateAnalysis']>[1]) {
    const current = requireAnalysis(id);
    const next: AnalysisSession = {
      ...current,
      status: patch.status ?? current.status,
      result: patch.result ?? current.result,
      portrait: { ...current.portrait, ...patch.portrait },
    };
    state().set((s) => ({ analyses: s.analyses.map((a) => (a.id === id ? next : a)) }));
    return next;
  }

  async deleteAnalysis(id: string) {
    const session = state().analyses.find((a) => a.id === id);
    await deleteLocalPortrait(session?.portrait.localUri);
    const previewIds = new Set(state().previews.filter((p) => p.analysisId === id).map((p) => p.id));
    state().set((s) => ({
      analyses: s.analyses.filter((a) => a.id !== id),
      previews: s.previews.filter((p) => !previewIds.has(p.id)),
      savedOutfits: s.savedOutfits.filter((o) => !previewIds.has(o.previewId)),
      // Like the SQL schema: palettes and favourites survive, detached from the deleted session.
      palettes: s.palettes.map((p) => (p.analysisId === id ? { ...p, analysisId: null } : p)),
      favorites: s.favorites.map((f) => (f.analysisId === id ? { ...f, analysisId: null } : f)),
    }));
  }

  async deleteAllAnalyses() {
    for (const a of state().analyses) await this.deleteAnalysis(a.id);
  }

  async deletePortrait(id: string) {
    const session = requireAnalysis(id);
    await deleteLocalPortrait(session.portrait.localUri);
    await this.updateAnalysis(id, { portrait: { location: 'deleted', localUri: null, storagePath: null } });
  }

  async listPalettes() {
    return [...state().palettes].sort(byNewest);
  }

  async savePalette(input: Parameters<DataRepository['savePalette']>[0]) {
    const palette: SavedPalette = { id: createId(), createdAt: now(), isFavorite: input.isFavorite ?? false, ...input };
    state().set((s) => ({ palettes: [palette, ...s.palettes] }));
    return palette;
  }

  async updatePalette(id: string, patch: Parameters<DataRepository['updatePalette']>[1]) {
    const current = state().palettes.find((p) => p.id === id);
    if (!current) throw new AppError('not_found', 'Palette not found.');
    const next = { ...current, ...patch };
    state().set((s) => ({ palettes: s.palettes.map((p) => (p.id === id ? next : p)) }));
    return next;
  }

  async deletePalette(id: string) {
    state().set((s) => ({ palettes: s.palettes.filter((p) => p.id !== id) }));
  }

  async listFavoriteColors() {
    return [...state().favorites].sort(byNewest);
  }

  async addFavoriteColor(input: Parameters<DataRepository['addFavoriteColor']>[0]) {
    const existing = state().favorites.find((f) => f.hex.toUpperCase() === input.hex.toUpperCase());
    if (existing) return existing;
    const favorite: FavoriteColor = { id: createId(), createdAt: now(), ...input, hex: input.hex.toUpperCase() };
    state().set((s) => ({ favorites: [favorite, ...s.favorites] }));
    return favorite;
  }

  async removeFavoriteColor(id: string) {
    state().set((s) => ({ favorites: s.favorites.filter((f) => f.id !== id) }));
  }

  async upsertOutfitPreview(input: OutfitPreviewInput) {
    const existing = state().previews.find(
      (p) => (input.id && p.id === input.id) || (p.analysisId === input.analysisId && p.outfitId === input.outfitId && p.mode === input.mode),
    );
    const preview: OutfitPreview = { ...input, id: existing?.id ?? input.id ?? createId(), createdAt: existing?.createdAt ?? now() };
    state().set((s) => ({ previews: [preview, ...s.previews.filter((p) => p.id !== preview.id)] }));
    return preview;
  }

  async listOutfitPreviews(analysisId: string) {
    return state().previews.filter((p) => p.analysisId === analysisId).sort(byNewest);
  }

  async saveOutfit(input: OutfitPreviewInput): Promise<SavedOutfit> {
    const preview = await this.upsertOutfitPreview(input);
    const existing = state().savedOutfits.find((o) => o.previewId === preview.id);
    if (existing) return { id: existing.id, createdAt: existing.createdAt, preview };
    const saved = { id: createId(), previewId: preview.id, createdAt: now() };
    state().set((s) => ({ savedOutfits: [saved, ...s.savedOutfits] }));
    return { id: saved.id, createdAt: saved.createdAt, preview };
  }

  async removeSavedOutfit(id: string) {
    state().set((s) => ({ savedOutfits: s.savedOutfits.filter((o) => o.id !== id) }));
  }

  async listSavedOutfits(): Promise<SavedOutfit[]> {
    const { savedOutfits, previews } = state();
    return savedOutfits
      .map((o) => {
        const preview = previews.find((p) => p.id === o.previewId);
        return preview ? { id: o.id, createdAt: o.createdAt, preview } : null;
      })
      .filter((x): x is SavedOutfit => x !== null)
      .sort(byNewest);
  }

  async getProfile() {
    return { id: 'demo-user', displayName: 'Guest', email: null, avatarUri: null };
  }

  async getStats(): Promise<CollectionStats> {
    const s = state();
    return {
      analyses: s.analyses.length,
      palettes: s.palettes.length,
      favoriteColors: s.favorites.length,
      savedOutfits: s.savedOutfits.length,
      cloudPortraits: 0,
    };
  }
}
