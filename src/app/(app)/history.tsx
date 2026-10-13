import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AnalysisHistoryItem } from '@/components/analysis/AnalysisHistoryItem';
import { EditorialHeader } from '@/components/layout/EditorialHeader';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { toast } from '@/components/ui/Toast';
import { useAnalyses, useDeleteAnalysis, useSavedOutfits } from '@/features/data/queries';
import { palette } from '@/theme/colors';
import { enterUp } from '@/theme/motion';
import { spacing } from '@/theme/spacing';
import type { AnalysisSession } from '@/types/domain';
import { friendlyError } from '@/utils/errors';
import { formatDate, pluralize } from '@/utils/format';

export default function HistoryScreen() {
  const analyses = useAnalyses();
  const saved = useSavedOutfits();
  const remove = useDeleteAnalysis();
  const [target, setTarget] = useState<AnalysisSession | null>(null);

  const savedCount = (id: string) => saved.data?.filter((s) => s.preview.analysisId === id).length ?? 0;

  return (
    <ScreenContainer
      scroll
      refreshControl={<RefreshControl refreshing={analyses.isRefetching} onRefresh={() => void analyses.refetch()} tintColor={palette.navy} />}>
      <EditorialHeader
        leading="back"
        eyebrow="Archive"
        title="Analysis history"
        deck={analyses.data ? pluralize(analyses.data.length, 'session') : undefined}
      />
      {analyses.isLoading ? (
        <LoadingState label="Loading history" />
      ) : analyses.error ? (
        <ErrorState error={analyses.error} onRetry={() => void analyses.refetch()} />
      ) : !analyses.data?.length ? (
        <EmptyState title="No analyses yet" body="Each analysis you run is kept here so you can compare and revisit." actionLabel="Analyze my look" onAction={() => router.push('/camera')} />
      ) : (
        <View style={styles.list}>
          {analyses.data.map((session, i) => (
            <Animated.View key={session.id} entering={enterUp(i)}>
              <AnalysisHistoryItem
                session={session}
                savedOutfitCount={savedCount(session.id)}
                onOpen={() => router.push(`/results/${session.id}`)}
                onDelete={() => setTarget(session)}
              />
            </Animated.View>
          ))}
        </View>
      )}

      <ConfirmationModal
        visible={target !== null}
        title="Delete this analysis?"
        message={target ? `From ${formatDate(target.createdAt)}. This can’t be undone.` : ''}
        details={[
          'The portrait (on this device and in the cloud)',
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing[4], marginTop: spacing[2] },
});
