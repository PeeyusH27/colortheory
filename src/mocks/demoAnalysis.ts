import { buildPalette, characteristicsFrom, NO_ADJUSTMENTS } from '@/features/analysis/paletteEngine';
import type { AnalysisAdjustments, ColorAnalysisResult } from '@/types/domain';

/**
 * Deterministic demo analysis — a deep, cool profile that reproduces the "Shades of Blue" story
 * from the reference style guide. It is ALWAYS flagged `isDemo: true` and labelled in the UI as
 * sample data; it is never presented as an analysis of the user's photo.
 */
export const DEMO_CHARACTERISTICS = characteristicsFrom({
  lean: -0.55,
  depth: 0.72,
  contrast: 0.7,
  chroma: 0.5,
  sampledHex: null,
});

export function createDemoAnalysisResult(options: { adjustments?: AnalysisAdjustments; createdAt?: string } = {}): ColorAnalysisResult {
  const adjustments = options.adjustments ?? NO_ADJUSTMENTS;
  const palette = buildPalette(DEMO_CHARACTERISTICS, adjustments);
  return {
    schemaVersion: 1,
    provider: 'mock',
    isDemo: true,
    title: palette.title,
    headline: palette.headline,
    explanation:
      'This is a sample colour story so you can explore the app. It is not based on your photo. Run an on-device or cloud analysis to see your own estimate.',
    styleStatement: palette.styleStatement,
    characteristics: DEMO_CHARACTERISTICS,
    confidence: null,
    quality: null,
    qualityWarnings: ['Demo data — no photo was analysed.'],
    recommendedColors: palette.recommendedColors,
    neutralColors: palette.neutralColors,
    experimentalColors: palette.experimentalColors,
    combinations: palette.combinations,
    adjustments,
    createdAt: options.createdAt ?? new Date().toISOString(),
  };
}

/** Used for "Editor's picks" when the user has no analysis yet. Clearly labelled as not personal. */
export const EDITORS_PALETTE = createDemoAnalysisResult({ createdAt: '2026-01-01T00:00:00.000Z' });
