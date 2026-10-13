import { AppError } from './errors';

/** Rejects with an AbortError-like AppError if the signal is (or becomes) aborted. */
export function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new AppError('cancelled', 'Cancelled');
}

/** Promise-based delay that resolves early-rejects on abort. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AppError('cancelled', 'Cancelled'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AppError('cancelled', 'Cancelled'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** Races a promise against a timeout. The underlying work should also observe an AbortSignal. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Request'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AppError('timeout', `${label} timed out after ${Math.round(ms / 1000)}s`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Ensures a UI stage is visible for at least `minMs` so progress never flashes past unread. */
export async function atLeast<T>(minMs: number, work: Promise<T>, signal?: AbortSignal): Promise<T> {
  const [result] = await Promise.all([work, sleep(minMs, signal)]);
  return result;
}

/** Retries retryable AppErrors with exponential backoff. */
export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  options: { retries?: number; baseDelayMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const { retries = 2, baseDelayMs = 600, signal } = options;
  let attempt = 0;
  for (;;) {
    try {
      return await fn(attempt);
    } catch (error) {
      const retryable = error instanceof AppError ? error.retryable : false;
      if (!retryable || attempt >= retries || signal?.aborted) throw error;
      await sleep(baseDelayMs * 2 ** attempt, signal);
      attempt += 1;
    }
  }
}
