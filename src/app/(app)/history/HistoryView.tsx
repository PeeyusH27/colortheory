'use client';

import { Camera } from 'lucide-react';
import { useState } from 'react';

import { AnalysisHistoryItem } from '@/components/analysis/AnalysisHistoryItem';
import { PageHeader } from '@/components/layout/PageHeader';
import { LinkButton } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { toast } from '@/components/ui/Toast';
import { useAnalyses, useDeleteAnalysis, useSavedOutfits } from '@/features/data/queries';
import { staggerStyle } from '@/theme/motion';
import type { AnalysisSession } from '@/types/domain';
import { friendlyError } from '@/utils/errors';
import { formatDate, pluralize } from '@/utils/format';

export function HistoryView() {
  const analyses = useAnalyses();
  const saved = useSavedOutfits();
  const remove = useDeleteAnalysis();
  const [target, setTarget] = useState<AnalysisSession | null>(null);

  const savedCount = (id: string) => saved.data?.filter((s) => s.preview.analysisId === id).length ?? 0;

  return (
    <div className="page flex flex-col gap-8">
      <PageHeader
        back={{ href: '/profile', label: 'Profile' }}
        eyebrow="Archive"
        title="Analysis history"
        subtitle={analyses.data ? pluralize(analyses.data.length, 'session') : ' '}
      />
      {analyses.isPending ? (
        <LoadingState label="Loading history" />
      ) : analyses.error ? (
        <ErrorState error={analyses.error} onRetry={() => void analyses.refetch()} />
      ) : !analyses.data.length ? (
        <EmptyState
          title="No analyses yet"
          body="Each analysis you run is kept here so you can compare and revisit."
          action={
            <LinkButton href="/analyze" icon={Camera}>
              Analyze my look
            </LinkButton>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {analyses.data.map((session, i) => (
            <li key={session.id} className="animate-enter-up" style={staggerStyle(i)}>
              <AnalysisHistoryItem session={session} savedOutfitCount={savedCount(session.id)} onDelete={() => setTarget(session)} />
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={target !== null}
        title="Delete this analysis?"
        body={target ? `From ${formatDate(target.createdAt)}. This can’t be undone.` : ''}
        details={[
          'The portrait (in this browser and in the cloud)',
          'Colour results and any AI previews generated from it',
          'Outfits saved from this analysis',
          'Saved palettes and favourite colours are kept',
        ]}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onCancel={() => setTarget(null)}
        onConfirm={() =>
          target &&
          remove.mutate(target.id, {
            onSuccess: () => {
              toast.show('Analysis deleted');
              setTarget(null);
            },
            onError: (e) => toast.error(friendlyError(e).body),
          })
        }
      />
    </div>
  );
}
