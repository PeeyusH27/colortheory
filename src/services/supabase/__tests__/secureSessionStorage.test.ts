import * as SecureStore from 'expo-secure-store';

import { secureSessionStorage } from '../secureSessionStorage';

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;

beforeEach(() => store.clear());

describe('secureSessionStorage', () => {
  it('round-trips a small value', async () => {
    await secureSessionStorage.setItem('sb-auth', '{"a":1}');
    await expect(secureSessionStorage.getItem('sb-auth')).resolves.toBe('{"a":1}');
  });

  it('splits large sessions into SecureStore-sized chunks', async () => {
    const big = 'x'.repeat(5000);
    await secureSessionStorage.setItem('sb-auth', big);
    expect(store.get('sb-auth.n')).toBe('3');
    for (const [, value] of store) expect(value.length).toBeLessThanOrEqual(1800);
    await expect(secureSessionStorage.getItem('sb-auth')).resolves.toBe(big);
  });

  it('removes stale chunks when the value shrinks', async () => {
    await secureSessionStorage.setItem('sb-auth', 'y'.repeat(5000));
    await secureSessionStorage.setItem('sb-auth', 'short');
    expect(store.has('sb-auth.1')).toBe(false);
    expect(store.has('sb-auth.2')).toBe(false);
    await expect(secureSessionStorage.getItem('sb-auth')).resolves.toBe('short');
  });

  it('treats a partially written session as signed out', async () => {
    await secureSessionStorage.setItem('sb-auth', 'z'.repeat(4000));
    store.delete('sb-auth.1');
    await expect(secureSessionStorage.getItem('sb-auth')).resolves.toBeNull();
  });

  it('removes every chunk on sign-out', async () => {
    await secureSessionStorage.setItem('sb-auth', 'q'.repeat(4000));
    await secureSessionStorage.removeItem('sb-auth');
    expect(store.size).toBe(0);
    await expect(secureSessionStorage.getItem('sb-auth')).resolves.toBeNull();
  });
});
