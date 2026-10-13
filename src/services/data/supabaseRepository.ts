import { getSupabase } from '@/services/supabase/client';
import { BUCKETS, deleteAnalysisObjects, removeObjects } from '@/services/storage/portraitStorage';
import { deleteLocalPortrait } from '@/services/storage/localPortraits';
import type { Database, Json, Tables } from '@/types/database';
import type {
  AnalysisSession,
  CollectionStats,
  ColorAnalysisResult,
  FavoriteColor,
  OutfitPreview,
  PaletteColor,
  SavedOutfit,
  SavedPalette,
  UserProfile,
} from '@/types/domain';
import { AppError } from '@/utils/errors';

import { useLocalPortraitIndex } from './localDataStore';
import type { DataRepository, OutfitPreviewInput } from './types';

/**
 * Supabase-backed repository for signed-in users. Every query runs with the user's JWT, so Row
 * Level Security — not this code — is what guarantees users only see their own rows. `user_id`
 * columns default to `auth.uid()` in SQL and are never sent from the client.
 */

function fail(error: { message?: string; code?: string } | null, fallback = 'We couldn’t sync with the server.'): never {
  if (error?.code === 'PGRST301' || /JWT/i.test(error?.message ?? '')) {
    throw new AppError('session_expired', 'Your session expired. Please sign in again.', { detail: error?.message });
  }
  throw new AppError('network', fallback, { detail: error?.message });
}

function parseResult(value: Json | null): ColorAnalysisResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return (value as { schemaVersion?: unknown }).schemaVersion === 1 ? (value as unknown as ColorAnalysisResult) : null;
}

function parseColors(value: Json): PaletteColor[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((c) =>
    c && typeof c === 'object' && !Array.isArray(c) && typeof c.hex === 'string' && typeof c.name === 'string' ? [{ name: c.name, hex: c.hex }] : [],
  );
}

const localUriFor = (analysisId: string) => useLocalPortraitIndex.getState().uris[analysisId] ?? null;

function toSession(row: Tables<'analysis_sessions'>): AnalysisSession {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    provider: row.model_provider,
    portrait: {
      location: row.portrait_location,
      localUri: row.portrait_location === 'deleted' ? null : localUriFor(row.id),
      storagePath: row.original_image_path,
    },
    result: parseResult(row.analysis_result),
  };
}

function toPalette(row: Tables<'color_palettes'>): SavedPalette {
  return {
    id: row.id,
    analysisId: row.analysis_id,
    name: row.name,
    kind: row.kind,
    colors: parseColors(row.colors),
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
  };
}

function toFavorite(row: Tables<'favorite_colors'>): FavoriteColor {
  return { id: row.id, name: row.name, hex: row.hex, analysisId: row.analysis_id, createdAt: row.created_at };
}

function toPreview(row: Tables<'outfit_previews'>): OutfitPreview {
  return {
    id: row.id,
    analysisId: row.analysis_id,
    outfitId: row.outfit_id,
    outfitName: row.outfit_name,
    garmentHex: row.garment_color,
    mode: row.mode,
    provider: row.provider,
    generationStatus: row.generation_status,
    imageUri: null, // resolved on demand through a signed URL
    imagePath: row.image_path,
    isDemo: row.is_demo,
    createdAt: row.created_at,
  };
}

export class SupabaseRepository implements DataRepository {
  readonly mode = 'cloud' as const;

  constructor(
    private readonly userId: string,
    private readonly email: string | null,
  ) {}

  get scope() {
    return this.userId;
  }

  async listAnalyses() {
    const { data, error } = await getSupabase().from('analysis_sessions').select('*').order('created_at', { ascending: false });
    if (error) fail(error);
    return (data ?? []).map(toSession);
  }

  async getAnalysis(id: string) {
    const { data, error } = await getSupabase().from('analysis_sessions').select('*').eq('id', id).maybeSingle();
    if (error) fail(error);
    return data ? toSession(data) : null;
  }

  async createAnalysis(input: Parameters<DataRepository['createAnalysis']>[0]) {
    const { data, error } = await getSupabase()
      .from('analysis_sessions')
      .insert({
        id: input.id,
        status: input.status,
        model_provider: input.provider,
        portrait_location: input.portrait.location,
        original_image_path: input.portrait.storagePath,
        is_demo: input.isDemo,
      })
      .select('*')
      .single();
    if (error) fail(error, 'We couldn’t save this analysis.');
    if (input.portrait.localUri) useLocalPortraitIndex.getState().setUri(input.id, input.portrait.localUri);
    return toSession(data);
  }

  async updateAnalysis(id: string, patch: Parameters<DataRepository['updateAnalysis']>[1]) {
    const update: Database['public']['Tables']['analysis_sessions']['Update'] = {};
    if (patch.status) update.status = patch.status;
    if (patch.result) update.analysis_result = patch.result as unknown as Json;
    if (patch.portrait?.location) update.portrait_location = patch.portrait.location;
    if (patch.portrait && 'storagePath' in patch.portrait) update.original_image_path = patch.portrait.storagePath ?? null;
    const { data, error } = await getSupabase().from('analysis_sessions').update(update).eq('id', id).select('*').single();
    if (error) fail(error, 'We couldn’t update this analysis.');
    if (patch.portrait?.localUri) useLocalPortraitIndex.getState().setUri(id, patch.portrait.localUri);
    return toSession(data);
  }

  async deleteAnalysis(id: string) {
    // Storage first: if it fails, the row (and the user's delete button) remain for a retry,
    // instead of leaving unreachable files behind.
    await deleteAnalysisObjects(this.userId, id);
    const { error } = await getSupabase().from('analysis_sessions').delete().eq('id', id);
    if (error) fail(error, 'We couldn’t delete this analysis.');
    await deleteLocalPortrait(localUriFor(id));
    useLocalPortraitIndex.getState().remove(id);
  }

  async deleteAllAnalyses() {
    const sessions = await this.listAnalyses();
    for (const s of sessions) await this.deleteAnalysis(s.id);
  }

  async deletePortrait(id: string) {
    const session = await this.getAnalysis(id);
    if (!session) throw new AppError('not_found', 'Analysis not found.');
    if (session.portrait.storagePath) await removeObjects(BUCKETS.portraits, [session.portrait.storagePath]);
    await deleteLocalPortrait(session.portrait.localUri);
    useLocalPortraitIndex.getState().remove(id);
    await this.updateAnalysis(id, { portrait: { location: 'deleted', storagePath: null, localUri: null } });
  }

  async listPalettes() {
    const { data, error } = await getSupabase().from('color_palettes').select('*').order('created_at', { ascending: false });
    if (error) fail(error);
    return (data ?? []).map(toPalette);
  }

  async savePalette(input: Parameters<DataRepository['savePalette']>[0]) {
    const { data, error } = await getSupabase()
      .from('color_palettes')
      .insert({
        name: input.name,
        analysis_id: input.analysisId,
        kind: input.kind,
        colors: input.colors as unknown as Json,
        is_favorite: input.isFavorite ?? false,
      })
      .select('*')
      .single();
    if (error) fail(error, 'We couldn’t save this palette.');
    return toPalette(data);
  }

  async updatePalette(id: string, patch: Parameters<DataRepository['updatePalette']>[1]) {
    const { data, error } = await getSupabase()
      .from('color_palettes')
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.isFavorite !== undefined ? { is_favorite: patch.isFavorite } : {}),
        ...(patch.colors !== undefined ? { colors: patch.colors as unknown as Json } : {}),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) fail(error, 'We couldn’t update this palette.');
    return toPalette(data);
  }

  async deletePalette(id: string) {
    const { error } = await getSupabase().from('color_palettes').delete().eq('id', id);
    if (error) fail(error, 'We couldn’t delete this palette.');
  }

  async listFavoriteColors() {
    const { data, error } = await getSupabase().from('favorite_colors').select('*').order('created_at', { ascending: false });
    if (error) fail(error);
    return (data ?? []).map(toFavorite);
  }

  async addFavoriteColor(input: Parameters<DataRepository['addFavoriteColor']>[0]) {
    const { data, error } = await getSupabase()
      .from('favorite_colors')
      .upsert({ name: input.name, hex: input.hex.toUpperCase(), analysis_id: input.analysisId }, { onConflict: 'user_id,hex' })
      .select('*')
      .single();
    if (error) fail(error, 'We couldn’t save this colour.');
    return toFavorite(data);
  }

  async removeFavoriteColor(id: string) {
    const { error } = await getSupabase().from('favorite_colors').delete().eq('id', id);
    if (error) fail(error, 'We couldn’t remove this colour.');
  }

  async upsertOutfitPreview(input: OutfitPreviewInput) {
    const supabase = getSupabase();
    // AI previews are created by the Edge Function; the client only records drape previews.
    if (input.id) {
      const { data, error } = await supabase.from('outfit_previews').select('*').eq('id', input.id).maybeSingle();
      if (error) fail(error);
      if (data) return toPreview(data);
    }
    let query = supabase.from('outfit_previews').select('*').eq('outfit_id', input.outfitId).eq('mode', input.mode);
    query = input.analysisId ? query.eq('analysis_id', input.analysisId) : query.is('analysis_id', null);
    const { data: existing, error: findError } = await query.limit(1).maybeSingle();
    if (findError) fail(findError);
    if (existing) return toPreview(existing);

    const { data, error } = await supabase
      .from('outfit_previews')
      .insert({
        analysis_id: input.analysisId,
        outfit_id: input.outfitId,
        outfit_name: input.outfitName,
        garment_color: input.garmentHex,
        mode: input.mode,
        provider: input.provider,
        generation_status: input.generationStatus,
        image_path: input.imagePath,
        is_demo: input.isDemo,
      })
      .select('*')
      .single();
    if (error) fail(error, 'We couldn’t save this outfit.');
    return toPreview(data);
  }

  async listOutfitPreviews(analysisId: string) {
    const { data, error } = await getSupabase()
      .from('outfit_previews')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('created_at', { ascending: false });
    if (error) fail(error);
    return (data ?? []).map(toPreview);
  }

  async saveOutfit(input: OutfitPreviewInput): Promise<SavedOutfit> {
    const preview = await this.upsertOutfitPreview(input);
    const { data, error } = await getSupabase()
      .from('saved_outfits')
      .upsert({ outfit_preview_id: preview.id }, { onConflict: 'user_id,outfit_preview_id' })
      .select('*')
      .single();
    if (error) fail(error, 'We couldn’t save this outfit.');
    return { id: data.id, createdAt: data.created_at, preview };
  }

  async removeSavedOutfit(id: string) {
    const { error } = await getSupabase().from('saved_outfits').delete().eq('id', id);
    if (error) fail(error, 'We couldn’t remove this outfit.');
  }

  async listSavedOutfits(): Promise<SavedOutfit[]> {
    const supabase = getSupabase();
    const { data: saved, error } = await supabase.from('saved_outfits').select('*').order('created_at', { ascending: false });
    if (error) fail(error);
    if (!saved?.length) return [];
    const { data: previews, error: previewError } = await supabase
      .from('outfit_previews')
      .select('*')
      .in(
        'id',
        saved.map((s) => s.outfit_preview_id),
      );
    if (previewError) fail(previewError);
    const byId = new Map((previews ?? []).map((p) => [p.id, toPreview(p)]));
    return saved.flatMap((s) => {
      const preview = byId.get(s.outfit_preview_id);
      return preview ? [{ id: s.id, createdAt: s.created_at, preview }] : [];
    });
  }

  async getProfile(): Promise<UserProfile | null> {
    const { data, error } = await getSupabase().from('profiles').select('*').eq('id', this.userId).maybeSingle();
    if (error) fail(error);
    return { id: this.userId, displayName: data?.display_name ?? null, email: this.email, avatarUri: null };
  }

  async getStats(): Promise<CollectionStats> {
    const supabase = getSupabase();
    const count = async (table: 'analysis_sessions' | 'color_palettes' | 'favorite_colors' | 'saved_outfits') => {
      const { count: c, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
      if (error) fail(error);
      return c ?? 0;
    };
    const { count: cloudPortraits, error } = await supabase
      .from('analysis_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('portrait_location', 'cloud');
    if (error) fail(error);
    const [analyses, palettes, favoriteColors, savedOutfits] = await Promise.all([
      count('analysis_sessions'),
      count('color_palettes'),
      count('favorite_colors'),
      count('saved_outfits'),
    ]);
    return { analyses, palettes, favoriteColors, savedOutfits, cloudPortraits: cloudPortraits ?? 0 };
  }
}
