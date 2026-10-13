import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useAuthStore } from '@/features/auth/authStore';
import { useRepository } from '@/features/data/queries';
import { generateOutfitPreview, getOutfitGenerationProvider, type GenerationJobState } from '@/services/image-generation';
import { uploadPortrait } from '@/services/storage/portraitStorage';
import type { AnalysisSession } from '@/types/domain';
import type { Outfit } from '@/types/outfits';
import { AppError, toAppError } from '@/utils/errors';

export type PreviewPhase =
  | { phase: 'idle' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'running'; status: 'queued' | 'processing' }
  | { phase: 'done'; result: Extract<GenerationJobState, { status: 'completed' }> }
  | { phase: 'failed'; error: AppError };

/**
 * Mode B: personalised AI previews. Requires an explicit user action every time; uploads the
 * portrait first only if it isn't already in private cloud storage (with consent captured by the
 * caller). Demo builds run the mock provider and get a flagged demo result.
 */
export function useOutfitPreviewGeneration(session: AnalysisSession | null, outfit: Outfit | null) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const repo = useRepository();
  const queryClient = useQueryClient();
  const [state, setState] = useState<PreviewPhase>({ phase: 'idle' });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const signedIn = status === 'signedIn';
  const hasCloudPortrait = session?.portrait.location === 'cloud' && Boolean(session.portrait.storagePath);
  // Signed-in users get the real provider even before the portrait is in the cloud: the screen
  // then offers a consented upload first (`needsUpload`).
  const provider = getOutfitGenerationProvider({ signedIn, hasCloudPortrait: hasCloudPortrait || signedIn });
  const isRemote = provider !== null && !provider.isDemo;
  const needsUpload = isRemote && !hasCloudPortrait;
  const canUpload = needsUpload && Boolean(session?.portrait.localUri);

  const generate = async (options: { consentToUpload: boolean }) => {
    if (!session || !outfit || !provider) return;
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;

    try {
      let portraitPath = session.portrait.storagePath;
      if (isRemote && !hasCloudPortrait) {
        if (!options.consentToUpload) throw new AppError('permission_denied', 'Consent is needed to upload your portrait.');
        if (!session.portrait.localUri || !user) throw new AppError('not_found', 'The portrait for this analysis is no longer on this device.');
        setState({ phase: 'uploading', progress: 0 });
        portraitPath = await uploadPortrait({
          userId: user.id,
          analysisId: session.id,
          fileUri: session.portrait.localUri,
          signal: ctrl.signal,
          onProgress: (progress) => setState({ phase: 'uploading', progress }),
        });
        await repo.updateAnalysis(session.id, { portrait: { location: 'cloud', storagePath: portraitPath } });
        void queryClient.invalidateQueries({ queryKey: ['data'] });
      }

      setState({ phase: 'running', status: 'queued' });
      const result = await generateOutfitPreview(
        provider,
        {
          analysisId: session.id,
          outfitId: outfit.id,
          outfitName: outfit.name,
          garmentColor: outfit.mainColor.hex,
          garmentColorName: outfit.mainColor.name,
          garmentCategory: outfit.tryOnCategory,
          garmentDescription: outfit.garmentDescription,
          portraitUri: session.portrait.localUri,
          portraitPath,
        },
        {
          signal: ctrl.signal,
          onStatus: (s) => {
            if (s.status === 'queued' || s.status === 'processing') setState({ phase: 'running', status: s.status });
          },
        },
      );
      if (result.status === 'failed') {
        setState({ phase: 'failed', error: result.error });
      } else if (result.status === 'completed') {
        setState({ phase: 'done', result });
        if (!result.isDemo) void queryClient.invalidateQueries({ queryKey: ['data'] });
      }
    } catch (error) {
      const appError = toAppError(error, 'generation_failed');
      if (appError.code === 'cancelled') setState({ phase: 'idle' });
      else setState({ phase: 'failed', error: appError });
    }
  };

  const cancel = () => {
    controller.current?.abort();
    setState({ phase: 'idle' });
  };

  return { state, generate, cancel, provider, isRemote, needsUpload, canUpload, reset: () => setState({ phase: 'idle' }) };
}
