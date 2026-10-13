'use client';

import Link from 'next/link';

import { usePortraitUri } from '@/features/data/queries';
import { routes } from '@/lib/routes';
import type { AnalysisSession } from '@/types/domain';
import { formatRelative } from '@/utils/format';

import { PaletteStrip } from '../colors/PaletteStrip';
import { PortraitFrame } from '../outfits/PortraitFrame';
import { ProvenanceBadge, type Provenance } from '../ui/Badge';

export function provenanceOf(session: Pick<AnalysisSession, 'provider' | 'result'>): Provenance {
  if (session.result?.isDemo) return 'demo';
  return session.provider === 'remote' ? 'remote' : 'device';
}

/** Compact link card for an analysis: portrait, headline, provenance and palette. */
export function LatestStoryCard({ session }: { session: AnalysisSession }) {
  const portraitUri = usePortraitUri(session);
  const result = session.result;
  if (!result) return null;
  return (
    <Link
      href={routes.results(session.id)}
      className="editorial-frame group flex gap-4 bg-paper p-3 shadow-offset-sm transition-transform duration-150 hover:-translate-y-0.5">
      <PortraitFrame
        uri={session.portrait.location === 'deleted' ? null : (portraitUri ?? undefined)}
        shadow="none"
        alt=""
        className="w-24 shrink-0"
        placeholder={result.isDemo ? <span className="absolute inset-0 bg-[linear-gradient(135deg,#2E5B89,#172A46)]" /> : undefined}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <ProvenanceBadge kind={provenanceOf(session)} />
        <span className="type-h3 line-clamp-3 text-navy group-hover:underline group-hover:underline-offset-4">{result.headline}</span>
        <span className="type-caption text-muted">{formatRelative(session.createdAt)}</span>
        <PaletteStrip colors={result.recommendedColors.slice(0, 6)} height={20} />
      </span>
    </Link>
  );
}
