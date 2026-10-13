import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics } from '@/lib/haptics';
import { scales, springs } from '@/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale applied while pressed. */
  pressedScale?: number;
  haptic?: 'light' | 'selection' | 'none';
}

/**
 * Pressable that scales on the UI thread. The base of every tappable surface so press feedback
 * feels identical across buttons, cards and swatches.
 */
export function PressableScale({
  children,
  style,
  pressedScale = scales.pressed,
  haptic = 'light',
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        scale.set(withSpring(pressedScale, springs.press));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withSpring(1, springs.press));
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic === 'light') haptics.light();
        else if (haptic === 'selection') haptics.selection();
        onPress?.(event);
      }}
      style={[style, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}
