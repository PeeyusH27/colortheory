import { Check } from 'lucide-react-native';
import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/colors';
import { scales, springs } from '@/theme/motion';
import { spacing } from '@/theme/spacing';
import { readableOn } from '@/utils/color';

interface ColorSwatchProps {
  name: string;
  hex: string;
  size?: number;
  /** `chip` = colour block with label below; `tile` = tall editorial block with label inside. */
  variant?: 'chip' | 'tile';
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  showHex?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Selectable colour swatch. Selection scales the block slightly and adds an ink keyline + tick. */
export const ColorSwatch = memo(function ColorSwatch({
  name,
  hex,
  size = 64,
  variant = 'chip',
  selected = false,
  onPress,
  onLongPress,
  showHex = true,
  style,
}: ColorSwatchProps) {
  const onColor = readableOn(hex);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(selected ? scales.selected : 1, springs.selection) }],
  }));
  const hexLabel = hex.replace('#', '');
  const a11yLabel = `${name}, hex ${hexLabel.split('').join(' ')}${selected ? ', selected' : ''}`;

  const block =
    variant === 'tile' ? (
      <Animated.View style={[styles.tile, { width: size, height: size * 1.5, backgroundColor: hex }, selected && styles.selectedBorder, animated]}>
        <View style={styles.tileText}>
          <Text variant="label" color={onColor} numberOfLines={2} style={styles.tileName}>
            {name}
          </Text>
          {showHex ? (
            <Text variant="hex" color={onColor} style={styles.tileHex}>
              {hex}
            </Text>
          ) : null}
        </View>
        {selected ? (
          <View style={[styles.tick, { backgroundColor: onColor }]}>
            <Check size={12} color={hex} strokeWidth={3} />
          </View>
        ) : null}
      </Animated.View>
    ) : (
      <View style={[styles.chipWrap, { width: size }]}>
        <Animated.View style={[styles.chip, { width: size, height: size, backgroundColor: hex }, selected && styles.selectedBorder, animated]}>
          {selected ? <Check size={18} color={onColor} strokeWidth={3} /> : null}
        </Animated.View>
        <Text variant="caption" numberOfLines={1} style={styles.chipName}>
          {name}
        </Text>
        {showHex ? (
          <Text variant="hex" tone="secondary" style={styles.chipHex}>
            {hex}
          </Text>
        ) : null}
      </View>
    );

  if (!onPress && !onLongPress) {
    return (
      <View accessible accessibilityLabel={a11yLabel} style={style}>
        {block}
      </View>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      haptic="selection"
      pressedScale={0.95}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected }}
      accessibilityHint="Shows colour details"
      style={style}>
      {block}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  chipWrap: { gap: 6 },
  chip: { alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  chipName: { marginTop: 2 },
  chipHex: { fontSize: 11, lineHeight: 14 },
  selectedBorder: { borderWidth: 2.5, borderColor: palette.navy },
  tile: { justifyContent: 'flex-end', padding: spacing[3] },
  tileText: { gap: 2 },
  tileName: { fontSize: 14, lineHeight: 18 },
  tileHex: { fontSize: 11, lineHeight: 14, opacity: 0.9 },
  tick: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
