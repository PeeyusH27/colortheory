import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

import { toast } from '@/components/ui/Toast';

import { normalizePortrait } from './normalizePortrait';
import { usePortraitStore } from './portraitStore';

/**
 * Gallery upload. Requests photo-library access only when the user taps "Upload", explains a
 * denial with a route to Settings, and normalises the chosen image into the shared portrait store.
 * Returns true when a portrait was selected.
 */
export async function pickPortraitFromLibrary(): Promise<boolean> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted && !permission.canAskAgain) {
    Alert.alert('Photo access is off', 'To upload a portrait, allow ColorTheory to access your photos in Settings.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => void Linking.openSettings() },
    ]);
    return false;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
    exif: false,
    selectionLimit: 1,
  });
  if (result.canceled || !result.assets[0]) return false;

  const asset = result.assets[0];
  try {
    const normalized = await normalizePortrait({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      // The picker hands us a private cache copy; it is safe (and tidy) to delete after resizing.
      deleteOriginal: true,
    });
    usePortraitStore.getState().setPortrait({ ...normalized, source: 'library', capturedAt: new Date().toISOString() });
    return true;
  } catch {
    toast.error('We couldn’t open that image. Try a JPEG or PNG portrait.');
    return false;
  }
}
