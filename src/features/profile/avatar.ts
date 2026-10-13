import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { deleteFileQuietly } from '@/services/storage/localFiles';
import { usePreferencesStore } from '@/store/preferencesStore';

/**
 * Profile picture: picked from the library, cropped square, resized to 320px and kept in the
 * app's private documents folder. It is never uploaded.
 */
export async function pickAvatar(): Promise<boolean> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
  if (result.canceled || !result.assets[0]) return false;

  const context = ImageManipulator.manipulate(result.assets[0].uri);
  context.resize({ width: 320, height: null });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
  context.release();
  rendered.release();
  deleteFileQuietly(result.assets[0].uri);

  if (Platform.OS === 'web') {
    usePreferencesStore.getState().setAvatarUri(saved.uri);
    return true;
  }
  // Unique name so expo-image doesn't serve a cached older avatar.
  const target = new File(Paths.document, `avatar-${Date.now()}.jpg`);
  new File(saved.uri).move(target);
  removeAvatar();
  usePreferencesStore.getState().setAvatarUri(target.uri);
  return true;
}

export function removeAvatar() {
  const current = usePreferencesStore.getState().avatarUri;
  deleteFileQuietly(current);
  usePreferencesStore.getState().setAvatarUri(null);
}
