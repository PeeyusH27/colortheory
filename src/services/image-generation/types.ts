import type { AppError } from '@/utils/errors';

/**
 * Provider-independent contract for personalised outfit previews (virtual try-on / image editing).
 *
 * Adapted from the brief's `portraitUrl`/`garmentReferenceUrl` contract: the app sends *storage
 * paths and IDs*, never URLs. The Edge Function signs short-lived URLs server-side for the provider,
 * so private portraits are never exposed through long-lived or client-built links.
 */
export interface OutfitGenerationInput {
  analysisId: string;
  outfitId: string;
  outfitName: string;
  /** Hex of the main garment. */
  garmentColor: string;
  garmentColorName: string;
  garmentCategory: 'tops' | 'bottoms' | 'one-pieces';
  garmentDescription: string;
  /** Local portrait (used by the demo provider for an on-device composite). */
  portraitUri: string | null;
  /** Private storage path of the uploaded portrait (required by the remote provider). */
  portraitPath: string | null;
}

export interface GenerationJob {
  previewId: string;
  jobId: string;
}

export type GenerationJobState =
  | { status: 'queued' | 'processing'; previewId: string }
  | {
      status: 'completed';
      previewId: string;
      /** Displayable URI: a short-lived signed URL (remote) or null for the demo composite. */
      imageUri: string | null;
      /** Private storage path of the generated image (remote only). */
      imagePath: string | null;
      provider: string;
      /** Demo results are rendered as a labelled colour drape, never as a real try-on. */
      isDemo: boolean;
    }
  | { status: 'failed'; previewId: string; error: AppError };

export interface OutfitGenerationProvider {
  readonly id: string;
  readonly label: string;
  readonly isDemo: boolean;
  start(input: OutfitGenerationInput, options?: { signal?: AbortSignal }): Promise<GenerationJob>;
  poll(job: GenerationJob, options?: { signal?: AbortSignal }): Promise<GenerationJobState>;
}
