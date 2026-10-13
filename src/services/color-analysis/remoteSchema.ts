import { z } from 'zod';

/**
 * Contract for the `analyze-portrait` Edge Function response.
 *
 * The server returns *characteristics and observations* only; the palette itself is built on the
 * client by the deterministic palette engine. That keeps recommendations consistent across
 * providers and means a model can never inject arbitrary colours or copy into the UI.
 */
const unit = z.number().min(0).max(1);
const signedUnit = z.number().min(-1).max(1);

export const remoteAnalysisResponseSchema = z.object({
  characteristics: z.object({
    lean: signedUnit,
    depth: unit,
    contrast: unit,
    chroma: unit,
  }),
  confidence: unit.nullable(),
  observations: z.array(z.string().max(300)).max(6).default([]),
  qualityConcerns: z.array(z.string().max(300)).max(6).default([]),
  /** The model refused or could not see a face clearly. */
  usable: z.boolean().default(true),
  model: z.string().max(100),
});

export type RemoteAnalysisResponse = z.infer<typeof remoteAnalysisResponseSchema>;
