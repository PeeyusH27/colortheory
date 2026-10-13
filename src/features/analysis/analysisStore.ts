import { create } from 'zustand';

import type { AnalysisMethod, AnalysisStage } from '@/services/color-analysis';
import type { ImageQualityReport } from '@/types/domain';
import type { AppError } from '@/utils/errors';

/**
 * Transient workflow state for one analysis run (not persisted). Results are persisted through the
 * repository; this store only drives the progress UI.
 */
export interface AnalysisRequest {
  method: AnalysisMethod;
  /** Upload the portrait to private cloud storage (needed for cloud analysis / AI previews). */
  upload: boolean;
  /** Keep the uploaded portrait after the analysis (otherwise it is deleted right after). */
  keepInCloud: boolean;
  /** ISO timestamp of the explicit consent tap, required whenever `upload` is true. */
  consentedAt: string | null;
}

export type RunStatus = 'idle' | 'running' | 'quality_gate' | 'error' | 'done';

interface AnalysisRunState {
  request: AnalysisRequest | null;
  status: RunStatus;
  stages: AnalysisStage[];
  completed: AnalysisStage[];
  current: AnalysisStage | null;
  uploadProgress: number;
  error: AppError | null;
  quality: ImageQualityReport | null;
  analysisId: string | null;
  configure: (request: AnalysisRequest) => void;
  begin: (stages: AnalysisStage[]) => void;
  enterStage: (stage: AnalysisStage) => void;
  setUploadProgress: (fraction: number) => void;
  fail: (error: AppError) => void;
  qualityGate: (report: ImageQualityReport) => void;
  finish: (analysisId: string) => void;
  reset: () => void;
}

const initial = {
  status: 'idle' as RunStatus,
  stages: [] as AnalysisStage[],
  completed: [] as AnalysisStage[],
  current: null,
  uploadProgress: 0,
  error: null,
  quality: null,
  analysisId: null,
};

export const useAnalysisStore = create<AnalysisRunState>((set) => ({
  request: null,
  ...initial,
  configure: (request) => set({ request, ...initial }),
  begin: (stages) => set({ ...initial, status: 'running', stages }),
  enterStage: (stage) =>
    set((s) => {
      const completed = s.current && s.current !== stage && !s.completed.includes(s.current) ? [...s.completed, s.current] : s.completed;
      return { current: stage, completed };
    }),
  setUploadProgress: (fraction) => set({ uploadProgress: fraction }),
  fail: (error) => set({ status: 'error', error }),
  qualityGate: (report) => set({ status: 'quality_gate', quality: report }),
  finish: (analysisId) => set((s) => ({ status: 'done', analysisId, completed: s.stages, current: null })),
  reset: () => set({ request: null, ...initial }),
}));

/** Human copy for each stage. Demo runs prefix these with "Demo:" in the UI. */
export const STAGE_COPY: Record<AnalysisStage, { title: string; detail: string }> = {
  preparing: { title: 'Preparing portrait', detail: 'Resizing and stripping photo metadata on your device.' },
  uploading: { title: 'Uploading securely', detail: 'Sending to your private storage. Only you can access it.' },
  checking_quality: { title: 'Checking image quality', detail: 'Exposure, colour cast, sharpness and face area.' },
  estimating: { title: 'Estimating visible colour', detail: 'Undertone lean, depth, contrast and clarity.' },
  palettes: { title: 'Exploring complementary palettes', detail: 'Scoring 50 curated colours against your estimate.' },
  outfits: { title: 'Preparing outfit recommendations', detail: 'Pairing your colours with wardrobe templates.' },
};
