import type { SelectedPortrait } from '@/features/camera/portraitStore';
import { useAuthStore } from '@/features/auth/authStore';
import { recommendOutfits } from '@/features/outfits/recommendOutfits';
import { getColorAnalysisProvider, isQualityGateError, type AnalysisStage } from '@/services/color-analysis';
import { getRepository } from '@/services/data';
import { persistPortraitLocally } from '@/services/storage/localFiles';
import { BUCKETS, removeObjects, uploadPortrait } from '@/services/storage/portraitStorage';
import { throwIfAborted } from '@/utils/async';
import { AppError, toAppError } from '@/utils/errors';
import { createId } from '@/utils/id';

import { useAnalysisStore, type AnalysisRequest } from './analysisStore';

/** The stages a run will actually go through, in order (shown up-front in the UI). */
export function plannedStages(request: AnalysisRequest): AnalysisStage[] {
  return ['preparing', ...(request.upload ? (['uploading'] as const) : []), 'checking_quality', 'estimating', 'palettes', 'outfits'];
}

/**
 * Orchestrates one analysis:
 *   prepare (persist local copy) → upload (only with consent) → provider analysis → outfits → save.
 *
 * Every stage reported to the UI corresponds to real work. On failure or cancel, everything this
 * run created (DB row, local copy, uploaded object) is removed, while the working portrait in the
 * portrait store is kept so the user can retry.
 */
export async function runAnalysis(options: {
  portrait: SelectedPortrait;
  request: AnalysisRequest;
  signal: AbortSignal;
  acceptLowQuality?: boolean;
}): Promise<string> {
  const { portrait, request, signal, acceptLowQuality } = options;
  const store = useAnalysisStore.getState();
  const repo = getRepository();
  const { user, status } = useAuthStore.getState();
  const provider = getColorAnalysisProvider(request.method);
  const id = createId();
  let created = false;
  let uploadedPath: string | null = null;

  if (request.upload) {
    if (status !== 'signedIn' || !user) throw new AppError('session_expired', 'Sign in to use cloud storage.');
    if (!request.consentedAt) throw new AppError('permission_denied', 'Consent is required before uploading your portrait.');
  }
  if (provider.requiresUpload && !request.upload) {
    throw new AppError('permission_denied', 'Cloud analysis needs your consent to upload the portrait.');
  }

  store.begin(plannedStages(request));
  try {
    store.enterStage('preparing');
    // Keep a private on-device copy unless the user chose to store this portrait in the cloud.
    const keepLocal = !(request.upload && request.keepInCloud);
    const localUri = keepLocal ? persistPortraitLocally(portrait.uri, id) : null;
    await repo.createAnalysis({
      id,
      provider: provider.id,
      status: request.upload ? 'uploading' : 'processing',
      portrait: { location: localUri ? 'device' : 'cloud', localUri, storagePath: null },
      isDemo: provider.isDemo,
    });
    created = true;
    throwIfAborted(signal);

    if (request.upload && user) {
      store.enterStage('uploading');
      uploadedPath = await uploadPortrait({
        userId: user.id,
        analysisId: id,
        fileUri: portrait.uri,
        signal,
        onProgress: (f) => useAnalysisStore.getState().setUploadProgress(f),
      });
      await repo.updateAnalysis(id, { status: 'processing', portrait: { location: 'cloud', storagePath: uploadedPath } });
    }

    const result = await provider.analyze(
      { analysisId: id, imageUri: portrait.uri, width: portrait.width, height: portrait.height, storagePath: uploadedPath },
      { signal, acceptLowQuality, onProgress: (e) => useAnalysisStore.getState().enterStage(e.stage) },
    );
    throwIfAborted(signal);

    store.enterStage('outfits');
    // Real work: verifies the palette yields outfits before we show results.
    if (recommendOutfits(result, { limit: 1 }).length === 0) {
      throw new AppError('invalid_response', 'We couldn’t build outfits from this palette.');
    }
    await repo.updateAnalysis(id, { status: 'completed', result });

    // Temporary upload (cloud analysis but "keep on device"): delete it now that we're done.
    if (uploadedPath && !request.keepInCloud) {
      await removeObjects(BUCKETS.portraits, [uploadedPath]).catch(() => undefined);
      await repo.updateAnalysis(id, { portrait: { location: localUri ? 'device' : 'deleted', storagePath: null } });
    }

    store.finish(id);
    return id;
  } catch (error) {
    if (created) await repo.deleteAnalysis(id).catch(() => undefined);
    if (isQualityGateError(error)) {
      store.qualityGate(error.report);
      throw error;
    }
    const appError = toAppError(error);
    if (appError.code !== 'cancelled') store.fail(appError);
    throw appError;
  }
}
