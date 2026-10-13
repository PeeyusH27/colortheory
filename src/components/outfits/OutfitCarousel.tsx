import { useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type ListRenderItem } from 'react-native';
import Animated from 'react-native-reanimated';

import { palette } from '@/theme/colors';
import { enterRight } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { layout, spacing } from '@/theme/spacing';
import type { Outfit } from '@/types/outfits';

import { OutfitCard } from './OutfitCard';

interface OutfitCarouselProps {
  outfits: Outfit[];
  visual?: 'drape' | 'flatlay';
  portraitUri?: string | null;
  savedIds?: Set<string>;
  onOpen: (outfit: Outfit) => void;
  onToggleSave?: (outfit: Outfit) => void;
  onShare?: (outfit: Outfit) => void;
  /** Card width as a fraction of the screen. */
  widthRatio?: number;
}

/**
 * Horizontally swipeable, snapping outfit gallery. Cards enter with a short horizontal stagger;
 * a progress rail shows position without relying on colour alone.
 */
export function OutfitCarousel({
  outfits,
  visual = 'flatlay',
  portraitUri,
  savedIds,
  onOpen,
  onToggleSave,
  onShare,
  widthRatio = 0.72,
}: OutfitCarouselProps) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(340, Math.round(width * widthRatio));
  const gap = spacing[4];
  const [index, setIndex] = useState(0);

  const renderItem: ListRenderItem<Outfit> = ({ item, index: i }) => (
    <Animated.View entering={enterRight(Math.min(i, 4))}>
      <OutfitCard
        outfit={item}
        width={cardWidth}
        visual={visual}
        portraitUri={portraitUri}
        saved={savedIds?.has(item.id)}
        onPress={() => onOpen(item)}
        onToggleSave={onToggleSave ? () => onToggleSave(item) : undefined}
        onShare={onShare ? () => onShare(item) : undefined}
      />
    </Animated.View>
  );

  return (
    <View>
      <FlatList
        data={outfits}
        keyExtractor={(o) => o.id}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + gap}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: layout.screenPaddingX, gap, paddingBottom: spacing[3], paddingRight: layout.screenPaddingX + 8 }}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + gap)))}
        initialNumToRender={3}
        windowSize={5}
        accessibilityRole="list"
      />
      {outfits.length > 1 ? (
        <View style={styles.rail} accessibilityLabel={`Outfit ${index + 1} of ${outfits.length}`} accessible>
          {outfits.map((o, i) => (
            <View key={o.id} style={[styles.tick, i === index && styles.tickActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { flexDirection: 'row', gap: 4, paddingHorizontal: layout.screenPaddingX, marginTop: spacing[2] },
  tick: { flex: 1, maxWidth: 28, height: 3, borderRadius: radii.pill, backgroundColor: palette.linen },
  tickActive: { backgroundColor: palette.navy },
});
