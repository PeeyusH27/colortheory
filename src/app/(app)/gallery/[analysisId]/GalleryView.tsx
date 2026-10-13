'use client';

import { useParams, useSearchParams } from 'next/navigation';

import { PageHeader } from '@/components/layout/PageHeader';
import { LinkButton } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAnalysis, usePortraitUri } from '@/features/data/queries';
import { OutfitGalleryView } from '@/features/outfits/OutfitGalleryView';
import { routes } from '@/lib/routes';

export function GalleryView() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const color = useSearchParams().get('color');
  const analysis = useAnalysis(analysisId);
  const portraitUri = usePortraitUri(analysis.data);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        className="page"
        back={{ href: routes.results(analysisId), label: 'Results' }}
        eyebrow="Outfit preview gallery"
        title="Wear your colours"
        subtitle={analysis.data?.result?.headline}
      />
      {analysis.isPending ? (
        <LoadingState label="Loading outfits" />
      ) : analysis.data?.result ? (
        <OutfitGalleryView result={analysis.data.result} analysisId={analysis.data.id} portraitUri={portraitUri} initialHex={color} />
      ) : (
        <div className="page">
          <ErrorState
            error={analysis.error ?? undefined}
            code={analysis.error ? undefined : 'not_found'}
            onRetry={analysis.error ? () => void analysis.refetch() : undefined}
            secondary={
              <LinkButton href="/outfits" variant="secondary">
                All outfits
              </LinkButton>
            }
          />
        </div>
      )}
    </div>
  );
}
