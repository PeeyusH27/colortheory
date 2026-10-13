'use client';

import { Trash2 } from 'lucide-react';
import Link from 'next/link';

import { usePortraitUri } from '@/features/data/queries';
import { isLocalPortraitRef } from '@/services/storage/localPortraits';
import { routes } from '@/lib/routes';
import type { AnalysisSession } from '@/types/domain';
import { formatDate } from '@/utils/format';

import { PaletteStrip } from '../colors/PaletteStrip';
import { PortraitFrame } from '../outfits/PortraitFrame';
import { Badge, ProvenanceBadge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';

import { provenanceOf } from './LatestStoryCard';

function locationLabel(session: AnalysisSession) {
  const { location, localUri } = session.portrait;
  if (location === 'cloud') return 'Portrait in private cloud';
  if (location === 'device') return isLocalPortraitRef(localUri) ? 'Portrait in this browser' : 'No portrait in this browser';
  return 'Portrait deleted';
}

export function AnalysisHistoryItem({ session, savedOutfitCount, onDelete }: { session: AnalysisSession; savedOutfitCount: number; onDelete: () => void }) {
  const portraitUri = usePortraitUri(session);
  const result = session.result;
  const date = formatDate(session.createdAt, { day: 'numeric', month: 'long', year: 'numeric' });
  const title = result?.headline ?? (session.status === 'failed' ? 'Analysis failed' : 'Incomplete analysis');

  const body = (
    <>
      <PortraitFrame uri={session.portrait.location === 'deleted' ? null : (portraitUri ?? undefined)} shadow="none" alt="" className="w-20 shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="type-eyebrow text-muted">{date}</span>
        <span className="type-label line-clamp-2 text-navy">{title}</span>
        {result ? <PaletteStrip colors={result.recommendedColors.slice(0, 6)} height={18} /> : null}
        <span className="flex flex-wrap gap-2">
          <ProvenanceBadge kind={provenanceOf(session)} />
          {savedOutfitCount ? <Badge label={`${savedOutfitCount} saved`} /> : null}
        </span>
        <span className="type-caption text-muted">{locationLabel(session)}</span>
      </span>
    </>
  );

  return (
    <article className="editorial-frame relative bg-paper">
      {result ? (
        <Link href={routes.results(session.id)} className="flex gap-4 p-3 pr-14 transition-colors hover:bg-sand/50" aria-label={`Analysis from ${date}. ${title}`}>
          {body}
        </Link>
      ) : (
        <div className="flex gap-4 p-3 pr-14">{body}</div>
      )}
      <IconButton icon={Trash2} label={`Delete analysis from ${date}`} onClick={onDelete} size={40} iconSize={18} className="absolute top-2 right-2" />
    </article>
  );
}
