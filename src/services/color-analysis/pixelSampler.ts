import type { PixelImage } from '@/features/analysis/imageAnalysis';
import { AppError } from '@/utils/errors';

/** Width of the analysis bitmap: large enough for blur/exposure checks, small enough to scan fast. */
export const SAMPLE_WIDTH = 256;

/** A portrait to sample: an in-memory Blob, or a same-origin `blob:` URL pointing at one. */
export type PixelSource = Blob | string;

async function toBlob(source: PixelSource): Promise<Blob> {
  if (typeof source !== 'string') return source;
  const response = await fetch(source);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.blob();
}

/**
 * Downsamples the portrait on a canvas and reads its RGBA pixels. Runs entirely in the browser;
 * the thumbnail exists only in memory.
 */
export async function samplePixels(source: PixelSource): Promise<PixelImage> {
  try {
    const bitmap = await createImageBitmap(await toBlob(source));
    const width = Math.min(SAMPLE_WIDTH, bitmap.width);
    const height = Math.max(1, Math.round((bitmap.height * width) / bitmap.width));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
    if (!context) throw new Error('Canvas 2D is unavailable');
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const { data } = context.getImageData(0, 0, width, height, { colorSpace: 'srgb' });
    return { width, height, data };
  } catch (error) {
    throw new AppError('invalid_image', 'We couldn’t read that image.', { cause: error, detail: String(error) });
  }
}
