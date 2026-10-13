import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EditorialHeader } from '@/components/layout/EditorialHeader';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAnalysis, usePortraitUri } from '@/features/data/queries';
import { OutfitGalleryView } from '@/features/outfits/OutfitGalleryView';
import { layout } from '@/theme/spacing';

export default function GalleryScreen() {
  const { analysisId, color } = useLocalSearchParams<{ analysisId: string; color?: string }>();
  const analysis = useAnalysis(analysisId);
  const portraitUri = usePortraitUri(analysis.data);

  return (
    <ScreenContainer scroll padded={false}>
      <View style={styles.gutter}>
        <EditorialHeader leading="back" eyebrow="Outfit preview gallery" title="Wear your colours" deck={analysis.data?.result?.headline} />
      </View>
      {analysis.isLoading ? (
        <LoadingState label="Loading outfits" />
      ) : analysis.data?.result ? (
        <OutfitGalleryView result={analysis.data.result} analysisId={analysis.data.id} portraitUri={portraitUri} initialHex={color ?? null} />
      ) : (
        <ErrorState error={analysis.error ?? undefined} code="not_found" onRetry={() => void analysis.refetch()} secondaryLabel="Back" onSecondary={() => router.back()} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: layout.screenPaddingX },
});
