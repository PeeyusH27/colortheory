import { router } from 'expo-router';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { EditorialHeader } from '@/components/layout/EditorialHeader';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { TextButton } from '@/components/ui/TextButton';
import { useLatestAnalysis, usePortraitUri } from '@/features/data/queries';
import { OutfitGalleryView } from '@/features/outfits/OutfitGalleryView';
import { EDITORS_PALETTE } from '@/mocks/demoAnalysis';
import { palette } from '@/theme/colors';
import { layout } from '@/theme/spacing';

export default function OutfitsScreen() {
  const { latest, isLoading, error, refetch, isRefetching } = useLatestAnalysis();
  const portraitUri = usePortraitUri(latest);

  return (
    <ScreenContainer
      scroll
      withTabBar
      padded={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={palette.navy} />}>
      <View style={styles.gutter}>
        <EditorialHeader
          eyebrow="Outfit studio"
          title="Outfits"
          deck={latest?.result ? latest.result.headline : 'Editor’s picks while you get started.'}
          trailing={latest ? <TextButton label="History" onPress={() => router.push('/history')} /> : undefined}
        />
      </View>
      {isLoading ? (
        <LoadingState label="Loading your outfits" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <OutfitGalleryView
          key={latest?.id ?? 'editorial'}
          result={latest?.result ?? EDITORS_PALETTE}
          analysisId={latest?.id ?? null}
          portraitUri={portraitUri}
          editorial={!latest?.result}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: layout.screenPaddingX },
});
