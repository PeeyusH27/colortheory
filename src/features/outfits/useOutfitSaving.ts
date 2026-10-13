import { toast } from '@/components/ui/Toast';
import { useRemoveSavedOutfit, useSaveOutfit, useSavedOutfits } from '@/features/data/queries';
import { haptics } from '@/lib/haptics';
import type { Outfit } from '@/types/outfits';
import { friendlyError } from '@/utils/errors';

/**
 * Save/unsave outfits to the wardrobe. A saved template outfit is stored as a "drape" preview
 * record (Mode A) — it never pretends to be a generated image.
 */
export function useOutfitSaving(analysisId: string | null, isDemo: boolean) {
  const saved = useSavedOutfits();
  const save = useSaveOutfit();
  const remove = useRemoveSavedOutfit();

  const savedFor = (outfitId: string) =>
    saved.data?.find((s) => s.preview.outfitId === outfitId && s.preview.analysisId === analysisId && s.preview.mode === 'drape');

  const savedIds = new Set(
    (saved.data ?? []).filter((s) => s.preview.analysisId === analysisId && s.preview.mode === 'drape').map((s) => s.preview.outfitId),
  );

  const toggle = (outfit: Outfit) => {
    const existing = savedFor(outfit.id);
    haptics.selection();
    if (existing) {
      remove.mutate(existing.id, {
        onSuccess: () => toast.show('Removed from your wardrobe'),
        onError: (e) => toast.error(friendlyError(e).body),
      });
      return;
    }
    save.mutate(
      {
        analysisId,
        outfitId: outfit.id,
        outfitName: outfit.name,
        garmentHex: outfit.mainColor.hex,
        mode: 'drape',
        provider: 'template',
        generationStatus: 'not_requested',
        imageUri: null,
        imagePath: null,
        isDemo,
      },
      {
        onSuccess: () => toast.success('Saved to your wardrobe'),
        onError: (e) => toast.error(friendlyError(e).body),
      },
    );
  };

  return { savedIds, toggle, isSaving: save.isPending || remove.isPending };
}
