import { ImagePlus, SwitchCamera } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

interface CameraControlsProps {
  onCapture: () => void;
  onPickFromLibrary: () => void;
  onFlip?: () => void;
  capturing: boolean;
  disabled?: boolean;
  bottomInset: number;
}

/** Shutter + gallery + flip. The shutter is the largest target and scales on press. */
export function CameraControls({ onCapture, onPickFromLibrary, onFlip, capturing, disabled, bottomInset }: CameraControlsProps) {
  return (
    <View style={[styles.bar, { paddingBottom: bottomInset + spacing[5] }]}>
      <View style={styles.side}>
        <IconButton icon={ImagePlus} accessibilityLabel="Choose a portrait from your photos" onPress={onPickFromLibrary} variant="glass" size={52} iconSize={22} />
        <Text variant="caption" color={palette.cream} style={styles.caption}>
          Upload
        </Text>
      </View>
      <PressableScale
        onPress={onCapture}
        disabled={disabled || capturing}
        pressedScale={0.88}
        haptic="none"
        accessibilityRole="button"
        accessibilityLabel="Take portrait"
        accessibilityHint="Captures a photo. Nothing is uploaded."
        accessibilityState={{ disabled: disabled || capturing, busy: capturing }}
        style={[styles.shutterRing, (disabled || capturing) && styles.dim]}>
        <View style={styles.shutter}>{capturing ? <ActivityIndicator color={palette.ink} /> : null}</View>
      </PressableScale>
      <View style={styles.side}>
        {onFlip ? (
          <>
            <IconButton icon={SwitchCamera} accessibilityLabel="Switch between front and back camera" onPress={onFlip} variant="glass" size={52} iconSize={22} />
            <Text variant="caption" color={palette.cream} style={styles.caption}>
              Flip
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing[5],
  },
  side: { width: 72, alignItems: 'center', gap: spacing[1] },
  caption: { fontSize: 11 },
  shutterRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: palette.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: { width: 66, height: 66, borderRadius: 33, backgroundColor: palette.coral, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.5 },
});
