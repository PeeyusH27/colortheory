import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import decodeJpeg from 'jpeg-js/lib/decoder';

import type { PixelImage } from '@/features/analysis/imageAnalysis';
import { deleteFileQuietly } from '@/services/storage/localFiles';
import { AppError } from '@/utils/errors';

/** Width of the analysis bitmap: large enough for blur/exposure checks, small enough to decode fast. */
export const SAMPLE_WIDTH = 256;

function base64ToBytes(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Downsamples the portrait natively (expo-image-manipulator) and decodes the small JPEG in JS to
 * get raw RGBA pixels. The thumbnail lives only in memory; the temporary file is not kept.
 */
export async function samplePixels(uri: string): Promise<PixelImage> {
  try {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: SAMPLE_WIDTH, height: null });
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.92, base64: true });
    context.release();
    rendered.release();
    // The thumbnail is only needed in memory; remove the temporary file straight away.
    deleteFileQuietly(saved.uri);
    if (!saved.base64) throw new Error('No pixel data returned');
    const decoded = decodeJpeg(base64ToBytes(saved.base64), { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 64 });
    return { width: decoded.width, height: decoded.height, data: decoded.data };
  } catch (error) {
    throw new AppError('invalid_image', 'We couldn’t read that image.', { cause: error, detail: String(error) });
  }
}
