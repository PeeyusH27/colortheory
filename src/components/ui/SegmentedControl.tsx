import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { colors, palette } from '@/theme/colors';
import { springs } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { layout, spacing } from '@/theme/spacing';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

export function SegmentedControl<T extends string>({ options, value, onChange, accessibilityLabel }: SegmentedControlProps<T>) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = options.length > 0 ? width / options.length : 0;

  const indicatorStyle = useAnimatedStyle(() => ({
    width: segment,
    transform: [{ translateX: withSpring(index * segment, springs.selection) }],
  }));

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width - 8)}
      style={styles.track}>
      {width > 0 ? <Animated.View style={[styles.indicator, indicatorStyle]} /> : null}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => onChange(o.value)}
            haptic="selection"
            pressedScale={0.97}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            style={styles.segment}>
            <Text variant="label" color={selected ? palette.cream : colors.text.primary} numberOfLines={1} style={styles.label}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.warm,
    backgroundColor: palette.sand,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: radii.pill,
    backgroundColor: palette.navy,
  },
  segment: {
    flex: 1,
    minHeight: layout.minTouchTarget - 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  label: { fontSize: 14 },
});
