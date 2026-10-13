import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CombinationCard } from '@/components/colors/CombinationCard';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { DrapePreview } from '@/components/outfits/DrapePreview';
import { OutfitCard } from '@/components/outfits/OutfitCard';
import { OutfitCarousel } from '@/components/outfits/OutfitCarousel';
import { ProvenanceBadge } from '@/components/ui/Badge';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { usePreferencesStore } from '@/store/preferencesStore';
import { palette } from '@/theme/colors';
import { enterUp } from '@/theme/motion';
import { layout, spacing } from '@/theme/spacing';
import type { ColorAnalysisResult } from '@/types/domain';
import type { Outfit } from '@/types/outfits';

import { recommendOutfits } from './recommendOutfits';
import { shareOutfit } from './share';
import { useOutfitSaving } from './useOutfitSaving';

interface OutfitGalleryViewProps {
  result: ColorAnalysisResult;
  analysisId: string | null;
  portraitUri: string | null;
  initialHex?: string | null;
  /** Editorial (non-personal) mode when the user has no analysis yet. */
  editorial?: boolean;
}

/**
 * Outfit gallery in the spirit of the reference style guide: the same portrait in several
 * colours, then outfits built around the selected colour, then full combinations.
 */
export function OutfitGalleryView({ result, analysisId, portraitUri, initialHex = null, editorial = false }: OutfitGalleryViewProps) {
  const { width } = useWindowDimensions();
  const [selectedHex, setSelectedHex] = useState<string | null>(initialHex);
  const [visual, setVisual] = useState<'flatlay' | 'drape'>('flatlay');
  const addRecent = usePreferencesStore((s) => s.addRecentlyViewed);
  const saving = useOutfitSaving(analysisId, result.isDemo);

  const colors = [...result.recommendedColors, ...result.experimentalColors];
  const selected = colors.find((c) => c.hex === selectedHex) ?? null;
  const focused = recommendOutfits(result, { selectedHex, limit: 10 });
  const looks = recommendOutfits(result, { limit: 8, includeExperimental: false });
  const panelW = Math.min(118, (width - layout.screenPaddingX * 2) / 3.2);
  const gridW = Math.floor((Math.min(width, layout.maxContentWidth) - layout.screenPaddingX * 2 - spacing[4]) / 2);

  const open = (o: Outfit) => {
    addRecent({ kind: 'outfit', id: o.id, label: o.name, hex: o.mainColor.hex });
    router.push({ pathname: '/outfit/[outfitId]', params: { outfitId: o.id, analysisId: analysisId ?? 'editorial' } });
  };

  return (
    <View>
      <View style={styles.gutter}>
        <View style={styles.badges}>
          <ProvenanceBadge kind={result.isDemo ? 'demo' : 'drape'} />
          {editorial ? (
            <Text variant="caption" tone="secondary">
              Sample palette — analyse your look to personalise.
            </Text>
          ) : null}
        </View>
        <SectionHeader index="01" title="See it on you" subtitle={portraitUri ? 'Your photo with a colour drape across the shoulders — the way a stylist holds fabric up to your face.' : 'Colour drapes on an illustrated figure. Add a portrait to see them on you.'} />
      </View>
      <FlatList
        horizontal
        data={result.recommendedColors.slice(0, 6)}
        keyExtractor={(c) => c.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hList}
        renderItem={({ item, index }) => (
          <Animated.View entering={enterUp(index)}>
            <PressableScale
              onPress={() => setSelectedHex(item.hex === selectedHex ? null : item.hex)}
              haptic="selection"
              accessibilityRole="button"
              accessibilityLabel={`Show outfits in ${item.name}`}
              accessibilityState={{ selected: item.hex === selectedHex }}>
              <DrapePreview
                hex={item.hex}
                colorName={item.name}
                portraitUri={portraitUri}
                width={panelW}
                height={panelW * 1.45}
                style={[styles.panel, item.hex === selectedHex && styles.panelSelected]}
              />
              <Text variant="caption" style={styles.panelName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text variant="hex" tone="secondary" style={styles.panelHex}>
                {item.hex}
              </Text>
            </PressableScale>
          </Animated.View>
        )}
      />

      <View style={[styles.gutter, styles.section]}>
        <SectionHeader index="02" title={selected ? `Looks in ${selected.name}` : 'Looks for your palette'} actionLabel={selected ? 'All colours' : undefined} onAction={() => setSelectedHex(null)} />
        <SegmentedControl
          options={[
            { value: 'flatlay', label: 'Outfit' },
            { value: 'drape', label: 'Colour on me' },
          ]}
          value={visual}
          onChange={setVisual}
          accessibilityLabel="Preview style"
        />
      </View>
      <View style={styles.carousel}>
        <OutfitCarousel
          outfits={focused}
          visual={visual}
          portraitUri={portraitUri}
          savedIds={saving.savedIds}
          onOpen={open}
          onToggleSave={editorial ? undefined : saving.toggle}
          onShare={(o) => void shareOutfit(o)}
        />
      </View>

      <View style={[styles.gutter, styles.section]}>
        <SectionHeader index="03" title="Colour combinations" subtitle="Proportions hint at how much of each to wear." />
      </View>
      <FlatList
        horizontal
        data={result.combinations}
        keyExtractor={(c) => c.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hList}
        renderItem={({ item }) => <CombinationCard name={item.name} hexes={item.hexes} note={item.note} width={220} />}
      />

      <View style={[styles.gutter, styles.section]}>
        <SectionHeader index="04" title="Complete looks" />
        <View style={styles.grid}>
          {looks.map((o, i) => (
            <Animated.View key={o.id} entering={enterUp(i)}>
              <OutfitCard
                outfit={o}
                width={gridW}
                saved={saving.savedIds.has(o.id)}
                onPress={() => open(o)}
                onToggleSave={editorial ? undefined : () => saving.toggle(o)}
              />
            </Animated.View>
          ))}
        </View>
        <InlineAlert
          tone="info"
          title="Want to see the real thing?"
          message="Open any outfit to request an AI try-on preview. It’s generated from your portrait only with your consent, and clearly labelled as an approximation."
          style={styles.aiNote}
          action={
            <View style={styles.aiRow}>
              <Sparkles size={14} color={palette.denim} />
              <Text variant="caption" tone="accent">
                Colour drapes and illustrations above are not AI-generated.
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: layout.screenPaddingX },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flexWrap: 'wrap', marginBottom: spacing[5] },
  hList: { paddingHorizontal: layout.screenPaddingX, gap: spacing[3], paddingRight: layout.screenPaddingX + 4, paddingBottom: spacing[2] },
  panel: { borderWidth: 1.5, borderColor: palette.navy },
  panelSelected: { borderWidth: 3, borderColor: palette.coral },
  panelName: { marginTop: spacing[2] },
  panelHex: { fontSize: 10, lineHeight: 12 },
  section: { marginTop: layout.sectionGap, gap: spacing[3] },
  carousel: { marginTop: spacing[4] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] },
  aiNote: { marginTop: spacing[6] },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[1] },
});
