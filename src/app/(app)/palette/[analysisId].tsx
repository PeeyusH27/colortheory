import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { Copy, Heart, Info } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { ColorDetailSheet } from '@/components/colors/ColorDetailSheet';
import { ColorPalette } from '@/components/colors/ColorPalette';
import { EditorialHeader } from '@/components/layout/EditorialHeader';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { OutfitCarousel } from '@/components/outfits/OutfitCarousel';
import { ProvenanceBadge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { useAnalysis, useFavoriteColors, usePortraitUri, useToggleFavoriteColor } from '@/features/data/queries';
import { recommendOutfits } from '@/features/outfits/recommendOutfits';
import { shareOutfit } from '@/features/outfits/share';
import { useOutfitSaving } from '@/features/outfits/useOutfitSaving';
import { haptics } from '@/lib/haptics';
import { usePreferencesStore } from '@/store/preferencesStore';
import { palette } from '@/theme/colors';
import { durations } from '@/theme/motion';
import { layout, spacing } from '@/theme/spacing';
import type { ColorRecommendation } from '@/types/domain';
import { darkVariant, lightVariant, readableOn } from '@/utils/color';

const ROLE_COPY: Record<ColorRecommendation['role'], string> = {
  core: 'Core colour',
  accent: 'Accent',
  neutral: 'Neutral',
  experimental: 'Try with care',
};

export default function PaletteScreen() {
  const { analysisId } = useLocalSearchParams<{ analysisId: string }>();
  const analysis = useAnalysis(analysisId);
  const portraitUri = usePortraitUri(analysis.data);
  const favorites = useFavoriteColors();
  const toggleFavorite = useToggleFavoriteColor();
  const addRecent = usePreferencesStore((s) => s.addRecentlyViewed);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const result = analysis.data?.result ?? null;
  const saving = useOutfitSaving(analysisId ?? null, result?.isDemo ?? false);

  if (analysis.isLoading) {
    return (
      <ScreenContainer>
        <LoadingState fullScreen label="Loading palette" />
      </ScreenContainer>
    );
  }
  if (!result) {
    return (
      <ScreenContainer>
        <ErrorState error={analysis.error ?? undefined} code="not_found" onRetry={() => void analysis.refetch()} secondaryLabel="Back" onSecondary={() => router.back()} />
      </ScreenContainer>
    );
  }

  const all = [...result.recommendedColors, ...result.neutralColors, ...result.experimentalColors];
  const selected = all.find((c) => c.id === selectedId) ?? result.recommendedColors[0] ?? null;
  const favoriteByHex = new Map((favorites.data ?? []).map((f) => [f.hex.toUpperCase(), f]));
  const outfits = selected ? recommendOutfits(result, { selectedHex: selected.hex, limit: 8 }) : [];
  const onColor = selected ? readableOn(selected.hex) : palette.cream;

  const select = (c: { id: string }) => {
    const color = all.find((x) => x.id === c.id);
    if (!color) return;
    haptics.selection();
    setSelectedId(color.id);
    addRecent({ kind: 'color', id: color.hex, label: color.name, hex: color.hex });
  };

  const favorite = selected ? favoriteByHex.get(selected.hex.toUpperCase()) : undefined;

  return (
    <ScreenContainer scroll padded={false}>
      <View style={styles.gutter}>
        <EditorialHeader leading="back" eyebrow="Interactive palette" title="Your palette" deck={result.headline} trailing={<ProvenanceBadge kind={result.isDemo ? 'demo' : 'device'} />} />
      </View>

      {selected ? (
        <Animated.View key={selected.id} entering={FadeIn.duration(durations.base).reduceMotion(ReduceMotion.System)} style={[styles.hero, { backgroundColor: selected.hex }]}>
          <View style={styles.heroTop}>
            <Text variant="eyebrow" color={onColor}>
              {ROLE_COPY[selected.role]}
            </Text>
            <View style={styles.heroIcons}>
              <IconButton
                icon={Heart}
                accessibilityLabel={favorite ? `Remove ${selected.name} from favourites` : `Add ${selected.name} to favourites`}
                selected={Boolean(favorite)}
                variant={favorite ? 'inverse' : 'glass'}
                color={favorite ? palette.coralText : undefined}
                onPress={() =>
                  toggleFavorite.mutate(
                    { name: selected.name, hex: selected.hex, analysisId: analysisId ?? null, favoriteId: favorite?.id ?? null },
                    { onSuccess: (r) => toast.show(r.favorited ? 'Saved to favourite colours' : 'Removed from favourites') },
                  )
                }
              />
              <IconButton icon={Info} accessibilityLabel={`${selected.name} details`} variant="glass" onPress={() => setDetailOpen(true)} />
            </View>
          </View>
          <Text variant="displayL" color={onColor} accessibilityRole="header">
            {selected.name}
          </Text>
          <View style={styles.hexRow}>
            <Text variant="hex" color={onColor} style={styles.hexBig}>
              {selected.hex}
            </Text>
            <SecondaryButton
              label="Copy"
              icon={Copy}
              iconPosition="leading"
              size="sm"
              tone={onColor === palette.cream ? 'cream' : 'ink'}
              onPress={async () => {
                await Clipboard.setStringAsync(selected.hex);
                haptics.success();
                toast.success(`${selected.hex} copied`);
              }}
            />
          </View>
          <View style={styles.variants} accessible accessibilityLabel={`Lighter variant ${lightVariant(selected.hex)}, deeper variant ${darkVariant(selected.hex)}`}>
            {[lightVariant(selected.hex), selected.hex, darkVariant(selected.hex)].map((hex, i) => (
              <View key={`${hex}-${i}`} style={[styles.variant, { backgroundColor: hex }]}>
                <Text variant="hex" color={readableOn(hex)} style={styles.variantHex}>
                  {i === 0 ? 'Lighter' : i === 1 ? 'Base' : 'Deeper'}
                </Text>
              </View>
            ))}
          </View>
          <Text variant="bodyS" color={onColor} numberOfLines={4}>
            {selected.reason}
          </Text>
        </Animated.View>
      ) : null}

      <View style={styles.gutter}>
        <View style={styles.section}>
          <SectionHeader index="01" title="Core & accents" subtitle="Tap a swatch to see it in outfits." />
          <ColorPalette colors={result.recommendedColors} selectedId={selected?.id} onSelect={select} columns={4} />
        </View>
        <View style={styles.section}>
          <SectionHeader index="02" title="Neutrals" />
          <ColorPalette colors={result.neutralColors} selectedId={selected?.id} onSelect={select} columns={4} />
        </View>
        {result.experimentalColors.length ? (
          <View style={styles.section}>
            <SectionHeader index="03" title="Try with care" />
            <ColorPalette colors={result.experimentalColors} selectedId={selected?.id} onSelect={select} columns={4} />
          </View>
        ) : null}
        <View style={styles.section}>
          <SectionHeader
            index="04"
            title={selected ? `Wear ${selected.name}` : 'Outfits'}
            subtitle={outfits.length ? `${outfits.length} looks that use this colour.` : 'Neutrals shine as supporting pieces — pick a core colour to build around.'}
            actionLabel="Gallery"
            onAction={() => router.push({ pathname: '/gallery/[analysisId]', params: { analysisId: analysisId ?? '', color: selected?.hex } })}
          />
        </View>
      </View>
      {outfits.length ? (
        <OutfitCarousel
          key={selected?.id}
          outfits={outfits}
          portraitUri={portraitUri}
          savedIds={saving.savedIds}
          onOpen={(o) => router.push({ pathname: '/outfit/[outfitId]', params: { outfitId: o.id, analysisId: analysisId ?? '' } })}
          onToggleSave={saving.toggle}
          onShare={(o) => void shareOutfit(o)}
          widthRatio={0.62}
        />
      ) : null}

      <ColorDetailSheet
        color={detailOpen ? selected : null}
        onClose={() => setDetailOpen(false)}
        isFavorite={Boolean(favorite)}
        onToggleFavorite={
          selected
            ? () => toggleFavorite.mutate({ name: selected.name, hex: selected.hex, analysisId: analysisId ?? null, favoriteId: favorite?.id ?? null })
            : undefined
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: layout.screenPaddingX },
  hero: { marginHorizontal: layout.screenPaddingX, padding: spacing[5], gap: spacing[3], borderWidth: 1.5, borderColor: palette.navy },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroIcons: { flexDirection: 'row', gap: spacing[2] },
  hexRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hexBig: { fontSize: 18, lineHeight: 24 },
  variants: { flexDirection: 'row', height: 44, borderWidth: 1, borderColor: palette.navy },
  variant: { flex: 1, justifyContent: 'flex-end', padding: 4 },
  variantHex: { fontSize: 10, lineHeight: 12 },
  section: { marginTop: layout.sectionGap },
});
