import {
  analyzePixels,
  characteristicsFromSample,
  onDeviceConfidence,
  type PixelAnalysis,
  type PixelImage,
} from '@/features/analysis/imageAnalysis';
import { buildPalette, characteristicsFrom, NO_ADJUSTMENTS } from '@/features/analysis/paletteEngine';
import type { ColorAnalysisResult, VisibleCharacteristics } from '@/types/domain';
import { throwIfAborted } from '@/utils/async';

import { QualityGateError } from './QualityGateError';
import { samplePixels } from './pixelSampler';
import type { AnalyzeOptions, ColorAnalysisInput, ColorAnalysisProvider } from './types';

/** Neutral mid-point used only if the user overrides a blocking "no face found" warning. */
const NEUTRAL_FALLBACK = characteristicsFrom({ lean: 0, depth: 0.5, contrast: 0.5, chroma: 0.5 });

export function describeSample(c: VisibleCharacteristics, analysis: PixelAnalysis) {
  const parts = [
    `We sampled skin-toned pixels inside your face guide (average ${c.sampledHex ?? 'unavailable'}) and estimated a ${c.undertone.estimate.replace('-', ' ')} undertone lean, ${c.depth.estimate.replace('-', ' ')} depth and ${c.contrast.estimate} contrast with your hair and brows.`,
  ];
  if (analysis.cast && Math.abs(analysis.cast.b) > 6) {
    parts.push(`The light looked ${analysis.cast.b > 0 ? 'warm' : 'cool'}, so we corrected for it — but only partially.`);
  }
  parts.push(
    'This is an on-device estimate from a single photo. Lighting, camera processing and makeup all shift colour, so treat the palette as a starting point and adjust it if it doesn’t feel like you.',
  );
  return parts.join(' ');
}

/**
 * Real, private, offline analysis: decodes a small thumbnail of the portrait on the device,
 * checks quality and estimates visible characteristics. No image leaves the phone.
 */
export class OnDeviceColorAnalysisProvider implements ColorAnalysisProvider {
  readonly id = 'on-device' as const;
  readonly label = 'On-device estimate';
  readonly isDemo = false;
  readonly requiresUpload = false;

  constructor(private readonly sampler: (uri: string) => Promise<PixelImage> = samplePixels) {}

  async analyze(input: ColorAnalysisInput, options: AnalyzeOptions = {}): Promise<ColorAnalysisResult> {
    const { signal, onProgress, acceptLowQuality } = options;

    onProgress?.({ stage: 'checking_quality' });
    const pixels = await this.sampler(input.imageUri);
    throwIfAborted(signal);
    const analysis = analyzePixels(pixels, { width: input.width, height: input.height });
    const blocking = analysis.quality.issues.some((i) => i.severity === 'blocking');
    if (blocking && !acceptLowQuality) throw new QualityGateError(analysis.quality);

    onProgress?.({ stage: 'estimating' });
    const characteristics = analysis.face ? characteristicsFromSample(analysis.face, analysis.cast) : NEUTRAL_FALLBACK;
    throwIfAborted(signal);

    onProgress?.({ stage: 'palettes' });
    const adjustments = input.adjustments ?? NO_ADJUSTMENTS;
    const palette = buildPalette(characteristics, adjustments);
    const confidence = blocking ? 0.1 : onDeviceConfidence(analysis.quality, analysis.face);

    return {
      schemaVersion: 1,
      provider: 'on-device',
      isDemo: false,
      title: palette.title,
      headline: palette.headline,
      explanation: describeSample(characteristics, analysis),
      styleStatement: palette.styleStatement,
      characteristics,
      confidence,
      quality: analysis.quality,
      qualityWarnings: analysis.quality.issues.filter((i) => i.severity !== 'info').map((i) => i.message),
      recommendedColors: palette.recommendedColors,
      neutralColors: palette.neutralColors,
      experimentalColors: palette.experimentalColors,
      combinations: palette.combinations,
      adjustments,
      createdAt: new Date().toISOString(),
    };
  }
}
