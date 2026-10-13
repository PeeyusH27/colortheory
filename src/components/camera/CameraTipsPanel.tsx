import { Ban, Glasses, Lightbulb, Palette, Sun, Wallpaper } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { palette } from '@/theme/colors';
import { durations } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

export const CAMERA_TIPS = [
  { icon: Sun, text: 'Use natural, even lighting.' },
  { icon: Lightbulb, text: 'Face a window or another soft light source.' },
  { icon: Ban, text: 'Avoid beauty filters and heavy edits.' },
  { icon: Glasses, text: 'Keep your face unobstructed — no sunglasses or hats.' },
  { icon: Palette, text: 'Avoid strong coloured lighting (LED strips, neon).' },
  { icon: Wallpaper, text: 'Prefer a plain, neutral background.' },
] as const;

/** Compact, dismissible tips sheet shown over the camera preview. */
export function CameraTipsPanel({ onClose }: { onClose: () => void }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(durations.base).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutDown.duration(durations.quick).reduceMotion(ReduceMotion.System)}
      accessibilityViewIsModal
      style={styles.panel}>
      <Text variant="eyebrow" color={palette.sky}>
        For an accurate reading
      </Text>
      {CAMERA_TIPS.map(({ icon: Icon, text }) => (
        <View key={text} style={styles.row}>
          <Icon size={18} color={palette.cream} strokeWidth={1.8} />
          <Text variant="bodyS" color={palette.cream} style={styles.flex}>
            {text}
          </Text>
        </View>
      ))}
      <Text variant="caption" color="rgba(247,243,236,0.7)">
        Lighting and camera processing change how colour is recorded. If your photo is too dark, bright, blurred or tinted, we’ll tell you instead of guessing.
      </Text>
      <TextButton label="Got it" onPress={onClose} color={palette.coral} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: 170,
    backgroundColor: 'rgba(13, 22, 38, 0.94)',
    borderRadius: radii.lg,
    padding: spacing[5],
    gap: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(247,243,236,0.16)',
  },
  row: { flexDirection: 'row', gap: spacing[3], alignItems: 'center' },
  flex: { flex: 1 },
});
