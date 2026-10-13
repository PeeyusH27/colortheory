import { AppError } from '@/utils/errors';

/** Long edge of the working portrait. Enough detail for analysis and try-on, small to upload. */
export const PORTRAIT_MAX_EDGE = 1280;
/** Larger files are almost certainly not a phone photo (or would stall the tab while decoding). */
export const MAX_INPUT_BYTES = 40 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

export interface NormalizedPortrait {
  blob: Blob;
  width: number;
  height: number;
}

function fitWithin(width: number, height: number, maxEdge = PORTRAIT_MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Produces the single working copy of a portrait: resized and re-encoded as JPEG on a canvas.
 * Re-encoding drops every piece of photo metadata (EXIF, GPS location, camera serials).
 */
interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function encode(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, crop?: Crop): Promise<NormalizedPortrait> {
  const region = crop ?? { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  const { width, height } = fitWithin(region.width, region.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new AppError('invalid_image', 'Your browser couldn’t process the image.');
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, region.x, region.y, region.width, region.height, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new AppError('invalid_image', 'Your browser couldn’t process the image.');
  return { blob, width, height };
}

/** Normalises a file chosen with the file picker or dropped on the page. */
export async function normalizeImageFile(file: Blob): Promise<NormalizedPortrait> {
  if (file.type && !file.type.startsWith('image/')) {
    throw new AppError('invalid_image', 'That file isn’t an image. Choose a JPEG or PNG portrait.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new AppError('invalid_image', 'That image is too large. Choose a photo under 40 MB.');
  }
  let bitmap: ImageBitmap;
  try {
    // Applies the EXIF orientation before we discard the metadata.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (error) {
    const heic = /heic|heif/i.test(file.type);
    throw new AppError(
      'invalid_image',
      heic
        ? 'This browser can’t open HEIC photos. Export the photo as JPEG, or use Safari.'
        : 'We couldn’t read that image. Try a JPEG or PNG photo.',
      { cause: error },
    );
  }
  try {
    return await encode(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

/** Portrait framing used by the camera preview and capture (width / height). */
export const CAPTURE_ASPECT = 4 / 5;

/** Centre crop of a frame to the portrait aspect — the same region the preview shows. */
export function centerCrop(frameWidth: number, frameHeight: number, aspect = CAPTURE_ASPECT): Crop {
  if (frameWidth / frameHeight > aspect) {
    const width = Math.round(frameHeight * aspect);
    return { x: Math.round((frameWidth - width) / 2), y: 0, width, height: frameHeight };
  }
  const height = Math.round(frameWidth / aspect);
  return { x: 0, y: Math.round((frameHeight - height) / 2), width: frameWidth, height };
}

/**
 * Captures the current camera frame, cropped to the 4:5 portrait the preview shows (so "fill the
 * oval" lines up with the region the analysis samples). Front-camera previews are mirrored like a
 * mirror; the saved photo is not, so it matches how other people see you.
 */
export async function captureVideoFrame(video: HTMLVideoElement): Promise<NormalizedPortrait> {
  if (!video.videoWidth || !video.videoHeight) {
    throw new AppError('invalid_image', 'The camera isn’t ready yet. Try again in a moment.');
  }
  return encode(video, video.videoWidth, video.videoHeight, centerCrop(video.videoWidth, video.videoHeight));
}
