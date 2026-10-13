'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ColorDetailSheet, type ColorDetailSheetColor } from '@/components/colors/ColorDetailSheet';
import { toast } from '@/components/ui/Toast';
import { useFavoriteColors, useToggleFavoriteColor } from '@/features/data/queries';
import { routes } from '@/lib/routes';
import { usePreferencesStore } from '@/store/preferencesStore';
import { friendlyError } from '@/utils/errors';

/**
 * Colour detail sheet with favourite toggling and a jump to matching outfits. Shared by results,
 * palette and My Colors so the behaviour (and the "recently viewed" record) is identical.
 */
export function useColorDetail(analysisId: string | null) {
  const router = useRouter();
  const favorites = useFavoriteColors();
  const toggleFavorite = useToggleFavoriteColor();
  const addRecent = usePreferencesStore((s) => s.addRecentlyViewed);
  const [detail, setDetail] = useState<ColorDetailSheetColor | null>(null);
  const favoriteByHex = new Map((favorites.data ?? []).map((f) => [f.hex.toUpperCase(), f]));

  const open = (color: ColorDetailSheetColor) => {
    addRecent({ kind: 'color', id: color.hex, label: color.name, hex: color.hex });
    setDetail(color);
  };

  const sheet = (
    <ColorDetailSheet
      color={detail}
      onClose={() => setDetail(null)}
      isFavorite={detail ? favoriteByHex.has(detail.hex.toUpperCase()) : false}
      favoritePending={toggleFavorite.isPending}
      onToggleFavorite={() => {
        if (!detail) return;
        const fav = favoriteByHex.get(detail.hex.toUpperCase());
        toggleFavorite.mutate(
          { name: detail.name, hex: detail.hex, analysisId, favoriteId: fav?.id ?? null },
          {
            onSuccess: (r) => toast.show(r.favorited ? 'Added to favourite colours' : 'Removed from favourites'),
            onError: (e) => toast.error(friendlyError(e).body),
          },
        );
      }}
      onShowOutfits={
        analysisId
          ? () => {
              const hex = detail?.hex;
              setDetail(null);
              router.push(`${routes.gallery(analysisId)}${hex ? `?color=${encodeURIComponent(hex)}` : ''}`);
            }
          : undefined
      }
    />
  );

  return { open, sheet, isFavorite: (hex: string) => favoriteByHex.has(hex.toUpperCase()) };
}
