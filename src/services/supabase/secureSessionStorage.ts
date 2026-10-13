import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Storage adapter for the Supabase auth session.
 *
 * Sessions (access + refresh token) are stored in the iOS Keychain / Android Keystore-backed
 * SecureStore rather than AsyncStorage. Some platforms reject values larger than ~2 KB, and a
 * Supabase session is often bigger, so values are split into chunks under `${key}.0`, `${key}.1`…
 * with the chunk count stored at `${key}.n`.
 *
 * `AFTER_FIRST_UNLOCK` lets the token refresh in the background after the first unlock, while
 * keeping it encrypted at rest. On web there is no SecureStore; localStorage is used.
 */

const CHUNK_SIZE = 1800;
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

const countKey = (key: string) => `${key}.n`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;

async function readCount(key: string) {
  const raw = await SecureStore.getItemAsync(countKey(key), OPTIONS);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    const count = await readCount(key);
    if (count === 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i), OPTIONS);
      if (part === null) return null; // Partial write — treat as signed out rather than crash.
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    const previous = await readCount(key);
    const chunks = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    for (let i = 0; i < chunks; i++) {
      await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), OPTIONS);
    }
    await SecureStore.setItemAsync(countKey(key), String(chunks), OPTIONS);
    for (let i = chunks; i < previous; i++) {
      await SecureStore.deleteItemAsync(chunkKey(key, i), OPTIONS);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    const count = await readCount(key);
    for (let i = 0; i < count; i++) {
      await SecureStore.deleteItemAsync(chunkKey(key, i), OPTIONS);
    }
    await SecureStore.deleteItemAsync(countKey(key), OPTIONS);
  },
};
