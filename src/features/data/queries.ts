import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/authStore';
import { repositoryFor, type DataRepository, type OutfitPreviewInput } from '@/services/data';
import { BUCKETS, createSignedUrl } from '@/services/storage/portraitStorage';
import type { AnalysisSession, PaletteColor, SavedPalette } from '@/types/domain';

/**
 * TanStack Query hooks over the active repository. Query keys include the repository scope
 * (user ID or `local`) so switching accounts can never show another user's cached data.
 */

export function useRepository(): DataRepository {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  return repositoryFor(status, user);
}

export const queryKeys = {
  all: (scope: string) => ['data', scope] as const,
  analyses: (scope: string) => ['data', scope, 'analyses'] as const,
  analysis: (scope: string, id: string) => ['data', scope, 'analysis', id] as const,
  palettes: (scope: string) => ['data', scope, 'palettes'] as const,
  favorites: (scope: string) => ['data', scope, 'favorites'] as const,
  savedOutfits: (scope: string) => ['data', scope, 'saved-outfits'] as const,
  previews: (scope: string, analysisId: string) => ['data', scope, 'previews', analysisId] as const,
  stats: (scope: string) => ['data', scope, 'stats'] as const,
  profile: (scope: string) => ['data', scope, 'profile'] as const,
  signedUrl: (bucket: string, path: string) => ['signed-url', bucket, path] as const,
};

export function useAnalyses() {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.analyses(repo.scope), queryFn: () => repo.listAnalyses() });
}

export function useAnalysis(id: string | undefined) {
  const repo = useRepository();
  return useQuery({
    queryKey: queryKeys.analysis(repo.scope, id ?? 'none'),
    queryFn: () => repo.getAnalysis(id as string),
    enabled: Boolean(id),
  });
}

/** Most recent completed analysis, used by Discover / Outfits / My Colors. */
export function useLatestAnalysis() {
  const query = useAnalyses();
  const latest = query.data?.find((a) => a.status === 'completed' && a.result) ?? null;
  return { ...query, latest };
}

export function usePalettes() {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.palettes(repo.scope), queryFn: () => repo.listPalettes() });
}

export function useFavoriteColors() {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.favorites(repo.scope), queryFn: () => repo.listFavoriteColors() });
}

export function useSavedOutfits() {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.savedOutfits(repo.scope), queryFn: () => repo.listSavedOutfits() });
}

export function useStats() {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.stats(repo.scope), queryFn: () => repo.getStats() });
}

export function useProfile() {
  const repo = useRepository();
  return useQuery({ queryKey: queryKeys.profile(repo.scope), queryFn: () => repo.getProfile() });
}

/**
 * Display URI for a portrait: the on-device file when available, otherwise a short-lived signed
 * URL for the private cloud object (refreshed before it expires).
 */
export function usePortraitUri(session: AnalysisSession | null | undefined) {
  const localUri = session?.portrait.localUri ?? null;
  const path = session?.portrait.location === 'cloud' ? session.portrait.storagePath : null;
  const signed = useQuery({
    queryKey: queryKeys.signedUrl(BUCKETS.portraits, path ?? 'none'),
    queryFn: () => createSignedUrl(BUCKETS.portraits, path as string),
    enabled: !localUri && Boolean(path),
    staleTime: 8 * 60_000,
    gcTime: 9 * 60_000,
  });
  return localUri ?? signed.data ?? null;
}

export function useSignedPreviewUri(path: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.signedUrl(BUCKETS.previews, path ?? 'none'),
    queryFn: () => createSignedUrl(BUCKETS.previews, path as string),
    enabled: Boolean(path),
    staleTime: 8 * 60_000,
    gcTime: 9 * 60_000,
  });
}

function useInvalidate() {
  const client = useQueryClient();
  const repo = useRepository();
  return () => client.invalidateQueries({ queryKey: queryKeys.all(repo.scope) });
}

export function useDeleteAnalysis() {
  const repo = useRepository();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => repo.deleteAnalysis(id), onSettled: invalidate });
}

export function useDeleteAllAnalyses() {
  const repo = useRepository();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: () => repo.deleteAllAnalyses(), onSettled: invalidate });
}

export function useDeletePortrait() {
  const repo = useRepository();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => repo.deletePortrait(id), onSettled: invalidate });
}

export function useSavePalette() {
  const repo = useRepository();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { name: string; analysisId: string | null; kind: SavedPalette['kind']; colors: PaletteColor[]; isFavorite?: boolean }) =>
      repo.savePalette(input),
    onSettled: invalidate,
  });
}

export function useUpdatePalette() {
  const repo = useRepository();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name?: string; isFavorite?: boolean; colors?: PaletteColor[] } }) => repo.updatePalette(id, patch),
    onSettled: invalidate,
  });
}

export function useDeletePalette() {
  const repo = useRepository();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => repo.deletePalette(id), onSettled: invalidate });
}

export function useToggleFavoriteColor() {
  const repo = useRepository();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: { name: string; hex: string; analysisId: string | null; favoriteId?: string | null }) => {
      if (input.favoriteId) {
        await repo.removeFavoriteColor(input.favoriteId);
        return { favorited: false };
      }
      await repo.addFavoriteColor({ name: input.name, hex: input.hex, analysisId: input.analysisId });
      return { favorited: true };
    },
    onSettled: invalidate,
  });
}

export function useSaveOutfit() {
  const repo = useRepository();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (input: OutfitPreviewInput) => repo.saveOutfit(input), onSettled: invalidate });
}

export function useRemoveSavedOutfit() {
  const repo = useRepository();
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => repo.removeSavedOutfit(id), onSettled: invalidate });
}

export function useUpdateAnalysisResult() {
  const repo = useRepository();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, result }: { id: string; result: NonNullable<AnalysisSession['result']> }) => repo.updateAnalysis(id, { result }),
    onSettled: invalidate,
  });
}
