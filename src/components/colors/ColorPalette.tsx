import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import { enterUp } from '@/theme/motion';
import { layout, spacing } from '@/theme/spacing';

import { ColorSwatch } from './ColorSwatch';

interface PaletteItem {
  id: string;
  name: string;
  hex: string;
}

interface ColorPaletteProps {
  colors: PaletteItem[];
  selectedId?: string | null;
  onSelect?: (color: PaletteItem) => void;
  columns?: number;
  variant?: 'chip' | 'tile';
  /** Stagger the swatches in when the palette first appears. */
  animateIn?: boolean;
}

/** Responsive swatch grid. Column width adapts to the screen so swatches never overflow. */
export function ColorPalette({ colors, selectedId, onSelect, columns = 4, variant = 'chip', animateIn = true }: ColorPaletteProps) {
  const { width } = useWindowDimensions();
  const available = Math.min(width, layout.maxContentWidth) - layout.screenPaddingX * 2;
  const gap = variant === 'tile' ? spacing[2] : spacing[3];
  const size = Math.floor((available - gap * (columns - 1)) / columns);

  return (
    <View accessibilityRole="list" style={[styles.grid, { gap, rowGap: variant === 'tile' ? gap : spacing[5] }]}>
      {colors.map((c, i) => (
        <Animated.View key={c.id} entering={animateIn ? enterUp(i) : undefined}>
          <ColorSwatch
            name={c.name}
            hex={c.hex}
            size={size}
            variant={variant}
            selected={selectedId === c.id}
            onPress={onSelect ? () => onSelect(c) : undefined}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
