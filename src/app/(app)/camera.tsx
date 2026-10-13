import { CameraView } from 'expo-camera';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Camera, CameraOff, Lightbulb, X } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraControls } from '@/components/camera/CameraControls';
import { CameraTipsPanel } from '@/components/camera/CameraTipsPanel';
import { FaceGuideOverlay } from '@/components/camera/FaceGuideOverlay';
import { IconButton } from '@/components/ui/IconButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { pickPortraitFromLibrary } from '@/features/camera/pickPortrait';
import { useCameraCapture } from '@/features/camera/useCameraCapture';
import { palette } from '@/theme/colors';
import { durations } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { layout, spacing } from '@/theme/spacing';
import { friendlyError } from '@/utils/errors';

function PermissionPanel({
  icon: Icon,
  title,
  body,
  primary,
  secondary,
}: {
  icon: typeof Camera;
  title: string;
  body: string;
  primary?: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.permission}>
      <View style={styles.permissionIcon}>
        <Icon size={30} color={palette.cream} strokeWidth={1.6} />
      </View>
      <Text variant="h1" tone="inverse" align="center" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="bodyM" tone="inverseSecondary" align="center">
        {body}
      </Text>
      <View style={styles.permissionActions}>
        {primary ? <PrimaryButton label={primary.label} onPress={primary.onPress} tone="coral" fullWidth /> : null}
        {secondary ? <SecondaryButton label={secondary.label} onPress={secondary.onPress} tone="cream" fullWidth /> : null}
      </View>
    </View>
  );
}

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { status, cameraRef, facing, capturing, flip, capture: captureImage, requestPermission, onCameraReady, onMountError } = useCameraCapture();
  const [showTips, setShowTips] = useState(false);
  const flash = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));

  const close = () => (router.canGoBack() ? router.back() : router.replace('/discover'));

  const upload = async () => {
    if (await pickPortraitFromLibrary()) router.push('/portrait-confirmation');
  };

  const capture = async () => {
    flash.set(withSequence(withTiming(0.85, { duration: 60 }), withTiming(0, { duration: durations.slow })));
    try {
      if (await captureImage()) router.push('/portrait-confirmation');
    } catch (error) {
      toast.error(friendlyError(error).body);
    }
  };

  const topBar = (
    <View style={[styles.topBar, { paddingTop: insets.top + spacing[2] }]}>
      <IconButton icon={X} accessibilityLabel="Close camera" onPress={close} variant="glass" />
      {status === 'ready' || status === 'starting' ? (
        <IconButton
          icon={Lightbulb}
          accessibilityLabel={showTips ? 'Hide photo tips' : 'Show photo tips'}
          onPress={() => setShowTips((s) => !s)}
          variant={showTips ? 'inverse' : 'glass'}
          selected={showTips}
        />
      ) : null}
    </View>
  );

  if (status === 'checking') {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <LoadingState fullScreen inverse label="Checking camera access" />
      </View>
    );
  }

  if (status === 'needs-permission' || status === 'denied' || status === 'unavailable') {
    const denied = status === 'denied';
    const unavailable = status === 'unavailable';
    return (
      <View style={[styles.root, styles.centerPad]}>
        <StatusBar style="light" />
        {topBar}
        <PermissionPanel
          icon={unavailable || denied ? CameraOff : Camera}
          title={unavailable ? 'Camera unavailable' : denied ? 'Camera access is off' : 'Take your portrait'}
          body={
            unavailable
              ? 'We couldn’t start the camera on this device (simulators have none). You can still upload a portrait from your photos.'
              : denied
                ? 'ColorTheory needs the camera to take your portrait. Turn it on in Settings, or upload an existing photo instead.'
                : 'We use the camera only while this screen is open. Photos stay on your phone unless you choose cloud analysis.'
          }
          primary={
            unavailable
              ? { label: 'Upload from photos', onPress: () => void upload() }
              : denied
                ? { label: 'Open Settings', onPress: () => void Linking.openSettings() }
                : { label: 'Allow camera', onPress: () => void requestPermission() }
          }
          secondary={unavailable ? { label: 'Close', onPress: close } : { label: 'Upload from photos instead', onPress: () => void upload() }}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Animated.View entering={FadeIn.duration(durations.slow).reduceMotion(ReduceMotion.System)} style={StyleSheet.absoluteFill}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mirror={facing === 'front'}
          mode="picture"
          animateShutter={false}
          onCameraReady={onCameraReady}
          onMountError={(e) => onMountError(e.message)}
        />
      </Animated.View>
      <FaceGuideOverlay active={status === 'ready'} />

      {topBar}

      <View pointerEvents="none" style={[styles.instruction, { top: insets.top + 72 }]}>
        <View style={styles.instructionPill} accessibilityLiveRegion="polite">
          <Text variant="label" color={palette.cream} align="center">
            {status === 'ready' ? 'Face the light and look toward the camera' : 'Starting camera…'}
          </Text>
        </View>
        <Text variant="caption" color="rgba(247,243,236,0.8)" align="center">
          Fill the oval with your face · no filters
        </Text>
      </View>

      {showTips ? <CameraTipsPanel onClose={() => setShowTips(false)} /> : null}

      <CameraControls
        onCapture={() => void capture()}
        onPickFromLibrary={() => void upload()}
        onFlip={flip}
        capturing={capturing}
        disabled={status !== 'ready'}
        bottomInset={insets.bottom}
      />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, flashStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.black },
  centerPad: { justifyContent: 'center', paddingHorizontal: layout.screenPaddingX },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingX,
    zIndex: 2,
  },
  instruction: { position: 'absolute', left: layout.screenPaddingX, right: layout.screenPaddingX, alignItems: 'center', gap: spacing[2] },
  instructionPill: {
    backgroundColor: 'rgba(13, 22, 38, 0.72)',
    borderRadius: radii.pill,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  flash: { backgroundColor: palette.white },
  permission: { alignItems: 'center', gap: spacing[4] },
  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(247,243,236,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  permissionActions: { alignSelf: 'stretch', gap: spacing[3], marginTop: spacing[4] },
});
