import { Bookmark, BookmarkCheck, Share2 } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ProvenanceBadge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import type { Outfit } from '@/types/outfits';

import { DrapePreview } from './DrapePreview';
import { OutfitFlatLay } from './OutfitFlatLay';

interface OutfitCardProps {
  outfit: Outfit;
  width: number;
  /** `drape` shows the colour on the user's portrait; `flatlay` shows the illustrated outfit. */
  visual?: 'drape' | 'flatlay';
  portraitUri?: string | null;
  saved?: boolean;
  onPress?: () => void;
  onToggleSave?: () => void;
  onShare?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const OutfitCard = memo(function OutfitCard({
  outfit,
  width,
  visual = 'flatlay',
  portraitUri,
  saved = false,
  onPress,
  onToggleSave,
  onShare,
  style,
}: OutfitCardProps) {
  const visualHeight = visual === 'drape' ? width * 1.2 : width * 1.12;
  return (
    <View style={[styles.card, { width }, shadows.offsetSmall, style]}>
      <PressableScale
        onPress={onPress}
        pressedScale={0.98}
        accessibilityRole="button"
        accessibilityLabel={`${outfit.name}. ${outfit.category}.`}
        accessibilityHint="Opens outfit details">
        {visual === 'drape' ? (
          <DrapePreview hex={outfit.mainColor.hex} colorName={outfit.mainColor.name} portraitUri={portraitUri} width={width - 3} height={visualHeight} />
        ) : (
          <OutfitFlatLay pieces={outfit.pieces} size={width - 3} />
        )}
        <View style={styles.badges} pointerEvents="none">
          <ProvenanceBadge kind="drape" />
        </View>
        <View style={styles.meta}>
          <View style={styles.colorRow}>
            <View style={[styles.dot, { backgroundColor: outfit.mainColor.hex }]} />
            <Text variant="eyebrow" tone="secondary" numberOfLines={1} style={styles.flex}>
              {outfit.mainColor.name} · {outfit.category}
            </Text>
          </View>
          <Text variant="h3" numberOfLines={2}>
            {outfit.name}
          </Text>
          <Text variant="bodyS" tone="secondary" numberOfLines={3}>
            {outfit.reason}
          </Text>
        </View>
      </PressableScale>
      {onToggleSave || onShare ? (
        <View style={styles.actions}>
          {onToggleSave ? (
            <IconButton
              icon={saved ? BookmarkCheck : Bookmark}
              accessibilityLabel={saved ? `Remove ${outfit.name} from wardrobe` : `Save ${outfit.name} to wardrobe`}
              onPress={onToggleSave}
              variant={saved ? 'filled' : 'outline'}
              selected={saved}
              size={40}
              iconSize={18}
            />
          ) : null}
          {onShare ? (
            <IconButton icon={Share2} accessibilityLabel={`Share ${outfit.name}`} onPress={onShare} variant="outline" size={40} iconSize={18} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { backgroundColor: palette.paper, borderWidth: 1.5, borderColor: palette.navy },
  badges: { position: 'absolute', top: spacing[2], left: spacing[2] },
  meta: { padding: spacing[4], paddingBottom: spacing[2], gap: spacing[2], borderTopWidth: 1.5, borderColor: palette.navy },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  dot: { width: 12, height: 12, borderWidth: 1, borderColor: palette.navy },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing[2], paddingHorizontal: spacing[4], paddingBottom: spacing[4], paddingTop: spacing[2] },
});
