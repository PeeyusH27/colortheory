import { Image } from 'expo-image';
import { Trash2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ProvenanceBadge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useAnalysis, useSignedPreviewUri } from '@/features/data/queries';
import { findOutfit } from '@/features/outfits/recommendOutfits';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { SavedOutfit } from '@/types/domain';
import { formatDate } from '@/utils/format';

import { OutfitFlatLay } from './OutfitFlatLay';

interface SavedOutfitCardProps {
  saved: SavedOutfit;
  width: number;
  onOpen: (outfitId: string, analysisId: string | null) => void;
  onRemove: () => void;
}

/** Wardrobe tile. Rebuilds the illustrated outfit from its analysis, or shows the stored AI image. */
export function SavedOutfitCard({ saved, width, onOpen, onRemove }: SavedOutfitCardProps) {
  const { preview } = saved;
  const analysis = useAnalysis(preview.analysisId ?? undefined);
  const signed = useSignedPreviewUri(preview.mode === 'ai' ? preview.imagePath : null);
  const outfit = analysis.data?.result ? findOutfit(analysis.data.result, preview.outfitId) : null;
  const imageUri = preview.imageUri ?? signed.data ?? null;

  return (
    <View style={[styles.card, { width }]}>
      <PressableScale
        onPress={() => onOpen(preview.outfitId, preview.analysisId)}
        pressedScale={0.98}
        accessibilityRole="button"
        accessibilityLabel={`${preview.outfitName}, saved ${formatDate(saved.createdAt)}`}>
        {preview.mode === 'ai' && imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: width - 3, height: (width - 3) * 1.25 }} contentFit="cover" transition={200} />
        ) : outfit ? (
          <OutfitFlatLay pieces={outfit.pieces} size={width - 3} />
        ) : (
          <View style={[styles.fallback, { height: width, backgroundColor: preview.garmentHex }]} />
        )}
        <View style={styles.badge} pointerEvents="none">
          <ProvenanceBadge kind={preview.isDemo ? 'demo' : preview.mode === 'ai' ? 'ai' : 'drape'} />
        </View>
        <View style={styles.meta}>
          <Text variant="label" numberOfLines={2}>
            {preview.outfitName}
          </Text>
          <Text variant="caption" tone="secondary">
            Saved {formatDate(saved.createdAt)}
          </Text>
        </View>
      </PressableScale>
      <IconButton icon={Trash2} accessibilityLabel={`Remove ${preview.outfitName} from wardrobe`} onPress={onRemove} size={36} iconSize={16} variant="inverse" style={styles.remove} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.paper, borderWidth: 1.5, borderColor: palette.navy },
  fallback: { borderBottomWidth: 1.5, borderColor: palette.navy },
  badge: { position: 'absolute', top: spacing[2], left: spacing[2] },
  meta: { padding: spacing[3], gap: 2, borderTopWidth: 1.5, borderColor: palette.navy },
  remove: { position: 'absolute', top: spacing[2], right: spacing[2], borderColor: palette.navy },
});
