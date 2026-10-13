import { useCameraPermissions, type CameraType, type CameraView } from 'expo-camera';
import { useRef, useState } from 'react';

import { haptics } from '@/lib/haptics';
import { AppError, toAppError } from '@/utils/errors';

import { normalizePortrait } from './normalizePortrait';
import { usePortraitStore } from './portraitStore';

export type CameraStatus = 'checking' | 'needs-permission' | 'denied' | 'unavailable' | 'starting' | 'ready';

/**
 * Camera state machine for the capture screen. UI components stay dumb; this hook owns the
 * permission flow, readiness, capture and hand-off to the portrait store.
 *
 * Nothing is captured until the shutter is pressed, and permission is only requested when the
 * user taps "Allow camera" on this screen (not at app launch).
 */
export function useCameraCapture() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('front');
  const [ready, setReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const setPortrait = usePortraitStore((s) => s.setPortrait);

  let status: CameraStatus;
  if (!permission) status = 'checking';
  else if (!permission.granted) status = permission.canAskAgain ? 'needs-permission' : 'denied';
  else if (mountError) status = 'unavailable';
  else status = ready ? 'ready' : 'starting';

  const flip = () => {
    haptics.selection();
    setReady(false);
    setFacing((f) => (f === 'front' ? 'back' : 'front'));
  };

  /** Returns true when a portrait was captured and stored. Throws AppError on failure. */
  const capture = async (): Promise<boolean> => {
    if (!cameraRef.current || !ready || capturing) return false;
    setCapturing(true);
    haptics.medium();
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.92, exif: false });
      if (!photo?.uri) throw new AppError('invalid_image', 'The camera didn’t return a photo.');
      const normalized = await normalizePortrait({ uri: photo.uri, width: photo.width, height: photo.height, deleteOriginal: true });
      setPortrait({ ...normalized, source: 'camera', facing: facing === 'front' ? 'front' : 'back', capturedAt: new Date().toISOString() });
      return true;
    } catch (error) {
      throw toAppError(error, 'invalid_image');
    } finally {
      setCapturing(false);
    }
  };

  return {
    status,
    cameraRef,
    facing,
    capturing,
    flip,
    capture,
    requestPermission,
    onCameraReady: () => setReady(true),
    onMountError: (message: string) => setMountError(message),
  };
}
