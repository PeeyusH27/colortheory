import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, BookmarkCheck, Bookmark, Palette as PaletteIcon, RotateCcw, Share2, Shirt, SlidersHorizontal, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { BackHandler, FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Blob } from '@/components/brand/Blob';
import { CharacteristicScale } from '@/components/analysis/CharacteristicScale';
import { ColorDetailSheet, type ColorDetailSheetColor } from '@/components/colors/ColorDetailSheet';
import { ColorSwatch } from '@/components/colors/ColorSwatch';
import { CombinationCard } from '@/components/colors/CombinationCard';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DrapePreview } from '@/components/outfits/DrapePreview';
import { PortraitFrame } from '@/components/outfits/PortraitFrame';
import { Badge, ProvenanceBadge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { LoadingState } from '@/components/ui/LoadingState';
import { PressableScale } from '@/components/ui/PressableScale';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { AdjustSheet } from '@/features/analysis/AdjustSheet';
import { adjustResult, isAdjusted } from '@/features/analysis/adjustResult';
import {
  useAnalysis,
  useFavoriteColors,
  usePalettes,
  usePortraitUri,
  useSavePalette,
  useToggleFavoriteColor,
  useUpdateAnalysisResult,
} from '@/features/data/queries';
import { sharePalette } from '@/features/outfits/share';
import { usePreferencesStore } from '@/store/preferencesStore';
import { palette } from '@/theme/colors';
import { enterUp } from '@/theme/motion';
import { shadows } from '@/theme/shadows';
import { layout, spacing } from '@/theme/spacing';
import type { ColorAnalysisResult, ColorRecommendation } from '@/types/domain';
import { readableOn } from '@/utils/color';
import { friendlyError } from '@/utils/errors';
import { formatDate, percent } from '@/utils/format';

function confidenceLabel(c: number | null) {
  if (c === null) return 'Not estimated';
  if (c < 0.35) return 'Low';
  if (c < 0.6) return 'Moderate';
  return 'Good';
}

function provenanceOf(result: ColorAnalysisResult) {
  if (result.isDemo) return 'demo' as const;
  return result.provider === 'remote' ? ('remote' as const) : ('device' as const);
}

export default function ResultsScreen() {
  const { analysisId, fresh } = useLocalSearchParams<{ analysisId: string; fresh?: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const analysis = useAnalysis(analysisId);
  const portraitUri = usePortraitUri(analysis.data);
  const palettes = usePalettes();
  const favorites = useFavoriteColors();
  const savePalette = useSavePalette();
  const toggleFavorite = useToggleFavoriteColor();
  const updateResult = useUpdateAnalysisResult();
  const addRecent = usePreferencesStore((s) => s.addRecentlyViewed);
  const [detail, setDetail] = useState<ColorDetailSheetColor | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const isFresh = fresh === '1';

  const close = () => {
    if (isFresh || !router.canGoBack()) router.dismissTo('/discover');
    else router.back();
  };

  // Coming straight from the analysis, "back" should return home, not to the camera flow.
  useEffect(() => {
    if (!isFresh) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.dismissTo('/discover');
      return true;
    });
    return () => sub.remove();
  }, [isFresh]);

  if (analysis.isLoading) {
    return (
      <ScreenContainer>
        <LoadingState fullScreen label="Opening your colour story" />
      </ScreenContainer>
    );
  }
  if (analysis.error || !analysis.data?.result) {
    return (
      <ScreenContainer>
        <ErrorState
          error={analysis.error ?? undefined}
          code={analysis.error ? undefined : 'not_found'}
          title={analysis.error ? undefined : 'Analysis not found'}
          body={analysis.error ? undefined : 'It may have been deleted on another device.'}
          onRetry={analysis.error ? () => void analysis.refetch() : undefined}
          secondaryLabel="Go home"
          onSecondary={() => router.dismissTo('/discover')}
        />
      </ScreenContainer>
    );
  }

  const session = analysis.data;
  const result = session.result as ColorAnalysisResult;
  const c = result.characteristics;
  const savedPalette = palettes.data?.find((p) => p.analysisId === session.id && p.kind === 'analysis');
  const favoriteByHex = new Map((favorites.data ?? []).map((f) => [f.hex.toUpperCase(), f]));
  const lowConfidence = result.confidence !== null && result.confidence < 0.35;
  const statementBg = result.recommendedColors[0]?.hex ?? palette.navy;
  const statementFg = readableOn(statementBg);
  const frameW = Math.min(width * 0.46, 200);
  const panelW = Math.min(112, (width - layout.screenPaddingX * 2) / 3.3);
  const swatchCols = width < 360 ? 2 : 3;
  const contentW = Math.min(width, layout.maxContentWidth) - layout.screenPaddingX * 2;
  const swatchSize = Math.floor((contentW - spacing[2] * (swatchCols - 1)) / swatchCols);
  const neutralSize = Math.floor((contentW - spacing[3] * 3) / 4);

  const openColor = (color: ColorRecommendation) => {
    addRecent({ kind: 'color', id: color.hex, label: color.name, hex: color.hex });
    setDetail(color);
  };

  const onSavePalette = () => {
    if (savedPalette) {
      router.push('/colors');
      return;
    }
    savePalette.mutate(
      {
        name: result.headline.split(' and ')[0] ?? 'My palette',
        analysisId: session.id,
        kind: 'analysis',
        colors: [...result.recommendedColors, ...result.neutralColors].map(({ name, hex }) => ({ name, hex })),
      },
      { onSuccess: () => toast.success('Palette saved to My Colors'), onError: (e) => toast.error(friendlyError(e).body) },
    );
  };

  return (
    <ScreenContainer scroll padded={false} edges={['bottom']} grain>
      <Stack.Screen options={{ gestureEnabled: !isFresh }} />

      {/* ── Masthead ─────────────────────────────────────────────────────────── */}
      <View style={[styles.masthead, { paddingTop: insets.top + spacing[2] }]}>
        <View style={styles.mastArt} pointerEvents="none">
          <View style={{ position: 'absolute', right: -60, top: -40 }}>
            <Blob seed={23} color={result.recommendedColors[0]?.hex ?? palette.denim} size={240} />
          </View>
          <View style={{ position: 'absolute', right: 60, top: 120 }}>
            <Blob seed={41} color={result.recommendedColors[1]?.hex ?? palette.sky} size={110} />
          </View>
        </View>
        <View style={styles.topBar}>
          <IconButton icon={isFresh ? X : ArrowLeft} accessibilityLabel={isFresh ? 'Close results' : 'Go back'} onPress={close} variant="glass" />
          <IconButton
            icon={Share2}
            accessibilityLabel="Share palette"
            onPress={() => void sharePalette(result.headline, result.recommendedColors)}
            variant="glass"
          />
        </View>
        <Animated.View entering={enterUp(0)} style={styles.mastCopy}>
          <Text variant="eyebrow" color={palette.sky}>
            {result.title} · {formatDate(session.createdAt)}
          </Text>
          <Text variant="displayL" color={palette.cream} accessibilityRole="header">
            {result.headline.split(',')[0]},
          </Text>
          <Text variant="editorial" color={palette.sky} style={styles.headlineRest}>
            {result.headline.split(',').slice(1).join(',').trim()}
          </Text>
          <View style={styles.badges}>
            <ProvenanceBadge kind={provenanceOf(result)} inverse />
            <Badge label={`Confidence · ${confidenceLabel(result.confidence)}${result.confidence !== null ? ` ${percent(result.confidence)}` : ''}`} tone="inverse" />
            {isAdjusted(result.adjustments) ? <Badge label="Adjusted by you" tone="inverse" /> : null}
          </View>
        </Animated.View>
      </View>

      <View style={styles.portraitRow}>
        <PortraitFrame
          uri={portraitUri ?? (session.portrait.location === 'deleted' ? null : undefined)}
          width={frameW}
          shadow="offsetCoral"
          placeholder={
            result.isDemo ? (
              <DrapePreview hex={result.recommendedColors[0]?.hex ?? palette.navy} colorName="Sample" width={frameW - 3} height={Math.round(frameW * 1.25) - 3} showLabel={false} />
            ) : undefined
          }
        />
        <View style={styles.sampleCol}>
          {c.sampledHex ? (
            <View style={styles.sample} accessible accessibilityLabel={`Sampled tone ${c.sampledHex}`}>
              <View style={[styles.sampleChip, { backgroundColor: c.sampledHex }]} />
              <Text variant="eyebrow" tone="secondary">
                Sampled tone
              </Text>
              <Text variant="hex">{c.sampledHex}</Text>
            </View>
          ) : null}
          <Text variant="caption" tone="secondary">
            {result.isDemo ? 'Sample data — not based on your photo.' : 'Average of skin-toned pixels in your face guide, as your camera recorded it.'}
          </Text>
        </View>
      </View>

      <View style={styles.gutter}>
        {lowConfidence || result.qualityWarnings.length ? (
          <InlineAlert
            tone={lowConfidence ? 'warning' : 'info'}
            title={lowConfidence ? 'Low confidence — consider a retake' : 'About this photo'}
            message={result.qualityWarnings.join(' ')}
            action={lowConfidence ? <SecondaryButton label="Retake in better light" icon={RotateCcw} iconPosition="leading" size="sm" onPress={() => router.push('/camera')} /> : undefined}
            style={styles.alert}
          />
        ) : null}

        {/* ── What we see ─────────────────────────────────────────────────────── */}
        <Animated.View entering={enterUp(1)} style={styles.section}>
          <SectionHeader index="01" title="What we see" subtitle="Visible characteristics estimated from one photo — not a diagnosis." />
          <View style={styles.scales}>
            <CharacteristicScale label="Undertone lean" value={(c.undertone.lean + 1) / 2} estimate={c.undertone.estimate.replace('-', ' ')} left="Cool" right="Warm" gradient={[palette.steel, palette.cream, palette.camel]} />
            <CharacteristicScale label="Depth" value={c.depth.value} estimate={c.depth.estimate.replace('-', ' ')} left="Light" right="Deep" gradient={[palette.cream, palette.camel, palette.ink]} />
            <CharacteristicScale label="Contrast" value={c.contrast.value} estimate={c.contrast.estimate} left="Low" right="High" gradient={[palette.linen, palette.slate, palette.ink]} />
            <CharacteristicScale label="Clarity" value={c.chroma.value} estimate={c.chroma.estimate} left="Soft" right="Clear" gradient={[palette.sage, palette.denim, palette.coral]} />
          </View>
          <SecondaryButton label="Doesn’t feel right? Adjust" icon={SlidersHorizontal} iconPosition="leading" size="md" onPress={() => setAdjusting(true)} />
        </Animated.View>

        {/* ── See it on you ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader index="02" title="See it on you" subtitle="Colour drapes over your photo. Not AI — your photo is unchanged." />
        </View>
      </View>
      <FlatList
        horizontal
        data={result.recommendedColors.slice(0, 5)}
        keyExtractor={(x) => x.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hList}
        renderItem={({ item, index }) => (
          <Animated.View entering={enterUp(index)}>
            <PressableScale onPress={() => openColor(item)} accessibilityRole="button" accessibilityLabel={`${item.name} drape. Opens colour details.`}>
              <DrapePreview hex={item.hex} colorName={item.name} portraitUri={portraitUri} width={panelW} height={panelW * 1.5} style={styles.panel} showLabel={false} />
              <View style={[styles.panelLabel, { backgroundColor: item.hex }]}>
                <Text variant="eyebrow" color={readableOn(item.hex)} style={styles.panelLabelText} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
            </PressableScale>
          </Animated.View>
        )}
      />

      <View style={styles.gutter}>
        {/* ── Palette ─────────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader index="03" title="Your palette" actionLabel="Explore" onAction={() => router.push(`/palette/${session.id}`)} />
          <View style={styles.swatchGrid}>
            {result.recommendedColors.map((color, i) => (
              <Animated.View key={color.id} entering={enterUp(i)}>
                <ColorSwatch name={color.name} hex={color.hex} size={swatchSize} variant="tile" onPress={() => openColor(color)} />
                {color.role === 'accent' ? <Badge label="Accent" style={styles.accentBadge} /> : null}
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader index="04" title="Balanced neutrals" subtitle="Your base layer: trousers, outerwear, shoes." />
          <View style={styles.chipRow}>
            {result.neutralColors.map((n) => (
              <ColorSwatch key={n.id} name={n.name} hex={n.hex} size={neutralSize} onPress={() => openColor(n)} />
            ))}
          </View>
        </View>

        {result.experimentalColors.length ? (
          <View style={styles.section}>
            <SectionHeader index="05" title="Try with care" subtitle="At the edge of your estimated range. Wear them away from your face." />
            {result.experimentalColors.map((x) => (
              <PressableScale key={x.id} onPress={() => openColor(x)} accessibilityRole="button" accessibilityLabel={`${x.name}. ${x.reason}`} style={styles.experimental}>
                <View style={[styles.expChip, { backgroundColor: x.hex }]} />
                <View style={styles.flex}>
                  <Text variant="label">{x.name}</Text>
                  <Text variant="bodyS" tone="secondary" numberOfLines={3}>
                    {x.reason}
                  </Text>
                </View>
              </PressableScale>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader index="06" title="Combinations" />
        </View>
      </View>
      <FlatList
        horizontal
        data={result.combinations}
        keyExtractor={(x) => x.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hList}
        renderItem={({ item }) => <CombinationCard name={item.name} hexes={item.hexes} note={item.note} width={220} />}
      />

      <View style={styles.gutter}>
        <View style={styles.section}>
          <SectionHeader index="07" title="How we got here" ruled={false} />
          <Text variant="bodyM" tone="secondary">
            {result.explanation}
          </Text>
        </View>
      </View>

      {/* ── Style statement ─────────────────────────────────────────────────── */}
      <View style={[styles.statement, { backgroundColor: statementBg }]}>
        <Text variant="eyebrow" color={statementFg} align="center">
          Your style statement
        </Text>
        <Text variant="displayL" italic color={statementFg} align="center">
          “{result.styleStatement}”
        </Text>
      </View>

      <View style={[styles.gutter, styles.actions]}>
        <PrimaryButton
          label={savedPalette ? 'Saved — view in My Colors' : 'Save palette'}
          icon={savedPalette ? BookmarkCheck : Bookmark}
          iconPosition="leading"
          fullWidth
          loading={savePalette.isPending}
          onPress={onSavePalette}
        />
        <View style={styles.row}>
          <SecondaryButton label="Palette" icon={PaletteIcon} iconPosition="leading" size="md" onPress={() => router.push(`/palette/${session.id}`)} style={styles.flex} />
          <SecondaryButton label="Outfits" icon={Shirt} iconPosition="leading" size="md" onPress={() => router.push(`/gallery/${session.id}`)} style={styles.flex} />
        </View>
        <PrimaryButton label="Explore outfit previews" icon={ArrowRight} tone="coral" fullWidth onPress={() => router.push(`/gallery/${session.id}`)} />
      </View>

      <ColorDetailSheet
        color={detail}
        onClose={() => setDetail(null)}
        isFavorite={detail ? favoriteByHex.has(detail.hex.toUpperCase()) : false}
        onToggleFavorite={() => {
          if (!detail) return;
          const fav = favoriteByHex.get(detail.hex.toUpperCase());
          toggleFavorite.mutate(
            { name: detail.name, hex: detail.hex, analysisId: session.id, favoriteId: fav?.id ?? null },
            { onSuccess: (r) => toast.show(r.favorited ? 'Added to favourite colours' : 'Removed from favourites') },
          );
        }}
        onShowOutfits={() => {
          const hex = detail?.hex;
          setDetail(null);
          router.push({ pathname: '/gallery/[analysisId]', params: { analysisId: session.id, color: hex } });
        }}
      />
      <AdjustSheet
        visible={adjusting}
        result={result}
        saving={updateResult.isPending}
        onClose={() => setAdjusting(false)}
        onSave={(adjustments) =>
          updateResult.mutate(
            { id: session.id, result: adjustResult(result, adjustments) },
            {
              onSuccess: () => {
                setAdjusting(false);
                toast.success('Palette updated');
              },
              onError: (e) => toast.error(friendlyError(e).body),
            },
          )
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  masthead: { backgroundColor: palette.ink, paddingHorizontal: layout.screenPaddingX, paddingBottom: spacing[16], overflow: 'hidden' },
  mastArt: { ...StyleSheet.absoluteFill, opacity: 0.9 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[6] },
  mastCopy: { gap: spacing[2] },
  headlineRest: { fontSize: 24, lineHeight: 32 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[3] },
  portraitRow: { flexDirection: 'row', gap: spacing[4], paddingHorizontal: layout.screenPaddingX, marginTop: -spacing[12], alignItems: 'flex-end' },
  sampleCol: { flex: 1, gap: spacing[3], paddingBottom: spacing[2] },
  sample: { gap: spacing[1] },
  sampleChip: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: palette.navy },
  gutter: { paddingHorizontal: layout.screenPaddingX },
  alert: { marginTop: spacing[8] },
  section: { marginTop: layout.sectionGap, gap: spacing[4] },
  scales: { gap: spacing[5] },
  hList: { paddingHorizontal: layout.screenPaddingX, gap: spacing[3], paddingRight: layout.screenPaddingX + 4 },
  panel: { borderWidth: 1.5, borderColor: palette.navy },
  panelLabel: { paddingVertical: 6, paddingHorizontal: 6, borderWidth: 1.5, borderTopWidth: 0, borderColor: palette.navy },
  panelLabelText: { fontSize: 9, letterSpacing: 1.2 },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  accentBadge: { position: 'absolute', top: spacing[2], left: spacing[2] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  experimental: { flexDirection: 'row', gap: spacing[3], alignItems: 'center', paddingVertical: spacing[2] },
  expChip: { width: 52, height: 52, borderWidth: 1.5, borderColor: palette.navy, transform: [{ rotate: '-4deg' }] },
  flex: { flex: 1 },
  statement: { marginTop: layout.sectionGap, paddingVertical: spacing[12], paddingHorizontal: layout.screenPaddingX, gap: spacing[4], ...shadows.none },
  actions: { gap: spacing[3], marginTop: spacing[8], marginBottom: spacing[6] },
  row: { flexDirection: 'row', gap: spacing[3] },
});
