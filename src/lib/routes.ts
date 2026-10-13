/** Typed helpers for dynamic routes, so links can't drift from the folder structure. */
export const routes = {
  results: (analysisId: string) => `/results/${analysisId}` as const,
  palette: (analysisId: string) => `/palette/${analysisId}` as const,
  gallery: (analysisId: string) => `/gallery/${analysisId}` as const,
  /** `analysisId` null → the editor's sample palette. */
  outfit: (analysisId: string | null, outfitId: string) => `/outfit/${analysisId ?? 'editorial'}/${encodeURIComponent(outfitId)}` as const,
};

export const EDITORIAL_ID = 'editorial';
