import type { AnalysisAdjustments, AnalysisProviderId, ColorAnalysisResult } from '@/types/domain';

/**
 * Provider-independent contract for colour analysis. Screens and the workflow only depend on this
 * interface, so swapping the on-device heuristic for a cloud model (or a different vendor) does
 * not touch UI code.
 */

/** Stages a provider can report. Only stages the provider actually performs are emitted. */
export type AnalysisStage = 'preparing' | 'uploading' | 'checking_quality' | 'estimating' | 'palettes' | 'outfits';

export interface ColorAnalysisInput {
  analysisId: string;
  /** Local file URI of the (already resized) portrait. */
  imageUri: string;
  width: number;
  height: number;
  /** Private storage path, when the portrait was uploaded with consent (remote provider only). */
  storagePath?: string | null;
  adjustments?: AnalysisAdjustments;
}

export interface AnalysisProgressEvent {
  stage: AnalysisStage;
  /** 0–1 within the stage, when measurable (e.g. upload bytes). */
  progress?: number;
}

export interface AnalyzeOptions {
  signal?: AbortSignal;
  onProgress?: (event: AnalysisProgressEvent) => void;
  /** The user saw the quality warnings and chose to continue anyway. */
  acceptLowQuality?: boolean;
}

export interface ColorAnalysisProvider {
  readonly id: AnalysisProviderId;
  /** Shown in the UI next to results. */
  readonly label: string;
  /** Demo providers produce sample output that is not derived from the photo. */
  readonly isDemo: boolean;
  /** Whether the portrait must be uploaded (requires explicit consent). */
  readonly requiresUpload: boolean;
  analyze(input: ColorAnalysisInput, options?: AnalyzeOptions): Promise<ColorAnalysisResult>;
}
