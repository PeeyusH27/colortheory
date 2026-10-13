import { clear, createStore, del, get, keys, set, type UseStore } from 'idb-keyval';

/**
 * Browser-local portrait storage (IndexedDB, this origin only).
 *
 * When the user keeps a portrait "on this device", the resized, metadata-free JPEG is stored as a
 * Blob in IndexedDB and referenced from the analysis record as `local-portrait:{analysisId}`.
 * Nothing here is uploaded. Clearing the site's data in the browser also removes it.
 */

const PREFIX = 'local-portrait:';
let store: UseStore | null = null;

function portraitStore(): UseStore {
  store ??= createStore('colortheory', 'portraits');
  return store;
}

/** Object URLs handed out for display, revoked when the portrait is deleted. */
const objectUrls = new Map<string, string>();

export const localPortraitRef = (analysisId: string) => `${PREFIX}${analysisId}`;

export function isLocalPortraitRef(uri: string | null | undefined): uri is string {
  return Boolean(uri?.startsWith(PREFIX));
}

/** Saves a working portrait for an analysis. Returns the reference stored on the record. */
export async function saveLocalPortrait(analysisId: string, blob: Blob): Promise<string> {
  const ref = localPortraitRef(analysisId);
  await set(ref, blob, portraitStore());
  return ref;
}

export async function readLocalPortrait(ref: string): Promise<Blob | null> {
  if (!isLocalPortraitRef(ref)) return null;
  const value = await get<Blob>(ref, portraitStore());
  return value instanceof Blob ? value : null;
}

/** Display URL for a stored portrait (cached per reference until deleted). */
export async function localPortraitUrl(ref: string): Promise<string | null> {
  const cached = objectUrls.get(ref);
  if (cached) return cached;
  const blob = await readLocalPortrait(ref);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  objectUrls.set(ref, url);
  return url;
}

function revoke(ref: string) {
  const url = objectUrls.get(ref);
  if (url) URL.revokeObjectURL(url);
  objectUrls.delete(ref);
}

/** Deletes a stored portrait. Never throws — cleanup must not break user flows. */
export async function deleteLocalPortrait(ref: string | null | undefined): Promise<void> {
  if (!isLocalPortraitRef(ref)) return;
  revoke(ref);
  try {
    await del(ref, portraitStore());
  } catch {
    // Already gone or storage unavailable.
  }
}

/** Removes every locally stored portrait (Settings → Delete portraits / Delete account). */
export async function deleteAllLocalPortraits(): Promise<void> {
  for (const ref of [...objectUrls.keys()]) revoke(ref);
  try {
    await clear(portraitStore());
  } catch {
    // Storage unavailable (private mode); nothing to remove.
  }
}

/**
 * Removes stored portraits that no analysis references anymore (e.g. the tab closed between
 * saving the image and saving the record). Returns how many were removed.
 */
export async function cleanupOrphanedLocalPortraits(referenced: Set<string>): Promise<number> {
  let removed = 0;
  try {
    for (const key of await keys<string>(portraitStore())) {
      if (typeof key === 'string' && !referenced.has(key)) {
        await deleteLocalPortrait(key);
        removed++;
      }
    }
  } catch {
    // Best effort.
  }
  return removed;
}
