import type { AnalysisAdjustments, ColorAnalysisResult } from '@/types/domain';

import { buildPalette } from './paletteEngine';

/**
 * Applies the user's feedback ("feels too cool") by re-running the deterministic palette engine
 * on the *original* estimate plus adjustments. The estimate itself is never overwritten, so the
 * user can always return to "as estimated".
 */
export function adjustResult(result: ColorAnalysisResult, adjustments: AnalysisAdjustments): ColorAnalysisResult {
  const palette = buildPalette(result.characteristics, adjustments);
  return {
    ...result,
    headline: palette.headline,
    styleStatement: palette.styleStatement,
    recommendedColors: palette.recommendedColors,
    neutralColors: palette.neutralColors,
    experimentalColors: palette.experimentalColors,
    combinations: palette.combinations,
    adjustments,
  };
}

export function isAdjusted(adjustments: AnalysisAdjustments) {
  return adjustments.warmth !== 0 || adjustments.depth !== 0;
}
