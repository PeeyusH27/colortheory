'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { LinkButton } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useLatestAnalysis, usePortraitUri } from '@/features/data/queries';
import { OutfitGalleryView } from '@/features/outfits/OutfitGalleryView';
import { EDITORS_PALETTE } from '@/mocks/demoAnalysis';

export function OutfitsView() {
  const { latest, isPending, error, refetch } = useLatestAnalysis();
  const portraitUri = usePortraitUri(latest);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        className="page"
        eyebrow="Outfit studio"
        title="Outfits"
        subtitle={isPending ? ' ' : latest?.result ? latest.result.headline : 'Editor’s picks while you get started.'}
        actions={
          latest ? (
            <LinkButton href="/history" variant="ghost" size="sm">
              History
            </LinkButton>
          ) : undefined
        }
      />
      {isPending ? (
        <LoadingState label="Loading your outfits" />
      ) : error ? (
        <div className="page">
          <ErrorState error={error} onRetry={() => void refetch()} />
        </div>
      ) : (
        <OutfitGalleryView
          key={latest?.id ?? 'editorial'}
          result={latest?.result ?? EDITORS_PALETTE}
          analysisId={latest?.id ?? null}
          portraitUri={portraitUri}
          editorial={!latest?.result}
        />
      )}
    </div>
  );
}
