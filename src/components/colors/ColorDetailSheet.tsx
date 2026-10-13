import * as Clipboard from 'expo-clipboard';
import { Copy, Heart, Shirt } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Badge } from '@/components/ui/Badge';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { findLibraryColorByHex } from '@/features/colors/colorLibrary';
import { haptics } from '@/lib/haptics';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { ColorRecommendation, GarmentCategory } from '@/types/domain';
import { contrastRatio, darkVariant, lightVariant, readableOn } from '@/utils/color';

const GARMENT_LABELS: Record<GarmentCategory, string> = {
  shirt: 'Shirts',
  tee: 'T-shirts',
  knit: 'Knitwear',
  jacket: 'Jackets',
  coat: 'Coats',
  trousers: 'Trousers',
  jeans: 'Jeans',
  skirt: 'Skirts',
  dress: 'Dresses',
  shoes: 'Shoes',
  accessory: 'Accessories',
};

const ROLE_LABELS: Record<ColorRecommendation['role'], string> = {
  core: 'Core colour',
  accent: 'Accent',
  neutral: 'Neutral',
  experimental: 'Try with care',
};

export interface ColorDetailSheetColor {
  name: string;
  hex: string;
  role?: ColorRecommendation['role'];
  reason?: string;
  garments?: GarmentCategory[];
  pairings?: string[];
}

interface ColorDetailSheetProps {
  color: ColorDetailSheetColor | null;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onShowOutfits?: () => void;
}

function MiniSwatch({ hex, label }: { hex: string; label: string }) {
  return (
    <View style={styles.mini} accessible accessibilityLabel={`${label} ${hex}`}>
      <View style={[styles.miniBlock, { backgroundColor: hex }]} />
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="hex" tone="secondary" style={styles.miniHex}>
        {hex}
      </Text>
    </View>
  );
}

export function ColorDetailSheet({ color, onClose, isFavorite, onToggleFavorite, onShowOutfits }: ColorDetailSheetProps) {
  const visible = color !== null;
  const c = color ?? { name: '', hex: '#000000' };
  const garments = c.garments ?? findLibraryColorByHex(c.hex)?.garments ?? [];
  const onColor = readableOn(c.hex);
  const contrastWithCream = contrastRatio(c.hex, palette.cream);

  const copyHex = async () => {
    await Clipboard.setStringAsync(c.hex);
    haptics.success();
    toast.success(`${c.hex} copied`);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      eyebrow={c.role ? ROLE_LABELS[c.role] : 'Colour'}
      title={c.name}
      footer={
        <View style={styles.footer}>
          {onToggleFavorite ? (
            <SecondaryButton
              label={isFavorite ? 'Favourited' : 'Favourite'}
              icon={Heart}
              iconPosition="leading"
              size="md"
              onPress={onToggleFavorite}
              style={styles.flex}
            />
          ) : null}
          {onShowOutfits ? <PrimaryButton label="Outfits" icon={Shirt} iconPosition="leading" size="md" onPress={onShowOutfits} style={styles.flex} /> : null}
        </View>
      }>
      {visible ? (
        <>
          <View style={[styles.hero, { backgroundColor: c.hex }]}>
            <Text variant="hex" color={onColor} style={styles.heroHex}>
              {c.hex}
            </Text>
            <SecondaryButton
              label="Copy hex"
              icon={Copy}
              iconPosition="leading"
              size="sm"
              tone={onColor === palette.cream ? 'cream' : 'ink'}
              onPress={() => void copyHex()}
              accessibilityHint={`Copies ${c.hex} to the clipboard`}
            />
          </View>
          {c.reason ? (
            <Text variant="bodyM" tone="secondary">
              {c.reason}
            </Text>
          ) : null}
          {garments.length ? (
            <View style={styles.block}>
              <Text variant="eyebrow" tone="secondary">
                Wear it as
              </Text>
              <View style={styles.chips}>
                {garments.map((g) => (
                  <Badge key={g} label={GARMENT_LABELS[g]} />
                ))}
              </View>
            </View>
          ) : null}
          <View style={styles.block}>
            <Text variant="eyebrow" tone="secondary">
              Light & dark variants
            </Text>
            <View style={styles.row}>
              <MiniSwatch hex={lightVariant(c.hex)} label="Lighter" />
              <MiniSwatch hex={c.hex} label="Base" />
              <MiniSwatch hex={darkVariant(c.hex)} label="Deeper" />
            </View>
          </View>
          {c.pairings?.length ? (
            <View style={styles.block}>
              <Text variant="eyebrow" tone="secondary">
                Pairs well with
              </Text>
              <View style={styles.row}>
                {c.pairings.map((hex) => (
                  <MiniSwatch key={hex} hex={hex} label={findLibraryColorByHex(hex)?.name ?? 'Pairing'} />
                ))}
              </View>
            </View>
          ) : null}
          <Text variant="caption" tone="secondary">
            Contrast with cream text: {contrastWithCream.toFixed(1)}:1 · On-screen colour varies by display and brightness.
          </Text>
        </>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  hero: { height: 150, padding: spacing[4], justifyContent: 'space-between', borderWidth: 1.5, borderColor: palette.navy },
  heroHex: { fontSize: 20, lineHeight: 26 },
  block: { gap: spacing[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  row: { flexDirection: 'row', gap: spacing[3] },
  mini: { flex: 1, gap: 4, maxWidth: 110 },
  miniBlock: { height: 52, borderWidth: 1, borderColor: palette.navy },
  miniHex: { fontSize: 10, lineHeight: 12 },
  footer: { flexDirection: 'row', gap: spacing[3] },
  flex: { flex: 1 },
});
