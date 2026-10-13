import { Heart } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { colors as tokens, palette } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { formatDate } from '@/utils/format';

import { PaletteStrip } from './PaletteStrip';

interface ColorPaletteCardProps {
  name: string;
  colors: { name: string; hex: string }[];
  subtitle?: string;
  createdAt?: string;
  isFavorite?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  width?: number;
  style?: StyleProp<ViewStyle>;
}

/** Saved-palette card: a stacked colour block over a paper label, like a paint-chip card. */
export function ColorPaletteCard({ name, colors, subtitle, createdAt, isFavorite, onPress, onLongPress, width = 200, style }: ColorPaletteCardProps) {
  const lead = colors.slice(0, 6);
  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      pressedScale={0.97}
      accessibilityRole="button"
      accessibilityLabel={`${name} palette, ${colors.length} colours${isFavorite ? ', favourite' : ''}`}
      accessibilityHint={onLongPress ? 'Long press for options' : undefined}
      style={[styles.card, { width }, shadows.offsetSmall, style]}>
      <View style={styles.blocks}>
        <View style={[styles.hero, { backgroundColor: lead[0]?.hex ?? palette.sand }]} />
        <PaletteStrip colors={lead.slice(1)} height={28} style={styles.strip} />
      </View>
      <View style={styles.meta}>
        <View style={styles.titleRow}>
          <Text variant="h3" numberOfLines={1} style={styles.title}>
            {name}
          </Text>
          {isFavorite ? <Heart size={16} color={palette.coralText} fill={palette.coral} /> : null}
        </View>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {subtitle ?? `${colors.length} colours${createdAt ? ` · ${formatDate(createdAt)}` : ''}`}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.paper, borderWidth: 1.5, borderColor: palette.navy },
  blocks: { height: 120 },
  hero: { flex: 1 },
  strip: { borderWidth: 0, borderTopWidth: 1, borderColor: palette.navy },
  meta: { padding: spacing[3], gap: 2, borderTopWidth: 1.5, borderColor: tokens.border.strong },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  title: { flex: 1 },
});
