import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { palette as tokens } from '@/theme/colors';
import { readableOn } from '@/utils/color';

interface PaletteStripProps {
  colors: { name?: string; hex: string }[];
  height?: number;
  /** Show hex codes inside each band (reference-style palette bar). */
  labeled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Edge-to-edge colour bands, like the palette row in a printed style guide. */
export function PaletteStrip({ colors, height = 56, labeled = false, style }: PaletteStripProps) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Palette: ${colors.map((c) => c.name ?? c.hex).join(', ')}`}
      style={[styles.row, { height }, style]}>
      {colors.map((c, i) => (
        <View key={`${c.hex}-${i}`} style={[styles.band, { backgroundColor: c.hex }]}>
          {labeled ? (
            <Text variant="hex" color={readableOn(c.hex)} style={styles.hex} numberOfLines={1} adjustsFontSizeToFit>
              {c.hex.replace('#', '')}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: tokens.navy },
  band: { flex: 1, justifyContent: 'flex-end', padding: 4 },
  hex: { fontSize: 9, lineHeight: 11, letterSpacing: 0.2 },
});
