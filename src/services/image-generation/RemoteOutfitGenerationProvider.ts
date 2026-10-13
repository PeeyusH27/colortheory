import { z } from 'zod';

import { invokeFunction } from '@/services/supabase/functions';
import { AppError } from '@/utils/errors';

import type { GenerationJob, GenerationJobState, OutfitGenerationInput, OutfitGenerationProvider } from './types';

const startSchema = z.object({
  previewId: z.uuid(),
  jobId: z.string().min(1),
  status: z.enum(['queued', 'processing']),
});

export const generationStatusSchema = z.discriminatedUnion('status', [
  z.object({ status: z.enum(['queued', 'processing']), previewId: z.uuid() }),
  z.object({
    status: z.literal('completed'),
    previewId: z.uuid(),
    imagePath: z.string().min(1),
    signedUrl: z.url(),
    provider: z.string(),
  }),
  z.object({
    status: z.literal('failed'),
    previewId: z.uuid(),
    errorCode: z.string(),
    message: z.string().optional(),
  }),
]);

/**
 * Talks to the `generate-outfit` Edge Function, which holds the try-on provider key, enforces the
 * per-user daily quota, signs the portrait URL for the provider and copies the output into the
 * private `outfit-previews` bucket (provider CDN links expire and are not under our control).
 */
export class RemoteOutfitGenerationProvider implements OutfitGenerationProvider {
  readonly id = 'remote';
  readonly label = 'AI try-on preview';
  readonly isDemo = false;

  async start(input: OutfitGenerationInput, options: { signal?: AbortSignal } = {}): Promise<GenerationJob> {
    if (!input.portraitPath) {
      throw new AppError('upload_failed', 'AI previews need a portrait stored in your private cloud storage.');
    }
    const res = await invokeFunction(
      'generate-outfit',
      {
        action: 'start',
        analysisId: input.analysisId,
        outfitId: input.outfitId,
        outfitName: input.outfitName,
        garmentColor: input.garmentColor,
        garmentColorName: input.garmentColorName,
        garmentCategory: input.garmentCategory,
        garmentDescription: input.garmentDescription,
      },
      startSchema,
      { signal: options.signal, timeoutMs: 30_000 },
    );
    return { previewId: res.previewId, jobId: res.jobId };
  }

  async poll(job: GenerationJob, options: { signal?: AbortSignal } = {}): Promise<GenerationJobState> {
    const res = await invokeFunction('generate-outfit', { action: 'status', previewId: job.previewId }, generationStatusSchema, {
      signal: options.signal,
      timeoutMs: 30_000,
    });
    switch (res.status) {
      case 'completed':
        return { status: 'completed', previewId: res.previewId, imageUri: res.signedUrl, imagePath: res.imagePath, provider: res.provider, isDemo: false };
      case 'failed':
        return {
          status: 'failed',
          previewId: res.previewId,
          error: new AppError(res.errorCode === 'quota_exceeded' ? 'quota_exceeded' : 'generation_failed', res.message ?? 'Generation failed.'),
        };
      default:
        return { status: res.status, previewId: res.previewId };
    }
  }
}
