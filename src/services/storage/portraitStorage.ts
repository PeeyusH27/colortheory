import { File, UploadType } from 'expo-file-system';
import { Platform } from 'react-native';

import { config } from '@/constants/config';
import { getAccessToken, getSupabase } from '@/services/supabase/client';
import { AppError } from '@/utils/errors';

/**
 * Private Supabase Storage for portraits and generated previews.
 *
 * Path convention (enforced by storage RLS and a DB check constraint):
 *   portraits/       {userId}/{analysisId}/original.jpg
 *   outfit-previews/ {userId}/{analysisId}/{previewId}.png
 *
 * Both buckets are private. Images are displayed through short-lived signed URLs and are never
 * made public.
 */
export const BUCKETS = { portraits: 'portraits', previews: 'outfit-previews' } as const;
export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

export const portraitPath = (userId: string, analysisId: string) => `${userId}/${analysisId}/original.jpg`;

const SIGNED_URL_TTL_SECONDS = 10 * 60;

function encodePath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function uploadErrorFor(status: number, body: string): AppError {
  if (status === 401) return new AppError('session_expired', 'Your session expired. Sign in again to upload.');
  // Storage returns 400/403 with "new row violates row-level security policy" when a path or
  // owner doesn't match the policy — that's a bug or tampering, never a user mistake.
  if (status === 403 || /row-level security/i.test(body)) {
    return new AppError('unauthorized', 'Upload was rejected by storage permissions.', { detail: body });
  }
  if (status === 409) return new AppError('upload_failed', 'A portrait already exists for this analysis.', { detail: body });
  if (status === 413) return new AppError('invalid_image', 'This image is too large to upload.', { detail: body });
  return new AppError('upload_failed', 'Your portrait wasn’t uploaded.', { detail: `HTTP ${status}: ${body}` });
}

/**
 * Uploads a local JPEG with byte-level progress, authenticated as the current user (RLS applies).
 * Uses the native upload task on iOS/Android; falls back to supabase-js on web.
 */
export async function uploadPortrait(options: {
  userId: string;
  analysisId: string;
  fileUri: string;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const path = portraitPath(options.userId, options.analysisId);
  if (!config.supabase) throw new AppError('not_configured', 'Cloud storage is not configured.');

  if (Platform.OS === 'web') {
    const blob = await (await fetch(options.fileUri)).blob();
    const { error } = await getSupabase().storage.from(BUCKETS.portraits).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw new AppError('upload_failed', 'Your portrait wasn’t uploaded.', { cause: error });
    options.onProgress?.(1);
    return path;
  }

  const token = await getAccessToken();
  const file = new File(options.fileUri);
  const task = file.createUploadTask(`${config.supabase.url}/storage/v1/object/${BUCKETS.portraits}/${encodePath(path)}`, {
    httpMethod: 'POST',
    uploadType: UploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: config.supabase.key,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'false',
      'cache-control': 'max-age=3600',
    },
    // Foreground session: the JS promise and progress callbacks must stay attached to this screen.
    sessionType: 'foreground',
    signal: options.signal,
    onProgress: ({ bytesSent, totalBytes }) => {
      if (totalBytes > 0) options.onProgress?.(Math.min(1, bytesSent / totalBytes));
    },
  });

  try {
    const result = await task.uploadAsync();
    if (result.status < 200 || result.status >= 300) throw uploadErrorFor(result.status, result.body);
    options.onProgress?.(1);
    return path;
  } catch (error) {
    if (options.signal?.aborted) throw new AppError('cancelled', 'Upload cancelled.');
    if (error instanceof AppError) throw error;
    throw new AppError('upload_failed', 'Your portrait wasn’t uploaded.', { cause: error });
  } finally {
    task.release();
  }
}

export async function createSignedUrl(bucket: Bucket, path: string, expiresIn = SIGNED_URL_TTL_SECONDS): Promise<string> {
  const { data, error } = await getSupabase().storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) throw new AppError('not_found', 'Image unavailable.', { cause: error });
  return data.signedUrl;
}

export async function removeObjects(bucket: Bucket, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await getSupabase().storage.from(bucket).remove(paths);
  if (error) throw new AppError('network', 'We couldn’t delete the stored image. Try again.', { cause: error });
}

/** Lists every object stored for one analysis (portrait + previews) so deletes leave no orphans. */
export async function listAnalysisObjects(bucket: Bucket, userId: string, analysisId: string): Promise<string[]> {
  const prefix = `${userId}/${analysisId}`;
  const { data, error } = await getSupabase().storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw new AppError('network', 'We couldn’t read your stored images.', { cause: error });
  return (data ?? []).filter((o) => o.name && o.id).map((o) => `${prefix}/${o.name}`);
}

export async function deleteAnalysisObjects(userId: string, analysisId: string) {
  for (const bucket of [BUCKETS.portraits, BUCKETS.previews]) {
    await removeObjects(bucket, await listAnalysisObjects(bucket, userId, analysisId));
  }
}
