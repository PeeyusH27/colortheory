import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Device-local portrait storage.
 *
 * - Camera captures and picker results start in the cache directory (the OS may purge it).
 * - When the user keeps a portrait "on this device", we copy the resized JPEG into the app's
 *   document directory under `portraits/`, which is private to the app and excluded from other
 *   apps. Nothing here is uploaded.
 */

const PORTRAIT_DIR_NAME = 'portraits';

function portraitDir() {
  const dir = new Directory(Paths.document, PORTRAIT_DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Deletes a file if it exists. Never throws — cleanup must not break user flows. */
export function deleteFileQuietly(uri: string | null | undefined) {
  if (!uri || Platform.OS === 'web' || !uri.startsWith('file:')) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already gone or not ours to delete.
  }
}

/** Copies a working image into permanent app storage for the given analysis. Returns the new URI. */
export function persistPortraitLocally(sourceUri: string, analysisId: string): string {
  if (Platform.OS === 'web') return sourceUri;
  const destination = new File(portraitDir(), `${analysisId}.jpg`);
  if (destination.exists) destination.delete();
  new File(sourceUri).copy(destination);
  return destination.uri;
}

export function isAppOwnedPortrait(uri: string | null | undefined) {
  return Boolean(uri && uri.includes(`/${PORTRAIT_DIR_NAME}/`));
}

/** Removes every locally stored portrait (Settings → Delete portraits / Delete account). */
export function deleteAllLocalPortraits() {
  if (Platform.OS === 'web') return;
  try {
    const dir = new Directory(Paths.document, PORTRAIT_DIR_NAME);
    if (dir.exists) dir.delete();
  } catch {
    // Ignore — directory may not exist.
  }
}

/**
 * Removes local portrait files that no analysis references anymore (e.g. after a crash between
 * saving the file and saving the record). Returns how many files were removed.
 */
export function cleanupOrphanedLocalPortraits(referencedUris: Set<string>): number {
  if (Platform.OS === 'web') return 0;
  let removed = 0;
  try {
    const dir = new Directory(Paths.document, PORTRAIT_DIR_NAME);
    if (!dir.exists) return 0;
    for (const entry of dir.list()) {
      if (entry instanceof File && !referencedUris.has(entry.uri)) {
        entry.delete();
        removed++;
      }
    }
  } catch {
    // Best effort.
  }
  return removed;
}
