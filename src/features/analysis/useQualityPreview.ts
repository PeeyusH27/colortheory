import { useQuery } from '@tanstack/react-query';

import { samplePixels } from '@/services/color-analysis/pixelSampler';

import { analyzePixels } from './imageAnalysis';

/**
 * Runs the on-device quality check as soon as a portrait is confirmed, so the user sees lighting
 * problems *before* deciding to analyse or upload. Pure local computation — nothing leaves the
 * device.
 */
export function useQualityPreview(portrait: { uri: string; width: number; height: number } | null) {
  return useQuery({
    queryKey: ['quality-preview', portrait?.uri ?? 'none'],
    queryFn: async () => {
      const pixels = await samplePixels(portrait!.uri);
      return analyzePixels(pixels, { width: portrait!.width, height: portrait!.height }).quality;
    },
    enabled: Boolean(portrait),
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: false,
    networkMode: 'always',
  });
}
