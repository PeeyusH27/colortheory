import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, RefreshCw, Share2, Sparkles, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DrapePreview } from '@/components/outfits/DrapePreview';
import { OutfitFlatLay } from '@/components/outfits/OutfitFlatLay';
import { Badge, ProvenanceBadge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { LoadingState } from '@/components/ui/LoadingState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { toast } from '@/components/ui/Toast';
import { useAnalysis, usePortraitUri, useRemoveSavedOutfit, useSaveOutfit, useSavedOutfits } from '@/features/data/queries';
import { outfitsForColor } from '@/features/outfits/recommendOutfits';
import { shareOutfit, shareRemoteImage } from '@/features/outfits/share';
import { useOutfitPreviewGeneration } from '@/features/outfits/useOutfitPreviewGeneration';
import { haptics } from '@/lib/haptics';
import { EDITORS_PALETTE } from '@/mocks/demoAnalysis';
import { palette } from '@/theme/colors';
import { durations } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { layout, spacing } from '@/theme/spacing';
import type { Occasion, Outfit } from '@/types/outfits';
import { friendlyError } from '@/utils/errors';

type Visual = 'outfit' | 'drape' | 'ai';

const OCCASIONS: Record<Occasion, string> = {
  work: 'Work',
  weekend: 'Weekend',
  evening: 'Evening',
  travel: 'Travel',
  event: 'Events',
  everyday: 'Every day',
};

export default function OutfitDetailsScreen() {
  const { outfitId, analysisId } = useLocalSearchParams<{ outfitId: string; analysisId?: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const editorial = !analysisId || analysisId === 'editorial';
  const analysis = useAnalysis(editorial ? undefined : analysisId);
  const portraitUri = usePortraitUri(analysis.data);
  const result = editorial ? EDITORS_PALETTE : (analysis.data?.result ?? null);
  const session = editorial ? null : (analysis.data ?? null);

  const colorId = outfitId?.split('--')[1];
  const color = result ? [...result.recommendedColors, ...result.experimentalColors].find((c) => c.id === colorId) : undefined;
  const variations: Outfit[] = color && result ? outfitsForColor(color, result) : [];
  const initialIndex = Math.max(0, variations.findIndex((o) => o.id === outfitId));
  const [index, setIndex] = useState(initialIndex);
  const [visual, setVisual] = useState<Visual>('outfit');
  const [consent, setConsent] = useState(false);
  const listRef = useRef<FlatList<Outfit>>(null);
  const outfit = variations[index] ?? null;

  const saved = useSavedOutfits();
  const save = useSaveOutfit();
  const remove = useRemoveSavedOutfit();
  const generation = useOutfitPreviewGeneration(session, outfit);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/outfits'));

  if (!editorial && analysis.isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <LoadingState fullScreen label="Loading outfit" />
      </View>
    );
  }
  if (!outfit || !result) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ErrorState code="not_found" title="Outfit not found" body="This outfit may belong to a deleted analysis." secondaryLabel="Close" onSecondary={close} />
      </View>
    );
  }

  const visualW = width - layout.screenPaddingX * 2;
  const savedEntry = saved.data?.find((s) => s.preview.outfitId === outfit.id && s.preview.analysisId === (session?.id ?? null) && s.preview.mode === 'drape');
  const aiDone = generation.state.phase === 'done' ? generation.state.result : null;

  const goTo = (i: number) => {
    if (i < 0 || i >= variations.length) return;
    haptics.selection();
    listRef.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
    generation.reset();
  };

  const toggleSave = () => {
    if (editorial || !session) return;
    if (savedEntry) {
      remove.mutate(savedEntry.id, { onSuccess: () => toast.show('Removed from wardrobe') });
      return;
    }
    save.mutate(
      {
        analysisId: session.id,
        outfitId: outfit.id,
        outfitName: outfit.name,
        garmentHex: outfit.mainColor.hex,
        mode: 'drape',
        provider: 'template',
        generationStatus: 'not_requested',
        imageUri: null,
        imagePath: null,
        isDemo: result.isDemo,
      },
      { onSuccess: () => toast.success('Saved to your wardrobe'), onError: (e) => toast.error(friendlyError(e).body) },
    );
  };

  const saveAiPreview = () => {
    if (!aiDone || !session) return;
    save.mutate(
      {
        id: aiDone.isDemo ? undefined : aiDone.previewId,
        analysisId: session.id,
        outfitId: outfit.id,
        outfitName: outfit.name,
        garmentHex: outfit.mainColor.hex,
        mode: 'ai',
        provider: aiDone.provider,
        generationStatus: 'completed',
        imageUri: null,
        imagePath: aiDone.imagePath,
        isDemo: aiDone.isDemo,
      },
      { onSuccess: () => toast.success('Preview saved'), onError: (e) => toast.error(friendlyError(e).body) },
    );
  };

  const renderVisual = (item: Outfit) => {
    if (visual === 'drape') {
      return <DrapePreview hex={item.mainColor.hex} colorName={item.mainColor.name} portraitUri={portraitUri} width={visualW} height={visualW * 1.2} />;
    }
    if (visual === 'ai' && item.id === outfit.id && aiDone) {
      return aiDone.isDemo || !aiDone.imageUri ? (
        <View>
          <DrapePreview hex={item.mainColor.hex} colorName={item.mainColor.name} portraitUri={portraitUri} width={visualW} height={visualW * 1.2} />
          <View style={styles.demoStamp} pointerEvents="none">
            <Text variant="eyebrow" color={palette.ink}>
              Demo · not a real AI try-on
            </Text>
          </View>
        </View>
      ) : (
        <Image source={{ uri: aiDone.imageUri }} style={{ width: visualW, height: visualW * 1.3 }} contentFit="cover" transition={300} accessibilityLabel={`AI-generated preview of you wearing ${item.name}. Approximation.`} />
      );
    }
    return <OutfitFlatLay pieces={item.pieces} size={visualW} />;
  };

  const aiPanel = () => {
    if (editorial) {
      return <InlineAlert tone="info" message="AI previews use your own portrait. Run an analysis first, then open an outfit from your results." />;
    }
    if (!generation.provider) {
      return <InlineAlert tone="info" message="AI previews are turned off in this build. The colour drape shows the colour against your photo." />;
    }
    const s = generation.state;
    if (s.phase === 'uploading') return <LoadingState label={`Uploading portrait… ${Math.round(s.progress * 100)}%`} />;
    if (s.phase === 'running') {
      return (
        <View style={styles.aiBox}>
          <LoadingState label={s.status === 'queued' ? 'Queued with the try-on service…' : 'Generating your preview — usually 5–20 seconds'} />
          <TextButton label="Cancel" onPress={generation.cancel} style={styles.center} />
        </View>
      );
    }
    if (s.phase === 'failed') {
      return (
        <ErrorState
          error={s.error}
          compact
          onRetry={() => void generation.generate({ consentToUpload: consent })}
          secondaryLabel="Use colour drape"
          onSecondary={() => setVisual('drape')}
        />
      );
    }
    if (s.phase === 'done') {
      return (
        <View style={styles.aiBox}>
          <ProvenanceBadge kind={s.result.isDemo ? 'demo' : 'ai'} />
          <Text variant="bodyS" tone="secondary">
            {s.result.isDemo
              ? 'Demo mode walks through the generation steps without calling an AI service. Configure the try-on provider to see a real preview.'
              : 'An approximation generated from your portrait. Faces, fabric and fit may not be reproduced exactly. Your original photo is unchanged.'}
          </Text>
          <View style={styles.row}>
            <SecondaryButton label="Generate another" icon={RefreshCw} iconPosition="leading" size="md" onPress={() => void generation.generate({ consentToUpload: consent })} style={styles.flex} />
            <PrimaryButton label="Save preview" size="md" onPress={saveAiPreview} loading={save.isPending} style={styles.flex} />
          </View>
          {!s.result.isDemo && s.result.imageUri ? (
            <TextButton label="Share preview image" icon={Share2} onPress={() => void shareRemoteImage(s.result.imageUri as string, `colortheory-${outfit.mainColor.id}.png`)} />
          ) : null}
        </View>
      );
    }
    return (
      <View style={styles.aiBox}>
        <Text variant="h3">See yourself in this outfit</Text>
        <Text variant="bodyS" tone="secondary">
          {generation.isRemote
            ? 'We send your portrait and this outfit to our virtual try-on provider through a link that expires in minutes. The result is an approximation and is saved privately to your account.'
            : 'Demo mode: no image is sent anywhere and no AI image is produced. The result is clearly labelled as a demo.'}
        </Text>
        {generation.needsUpload ? (
          generation.canUpload ? (
            <Checkbox
              checked={consent}
              onChange={setConsent}
              label="Upload this portrait to my private storage"
              description="Required for AI previews. Only your account can access it, and you can delete it in Settings."
            />
          ) : (
            <InlineAlert tone="warning" message="The portrait for this analysis isn’t on this device anymore. Run a new analysis with cloud storage to use AI previews." />
          )
        ) : null}
        <PrimaryButton
          label={generation.isRemote ? 'Generate AI preview' : 'Run demo generation'}
          icon={Sparkles}
          iconPosition="leading"
          tone="coral"
          disabled={generation.needsUpload && (!consent || !generation.canUpload)}
          onPress={() => void generation.generate({ consentToUpload: consent })}
          fullWidth
        />
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing[2], paddingBottom: insets.bottom + spacing[8] }]}>
        <View style={styles.topBar}>
          <IconButton icon={X} accessibilityLabel="Close outfit" onPress={close} variant="outline" />
          <Text variant="eyebrow" tone="secondary">
            {index + 1} / {variations.length} · {outfit.mainColor.name}
          </Text>
          <IconButton icon={Share2} accessibilityLabel={`Share ${outfit.name}`} onPress={() => void shareOutfit(outfit)} variant="outline" />
        </View>

        <SegmentedControl
          accessibilityLabel="Preview type"
          value={visual}
          onChange={setVisual}
          options={[
            { value: 'outfit', label: 'Outfit' },
            { value: 'drape', label: 'Colour on me' },
            { value: 'ai', label: 'AI preview' },
          ]}
        />

        <View style={styles.pager}>
          <FlatList
            ref={listRef}
            data={variations}
            keyExtractor={(o) => o.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, i) => ({ length: visualW, offset: visualW * i, index: i })}
            onMomentumScrollEnd={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / visualW);
              if (i !== index) {
                setIndex(i);
                generation.reset();
              }
            }}
            style={{ width: visualW }}
            renderItem={({ item }) => (
              <View style={[styles.visual, { width: visualW }]}>
                {renderVisual(item)}
                <View style={styles.visualBadge} pointerEvents="none">
                  <ProvenanceBadge kind={visual === 'ai' && aiDone && item.id === outfit.id ? (aiDone.isDemo ? 'demo' : 'ai') : result.isDemo ? 'demo' : 'drape'} />
                </View>
              </View>
            )}
          />
          {variations.length > 1 ? (
            <View style={styles.pagerNav}>
              <IconButton icon={ChevronLeft} accessibilityLabel="Previous variation" onPress={() => goTo(index - 1)} disabled={index === 0} variant="inverse" size={40} />
              <IconButton icon={ChevronRight} accessibilityLabel="Next variation" onPress={() => goTo(index + 1)} disabled={index === variations.length - 1} variant="inverse" size={40} />
            </View>
          ) : null}
        </View>

        {visual === 'ai' ? <Animated.View entering={FadeIn.duration(durations.base).reduceMotion(ReduceMotion.System)}>{aiPanel()}</Animated.View> : null}

        <Animated.View key={outfit.id} entering={FadeIn.duration(durations.base).reduceMotion(ReduceMotion.System)} style={styles.info}>
          <View style={styles.colorRow}>
            <View style={[styles.colorChip, { backgroundColor: outfit.mainColor.hex }]} />
            <View style={styles.flex}>
              <Text variant="eyebrow" tone="secondary">
                {outfit.category}
              </Text>
              <Text variant="label">
                {outfit.mainColor.name} · <Text variant="hex">{outfit.mainColor.hex}</Text>
              </Text>
            </View>
          </View>
          <Text variant="h1" accessibilityRole="header">
            {outfit.name}
          </Text>
          <Text variant="bodyM" tone="secondary">
            {outfit.reason}
          </Text>

          <View style={styles.block}>
            <Text variant="eyebrow" tone="secondary">
              The pieces
            </Text>
            {outfit.pieces.map((p) => (
              <View key={`${p.garment}-${p.role}`} style={styles.piece}>
                <View style={[styles.pieceChip, { backgroundColor: p.hex }]} />
                <Text variant="bodyM" style={styles.flex}>
                  {p.colorName} {p.label.toLowerCase()}
                </Text>
                <Text variant="hex" tone="secondary">
                  {p.hex}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.block}>
            <Text variant="eyebrow" tone="secondary">
              Suitable for
            </Text>
            <View style={styles.chips}>
              {outfit.occasions.map((o) => (
                <Badge key={o} label={OCCASIONS[o]} />
              ))}
            </View>
          </View>

          <View style={styles.block}>
            <Text variant="eyebrow" tone="secondary">
              Matching accessories
            </Text>
            {outfit.accessories.map((a) => (
              <Text key={a} variant="bodyM">
                — {a}
              </Text>
            ))}
          </View>

          {outfit.combinations.length ? (
            <View style={styles.block}>
              <Text variant="eyebrow" tone="secondary">
                Also try with {outfit.mainColor.name}
              </Text>
              {outfit.combinations.map((c) => (
                <TextButton key={c} label={c} onPress={() => goTo(variations.findIndex((v) => v.name === c))} />
              ))}
            </View>
          ) : null}
        </Animated.View>

        <View style={styles.actions}>
          {!editorial ? (
            <PrimaryButton
              label={savedEntry ? 'Saved to wardrobe' : 'Save to wardrobe'}
              icon={savedEntry ? BookmarkCheck : Bookmark}
              iconPosition="leading"
              onPress={toggleSave}
              loading={save.isPending || remove.isPending}
              fullWidth
            />
          ) : null}
          <SecondaryButton
            label="Generate another variation"
            icon={RefreshCw}
            iconPosition="leading"
            onPress={() => (visual === 'ai' && aiDone ? void generation.generate({ consentToUpload: consent }) : goTo((index + 1) % variations.length))}
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  content: { paddingHorizontal: layout.screenPaddingX, gap: spacing[5] },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pager: { borderWidth: 1.5, borderColor: palette.navy, backgroundColor: palette.paper },
  visual: { overflow: 'hidden' },
  visualBadge: { position: 'absolute', top: spacing[3], left: spacing[3] },
  pagerNav: { position: 'absolute', right: spacing[3], bottom: spacing[3], flexDirection: 'row', gap: spacing[2] },
  demoStamp: {
    position: 'absolute',
    top: '42%',
    left: spacing[4],
    right: spacing[4],
    backgroundColor: palette.saffron,
    paddingVertical: spacing[2],
    alignItems: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  aiBox: { gap: spacing[3], padding: spacing[4], backgroundColor: palette.paper, borderRadius: radii.md, borderWidth: 1, borderColor: palette.borderWarm },
  info: { gap: spacing[3] },
  colorRow: { flexDirection: 'row', gap: spacing[3], alignItems: 'center' },
  colorChip: { width: 40, height: 40, borderWidth: 1.5, borderColor: palette.navy },
  block: { gap: spacing[2], marginTop: spacing[3] },
  piece: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  pieceChip: { width: 22, height: 22, borderWidth: 1, borderColor: palette.navy },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  actions: { gap: spacing[3], marginTop: spacing[2] },
  row: { flexDirection: 'row', gap: spacing[3] },
  flex: { flex: 1 },
  center: { alignSelf: 'center' },
});
