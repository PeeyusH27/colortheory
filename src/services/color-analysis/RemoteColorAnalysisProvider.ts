import { analyzePixels, type PixelImage } from '@/features/analysis/imageAnalysis';
import { buildPalette, characteristicsFrom, NO_ADJUSTMENTS } from '@/features/analysis/paletteEngine';
import { invokeFunction } from '@/services/supabase/functions';
import type { ColorAnalysisResult } from '@/types/domain';
import { throwIfAborted } from '@/utils/async';
import { AppError } from '@/utils/errors';

import { QualityGateError } from './QualityGateError';
import { samplePixels } from './pixelSampler';
import { remoteAnalysisResponseSchema } from './remoteSchema';
import type { AnalyzeOptions, ColorAnalysisInput, ColorAnalysisProvider } from './types';

/**
 * Cloud analysis via the `analyze-portrait` Edge Function. The function holds the model API key,
 * verifies the caller's JWT, reads the portrait from private storage with a short-lived signed URL
 * and returns characteristics only. The app never talks to the model provider directly.
 *
 * Quality is still checked on the device first so we don't upload (or pay for) unusable photos.
 */
export class RemoteColorAnalysisProvider implements ColorAnalysisProvider {
  readonly id = 'remote' as const;
  readonly label = 'Cloud analysis';
  readonly isDemo = false;
  readonly requiresUpload = true;

  constructor(
    private readonly sampler: (uri: string) => Promise<PixelImage> = samplePixels,
    private readonly timeoutMs = 60_000,
  ) {}

  async analyze(input: ColorAnalysisInput, options: AnalyzeOptions = {}): Promise<ColorAnalysisResult> {
    const { signal, onProgress, acceptLowQuality } = options;
    if (!input.storagePath) {
      throw new AppError('upload_failed', 'The portrait must be uploaded before cloud analysis.');
    }

    onProgress?.({ stage: 'checking_quality' });
    const local = analyzePixels(await this.sampler(input.imageUri), { width: input.width, height: input.height });
    if (local.quality.issues.some((i) => i.severity === 'blocking') && !acceptLowQuality) {
      throw new QualityGateError(local.quality);
    }
    throwIfAborted(signal);

    onProgress?.({ stage: 'estimating' });
    const response = await invokeFunction(
      'analyze-portrait',
      { analysisId: input.analysisId, storagePath: input.storagePath },
      remoteAnalysisResponseSchema,
      { signal, timeoutMs: this.timeoutMs },
    );
    if (!response.usable) {
      throw new QualityGateError({
        ...local.quality,
        issues: [
          ...local.quality.issues,
          ...response.qualityConcerns.map((message) => ({ code: 'face_region_unclear' as const, severity: 'blocking' as const, message })),
        ],
      });
    }

    onProgress?.({ stage: 'palettes' });
    const characteristics = characteristicsFrom({ ...response.characteristics, sampledHex: local.face?.hex ?? null });
    const adjustments = input.adjustments ?? NO_ADJUSTMENTS;
    const palette = buildPalette(characteristics, adjustments);
    const warnings = [
      ...local.quality.issues.filter((i) => i.severity !== 'info').map((i) => i.message),
      ...response.qualityConcerns,
    ];

    return {
      schemaVersion: 1,
      provider: 'remote',
      isDemo: false,
      title: palette.title,
      headline: palette.headline,
      explanation: [
        ...response.observations,
        'This is an AI-assisted estimate from one photo. Lighting and camera processing affect colour, so adjust the palette if it doesn’t feel right.',
      ].join(' '),
      styleStatement: palette.styleStatement,
      characteristics,
      // Never report more certainty than the photo quality supports.
      confidence: response.confidence === null ? null : Math.min(response.confidence, 0.4 + 0.5 * local.quality.score),
      quality: local.quality,
      qualityWarnings: [...new Set(warnings)],
      recommendedColors: palette.recommendedColors,
      neutralColors: palette.neutralColors,
      experimentalColors: palette.experimentalColors,
      combinations: palette.combinations,
      adjustments,
      createdAt: new Date().toISOString(),
    };
  }
}
