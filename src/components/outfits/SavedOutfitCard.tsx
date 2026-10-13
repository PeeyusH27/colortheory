'use client';

/* eslint-disable @next/next/no-img-element -- AI previews are short-lived signed URLs from private storage */
import { Trash2 } from 'lucide-react';
import Link from 'next/link';

import { useAnalysis, useSignedPreviewUri } from '@/features/data/queries';
import { findOutfit } from '@/features/outfits/recommendOutfits';
import { routes } from '@/lib/routes';
import type { SavedOutfit } from '@/types/domain';
import { formatDate } from '@/utils/format';

import { ProvenanceBadge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';

import { OutfitFlatLay } from './OutfitFlatLay';

/** Wardrobe tile. Rebuilds the illustrated outfit from its analysis, or shows the stored AI image. */
export function SavedOutfitCard({ saved, onRemove }: { saved: SavedOutfit; onRemove: () => void }) {
  const { preview } = saved;
  const analysis = useAnalysis(preview.analysisId ?? undefined);
  const signed = useSignedPreviewUri(preview.mode === 'ai' ? preview.imagePath : null);
  const outfit = analysis.data?.result ? findOutfit(analysis.data.result, preview.outfitId) : null;
  const imageUri = preview.imageUri ?? signed.data ?? null;

  return (
    <article className="editorial-frame relative flex h-full flex-col bg-paper">
      <Link href={routes.outfit(preview.analysisId, preview.outfitId)} className="flex flex-1 flex-col" aria-label={`${preview.outfitName}, saved ${formatDate(saved.createdAt)}`}>
        <div className="relative">
          {preview.mode === 'ai' && imageUri ? (
            <img src={imageUri} alt="" className="aspect-[4/5] w-full object-cover" />
          ) : outfit ? (
            <OutfitFlatLay pieces={outfit.pieces} />
          ) : (
            <div aria-hidden className="aspect-square w-full" style={{ backgroundColor: preview.garmentHex }} />
          )}
          {preview.isDemo || preview.mode === 'ai' ? <ProvenanceBadge kind={preview.isDemo ? 'demo' : 'ai'} className="absolute top-2 left-2" /> : null}
        </div>
        <div className="flex flex-col gap-1 border-t-[1.5px] border-navy p-3 pr-12">
          <span className="type-label line-clamp-2 text-navy">{preview.outfitName}</span>
          <span className="type-caption text-muted">Saved {formatDate(saved.createdAt)}</span>
        </div>
      </Link>
      <IconButton icon={Trash2} label={`Remove ${preview.outfitName} from wardrobe`} onClick={onRemove} size={36} iconSize={16} className="absolute right-2 bottom-2" />
    </article>
  );
}
