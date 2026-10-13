import { config } from '@/constants/config';
import { sleep } from '@/utils/async';
import { AppError, toAppError } from '@/utils/errors';

import { MockOutfitGenerationProvider } from './MockOutfitGenerationProvider';
import { RemoteOutfitGenerationProvider } from './RemoteOutfitGenerationProvider';
import type { GenerationJobState, OutfitGenerationInput, OutfitGenerationProvider } from './types';

export * from './types';

const mock = new MockOutfitGenerationProvider();
const remote = new RemoteOutfitGenerationProvider();

/**
 * Picks the generation provider. Real AI previews require: the remote provider enabled in config,
 * a signed-in (non-demo) user and a portrait stored in the cloud with consent.
 */
export function getOutfitGenerationProvider(options: { signedIn: boolean; hasCloudPortrait: boolean }): OutfitGenerationProvider | null {
  if (config.generationProvider === 'off') return null;
  if (config.generationProvider === 'remote' && options.signedIn && options.hasCloudPortrait) return remote;
  return mock;
}

export interface GenerateOptions {
  signal?: AbortSignal;
  onStatus?: (state: GenerationJobState) => void;
  /** Overall budget including queue time. Try-on jobs usually finish in 5–20 s. */
  timeoutMs?: number;
  pollIntervalMs?: number;
}

/**
 * Starts a job and polls until it completes, fails, times out or is cancelled. Transient polling
 * errors are retried; a provider "failed" state is returned as-is (failed jobs aren't billed by
 * FASHN, and the UI offers "Try again").
 */
export async function generateOutfitPreview(
  provider: OutfitGenerationProvider,
  input: OutfitGenerationInput,
  { signal, onStatus, timeoutMs = 120_000, pollIntervalMs = 2_500 }: GenerateOptions = {},
): Promise<GenerationJobState> {
  const job = await provider.start(input, { signal });
  onStatus?.({ status: 'queued', previewId: job.previewId });
  const deadline = Date.now() + timeoutMs;
  let consecutiveErrors = 0;

  while (Date.now() < deadline) {
    await sleep(pollIntervalMs, signal);
    try {
      const state = await provider.poll(job, { signal });
      consecutiveErrors = 0;
      onStatus?.(state);
      if (state.status === 'completed' || state.status === 'failed') return state;
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === 'cancelled' || !appError.retryable || ++consecutiveErrors >= 3) throw appError;
    }
  }
  throw new AppError('timeout', 'The preview is taking longer than expected. Check back later.');
}
