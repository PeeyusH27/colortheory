import { usePreferencesStore } from '@/store/preferencesStore';
import { AppError } from '@/utils/errors';

const AVATAR_SIZE = 320;

/**
 * Profile picture: a file the user picks, centre-cropped square, resized to 320 px and kept as a
 * small JPEG data URL in this browser's preferences. It is never uploaded.
 */
export async function setAvatarFromFile(file: Blob): Promise<void> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (error) {
    throw new AppError('invalid_image', 'We couldn’t read that image. Try a JPEG or PNG photo.', { cause: error });
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new AppError('invalid_image', 'Your browser couldn’t process the image.');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close();
  usePreferencesStore.getState().setAvatarUri(canvas.toDataURL('image/jpeg', 0.85));
}

export function removeAvatar() {
  usePreferencesStore.getState().setAvatarUri(null);
}
