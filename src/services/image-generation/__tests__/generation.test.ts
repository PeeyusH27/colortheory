import { AppError } from '@/utils/errors';

import { generateOutfitPreview } from '../index';
import { MockOutfitGenerationProvider } from '../MockOutfitGenerationProvider';
import { generationStatusSchema } from '../RemoteOutfitGenerationProvider';
import type { GenerationJobState, OutfitGenerationInput, OutfitGenerationProvider } from '../types';

const input: OutfitGenerationInput = {
  analysisId: 'a',
  outfitId: 'clean-shirt--navy',
  outfitName: 'Navy Blue Shirt + Stone Trousers',
  garmentColor: '#172A46',
  garmentColorName: 'Navy Blue',
  garmentCategory: 'tops',
  garmentDescription: 'long-sleeve button-down shirt',
  portraitUri: 'local-portrait:a1',
  portraitPath: null,
};

function scripted(states: (GenerationJobState['status'] | Error)[]): OutfitGenerationProvider {
  let i = 0;
  return {
    id: 'test',
    label: 'Test',
    isDemo: false,
    start: vi.fn(async () => ({ previewId: 'p1', jobId: 'j1' })),
    poll: vi.fn(async (): Promise<GenerationJobState> => {
      const next = states[Math.min(i++, states.length - 1)]!;
      if (next instanceof Error) throw next;
      if (next === 'completed') return { status: 'completed', previewId: 'p1', imageUri: 'https://signed', imagePath: 'u/a/p1.png', provider: 'test', isDemo: false };
      if (next === 'failed') return { status: 'failed', previewId: 'p1', error: new AppError('generation_failed', 'Nope') };
      return { status: next, previewId: 'p1' };
    }),
  };
}

describe('generateOutfitPreview', () => {
  it('walks queued → processing → completed and reports each status', async () => {
    const seen: string[] = [];
    const result = await generateOutfitPreview(scripted(['queued', 'processing', 'completed']), input, {
      pollIntervalMs: 1,
      onStatus: (s) => seen.push(s.status),
    });
    expect(result.status).toBe('completed');
    expect(seen).toEqual(['queued', 'queued', 'processing', 'completed']);
  });

  it('returns provider failures without throwing', async () => {
    const result = await generateOutfitPreview(scripted(['processing', 'failed']), input, { pollIntervalMs: 1 });
    expect(result.status).toBe('failed');
  });

  it('retries transient polling errors', async () => {
    const provider = scripted([new AppError('network', 'blip'), new AppError('network', 'blip'), 'completed']);
    const result = await generateOutfitPreview(provider, input, { pollIntervalMs: 1 });
    expect(result.status).toBe('completed');
    expect(provider.poll).toHaveBeenCalledTimes(3);
  });

  it('gives up after repeated or non-retryable errors', async () => {
    await expect(generateOutfitPreview(scripted([new AppError('network', 'down')]), input, { pollIntervalMs: 1 })).rejects.toMatchObject({ code: 'network' });
    await expect(generateOutfitPreview(scripted([new AppError('session_expired', 'expired')]), input, { pollIntervalMs: 1 })).rejects.toMatchObject({
      code: 'session_expired',
    });
  });

  it('times out jobs that never finish', async () => {
    await expect(generateOutfitPreview(scripted(['processing']), input, { pollIntervalMs: 5, timeoutMs: 30 })).rejects.toMatchObject({ code: 'timeout' });
  });

  it('can be cancelled', async () => {
    const controller = new AbortController();
    const promise = generateOutfitPreview(scripted(['processing']), input, { pollIntervalMs: 20, signal: controller.signal });
    setTimeout(() => controller.abort(), 5);
    await expect(promise).rejects.toMatchObject({ code: 'cancelled' });
  });
});

describe('MockOutfitGenerationProvider', () => {
  it('completes with a flagged demo result and no image', async () => {
    const result = await generateOutfitPreview(new MockOutfitGenerationProvider(0), input, { pollIntervalMs: 1 });
    expect(result).toMatchObject({ status: 'completed', isDemo: true, imageUri: null, imagePath: null });
  });
});

describe('generationStatusSchema (Edge Function contract)', () => {
  it('parses each status shape', () => {
    const id = '6f1c1f4e-8b0e-4c35-9e6d-9a1b2c3d4e5f';
    expect(generationStatusSchema.parse({ status: 'queued', previewId: id }).status).toBe('queued');
    expect(
      generationStatusSchema.parse({ status: 'completed', previewId: id, imagePath: 'u/a/p.png', signedUrl: 'https://x.supabase.co/s', provider: 'fashn' }).status,
    ).toBe('completed');
    expect(generationStatusSchema.parse({ status: 'failed', previewId: id, errorCode: 'moderated' }).status).toBe('failed');
  });

  it('rejects a completed status without a signed URL', () => {
    expect(generationStatusSchema.safeParse({ status: 'completed', previewId: '6f1c1f4e-8b0e-4c35-9e6d-9a1b2c3d4e5f', imagePath: 'x' }).success).toBe(false);
  });
});
