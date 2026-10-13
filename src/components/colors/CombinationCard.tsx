import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

interface CombinationCardProps {
  name: string;
  hexes: string[];
  note: string;
  tag?: string;
  width?: number;
  style?: StyleProp<ViewStyle>;
}

/** Colour combination as overlapping blocks — proportions hint at how much of each to wear. */
export function CombinationCard({ name, hexes, note, tag, width = 220, style }: CombinationCardProps) {
  const [a, b, c] = hexes;
  return (
    <View
      accessible
      accessibilityLabel={`${name}. ${note}`}
      style={[styles.card, { width }, style]}>
      <View style={styles.blocks}>
        <View style={[styles.main, { backgroundColor: a }]} />
        <View style={styles.side}>
          <View style={[styles.secondary, { backgroundColor: b }]} />
          {c ? <View style={[styles.tertiary, { backgroundColor: c }]} /> : null}
        </View>
      </View>
      <View style={styles.meta}>
        {tag ? (
          <Text variant="eyebrow" tone="secondary" style={styles.tag}>
            {tag}
          </Text>
        ) : null}
        <Text variant="h3">{name}</Text>
        <Text variant="bodyS" tone="secondary" numberOfLines={2}>
          {note}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.paper, borderWidth: 1.5, borderColor: palette.navy },
  blocks: { flexDirection: 'row', height: 110 },
  main: { flex: 3 },
  side: { flex: 2 },
  secondary: { flex: 3 },
  tertiary: { flex: 1 },
  meta: { padding: spacing[3], gap: 4, borderTopWidth: 1.5, borderColor: palette.navy },
  tag: { fontSize: 10 },
});
