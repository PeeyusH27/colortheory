import { createDemoAnalysisResult } from '@/mocks/demoAnalysis';
import type { ColorAnalysisResult } from '@/types/domain';
import { sleep } from '@/utils/async';

import type { AnalyzeOptions, ColorAnalysisInput, ColorAnalysisProvider } from './types';

/**
 * Deterministic demo provider. It does not look at the photo — the UI labels every stage and the
 * result as "Demo". Useful for development, screenshots, tests and app-store review builds.
 */
export class MockColorAnalysisProvider implements ColorAnalysisProvider {
  readonly id = 'mock' as const;
  readonly label = 'Demo analysis';
  readonly isDemo = true;
  readonly requiresUpload = false;

  constructor(private readonly stepDelayMs = 650) {}

  async analyze(input: ColorAnalysisInput, options: AnalyzeOptions = {}): Promise<ColorAnalysisResult> {
    const { signal, onProgress } = options;
    for (const stage of ['checking_quality', 'estimating', 'palettes'] as const) {
      onProgress?.({ stage });
      await sleep(this.stepDelayMs, signal);
    }
    return createDemoAnalysisResult({ adjustments: input.adjustments });
  }
}
