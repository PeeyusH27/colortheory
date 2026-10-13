import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

interface CharacteristicScaleProps {
  label: string;
  /** 0 … 1 position on the track. */
  value: number;
  estimate: string;
  left: string;
  right: string;
  gradient: [string, string, ...string[]];
}

/** A labelled gradient track with a marker — shows an *estimate*, not a measurement. */
export function CharacteristicScale({ label, value, estimate, left, right, gradient }: CharacteristicScaleProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View style={styles.root} accessible accessibilityLabel={`${label}: estimated ${estimate}, on a scale from ${left} to ${right}`}>
      <View style={styles.header}>
        <Text variant="eyebrow" tone="secondary">
          {label}
        </Text>
        <Text variant="label">{estimate}</Text>
      </View>
      <View style={styles.trackWrap}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.track} />
        <View style={[styles.marker, { left: `${pct}%` }]} />
      </View>
      <View style={styles.ends}>
        <Text variant="caption" tone="secondary">
          {left}
        </Text>
        <Text variant="caption" tone="secondary">
          {right}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing[2] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  trackWrap: { height: 22, justifyContent: 'center' },
  track: { height: 10, borderWidth: 1, borderColor: palette.navy },
  marker: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginLeft: -8,
    backgroundColor: palette.cream,
    borderWidth: 2.5,
    borderColor: palette.navy,
    transform: [{ rotate: '45deg' }],
  },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
});
