'use client';

import { toast } from '@/components/ui/Toast';
import type { Outfit } from '@/types/outfits';

import { shareOutfit, sharePalette } from './share';

/** Share helpers with user feedback ("Copied") for browsers without a share sheet. */
export function useShare() {
  const report = (outcome: Awaited<ReturnType<typeof shareOutfit>>) => {
    if (outcome === 'copied') toast.success('Copied to your clipboard');
    else if (outcome === 'unavailable') toast.error('Sharing isn’t available in this browser.');
  };
  return {
    outfit: (outfit: Outfit) => void shareOutfit(outfit).then(report),
    palette: (name: string, colors: { name: string; hex: string }[]) => void sharePalette(name, colors).then(report),
  };
}
