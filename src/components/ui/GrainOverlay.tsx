import { Image, StyleSheet, View } from 'react-native';

const GRAIN = require('@/assets/images/grain.png');

/**
 * Subtle paper grain. A single 160px tile repeated by the native image view — one draw call,
 * no per-frame cost — so it can sit on every editorial surface. The wrapper ignores touches so
 * the texture never blocks controls underneath.
 */
export function GrainOverlay({ opacity = 0.35 }: { opacity?: number }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}>
      <Image source={GRAIN} resizeMode="repeat" style={[styles.fill, { opacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
});
