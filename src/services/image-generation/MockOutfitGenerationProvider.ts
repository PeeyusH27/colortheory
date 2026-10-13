import { createId } from '@/utils/id';
import { sleep } from '@/utils/async';

import type { GenerationJob, GenerationJobState, OutfitGenerationInput, OutfitGenerationProvider } from './types';

/**
 * Demo generation provider. It walks through the same queued → processing → completed states as a
 * real provider so the UI flow can be built and tested, but it produces NO image: the result is
 * flagged `isDemo` and the UI shows a labelled colour drape instead of a fake "AI" picture.
 */
export class MockOutfitGenerationProvider implements OutfitGenerationProvider {
  readonly id = 'mock';
  readonly label = 'Demo preview';
  readonly isDemo = true;
  private readonly polls = new Map<string, number>();

  constructor(private readonly latencyMs = 500) {}

  async start(_input: OutfitGenerationInput, options: { signal?: AbortSignal } = {}): Promise<GenerationJob> {
    await sleep(this.latencyMs, options.signal);
    const previewId = createId();
    this.polls.set(previewId, 0);
    return { previewId, jobId: `demo-${previewId}` };
  }

  async poll(job: GenerationJob, options: { signal?: AbortSignal } = {}): Promise<GenerationJobState> {
    await sleep(this.latencyMs, options.signal);
    const count = (this.polls.get(job.previewId) ?? 0) + 1;
    this.polls.set(job.previewId, count);
    if (count < 2) return { status: 'queued', previewId: job.previewId };
    if (count < 4) return { status: 'processing', previewId: job.previewId };
    this.polls.delete(job.previewId);
    return { status: 'completed', previewId: job.previewId, imageUri: null, imagePath: null, provider: this.id, isDemo: true };
  }
}
