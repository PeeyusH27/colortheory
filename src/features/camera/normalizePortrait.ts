import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { deleteFileQuietly } from '@/services/storage/localFiles';
import { AppError } from '@/utils/errors';

/** Long edge of the working portrait. Enough detail for analysis and try-on, small to upload. */
export const PORTRAIT_MAX_EDGE = 1280;

/**
 * Produces the single working copy of a portrait: resized, JPEG, re-encoded (which drops EXIF
 * metadata such as GPS location). The original capture is deleted once the copy exists, so we
 * never keep duplicate full-resolution images around.
 */
export async function normalizePortrait(input: { uri: string; width: number; height: number; deleteOriginal: boolean }) {
  try {
    const longEdge = Math.max(input.width, input.height);
    const context = ImageManipulator.manipulate(input.uri);
    if (longEdge > PORTRAIT_MAX_EDGE) {
      context.resize(input.width >= input.height ? { width: PORTRAIT_MAX_EDGE, height: null } : { width: null, height: PORTRAIT_MAX_EDGE });
    }
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.86 });
    context.release();
    rendered.release();
    if (input.deleteOriginal && saved.uri !== input.uri) deleteFileQuietly(input.uri);
    return { uri: saved.uri, width: saved.width, height: saved.height };
  } catch (error) {
    throw new AppError('invalid_image', 'We couldn’t read that image. Try a JPEG or PNG photo.', { cause: error });
  }
}
