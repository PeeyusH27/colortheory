import { useAuthStore } from '@/features/auth/authStore';
import { createDemoAnalysisResult } from '@/mocks/demoAnalysis';
import { QualityGateError } from '@/services/color-analysis/QualityGateError';
import type { ColorAnalysisProvider } from '@/services/color-analysis/types';
import { LocalRepository } from '@/services/data/localRepository';
import { useLocalDataStore } from '@/services/data/localDataStore';
import { persistPortraitLocally } from '@/services/storage/localFiles';
import { removeObjects, uploadPortrait } from '@/services/storage/portraitStorage';
import { AppError } from '@/utils/errors';

import { useAnalysisStore, type AnalysisRequest } from '../analysisStore';
import { plannedStages, runAnalysis } from '../runAnalysis';

const mockRepo = new LocalRepository();
let mockProvider: ColorAnalysisProvider;

jest.mock('@/services/data', () => ({ getRepository: () => mockRepo }));
jest.mock('@/services/color-analysis', () => ({
  ...jest.requireActual('@/services/color-analysis/QualityGateError'),
  getColorAnalysisProvider: () => mockProvider,
}));
jest.mock('@/services/storage/localFiles', () => ({
  persistPortraitLocally: jest.fn((_uri: string, id: string) => `file:///docs/portraits/${id}.jpg`),
  deleteFileQuietly: jest.fn(),
}));
jest.mock('@/services/storage/portraitStorage', () => ({
  BUCKETS: { portraits: 'portraits', previews: 'outfit-previews' },
  uploadPortrait: jest.fn(),
  removeObjects: jest.fn(async () => undefined),
}));

const portrait = { uri: 'file:///cache/working.jpg', width: 1024, height: 1280, source: 'camera' as const, capturedAt: '2026-01-01T00:00:00Z' };
const device: AnalysisRequest = { method: 'device', upload: false, keepInCloud: false, consentedAt: null };
const result = { ...createDemoAnalysisResult(), isDemo: false, provider: 'on-device' as const };

function fakeProvider(impl: ColorAnalysisProvider['analyze'], requiresUpload = false): ColorAnalysisProvider {
  return { id: requiresUpload ? 'remote' : 'on-device', label: 'Fake', isDemo: false, requiresUpload, analyze: jest.fn(impl) };
}

beforeEach(() => {
  jest.clearAllMocks();
  useLocalDataStore.getState().reset();
  useAnalysisStore.getState().reset();
  useAuthStore.setState({ status: 'demo', user: { id: 'demo-user', email: null, displayName: 'Guest', emailConfirmed: false } });
});

it('plans only the stages that will really run', () => {
  expect(plannedStages(device)).toEqual(['preparing', 'checking_quality', 'estimating', 'palettes', 'outfits']);
  expect(plannedStages({ ...device, method: 'cloud', upload: true })).toContain('uploading');
});

it('saves a completed analysis with a private local copy of the portrait', async () => {
  mockProvider = fakeProvider(async (_input, opts) => {
    opts?.onProgress?.({ stage: 'checking_quality' });
    opts?.onProgress?.({ stage: 'estimating' });
    opts?.onProgress?.({ stage: 'palettes' });
    return result;
  });
  const id = await runAnalysis({ portrait, request: device, signal: new AbortController().signal });

  const saved = await mockRepo.getAnalysis(id);
  expect(saved).toMatchObject({ status: 'completed', portrait: { location: 'device', localUri: `file:///docs/portraits/${id}.jpg`, storagePath: null } });
  expect(saved?.result?.headline).toBe(result.headline);
  expect(persistPortraitLocally).toHaveBeenCalledWith(portrait.uri, id);
  expect(uploadPortrait).not.toHaveBeenCalled(); // nothing leaves the device
  const run = useAnalysisStore.getState();
  expect(run.status).toBe('done');
  expect(run.completed).toEqual(plannedStages(device));
});

it('removes everything it created when the mockProvider fails', async () => {
  mockProvider = fakeProvider(async () => {
    throw new AppError('network', 'down');
  });
  await expect(runAnalysis({ portrait, request: device, signal: new AbortController().signal })).rejects.toMatchObject({ code: 'network' });
  expect(await mockRepo.listAnalyses()).toEqual([]);
  expect(useAnalysisStore.getState()).toMatchObject({ status: 'error', error: expect.objectContaining({ code: 'network' }) });
});

it('surfaces quality gates with the report and saves nothing', async () => {
  const report = { score: 0.2, issues: [{ code: 'too_dark' as const, severity: 'blocking' as const, message: 'Too dark' }], metrics: {} as never };
  mockProvider = fakeProvider(async () => {
    throw new QualityGateError(report);
  });
  await expect(runAnalysis({ portrait, request: device, signal: new AbortController().signal })).rejects.toBeInstanceOf(QualityGateError);
  expect(useAnalysisStore.getState()).toMatchObject({ status: 'quality_gate', quality: report });
  expect(await mockRepo.listAnalyses()).toEqual([]);
});

it('treats cancellation as silent (no error state)', async () => {
  const controller = new AbortController();
  mockProvider = fakeProvider(async () => {
    controller.abort();
    throw new AppError('cancelled', 'Cancelled');
  });
  await expect(runAnalysis({ portrait, request: device, signal: controller.signal })).rejects.toMatchObject({ code: 'cancelled' });
  expect(useAnalysisStore.getState().status).toBe('running');
  expect(await mockRepo.listAnalyses()).toEqual([]);
});

describe('uploads and consent', () => {
  const cloud: AnalysisRequest = { method: 'cloud', upload: true, keepInCloud: false, consentedAt: '2026-01-01T00:00:00Z' };

  it('never uploads without a signed-in account', async () => {
    mockProvider = fakeProvider(async () => result, true);
    await expect(runAnalysis({ portrait, request: cloud, signal: new AbortController().signal })).rejects.toMatchObject({ code: 'session_expired' });
    expect(uploadPortrait).not.toHaveBeenCalled();
  });

  it('never uploads without explicit consent', async () => {
    useAuthStore.setState({ status: 'signedIn', user: { id: 'u1', email: 'a@b.co', displayName: null, emailConfirmed: true } });
    mockProvider = fakeProvider(async () => result, true);
    await expect(runAnalysis({ portrait, request: { ...cloud, consentedAt: null }, signal: new AbortController().signal })).rejects.toMatchObject({
      code: 'permission_denied',
    });
    expect(uploadPortrait).not.toHaveBeenCalled();
  });

  it('uploads with progress, then deletes a temporary cloud copy after analysis', async () => {
    useAuthStore.setState({ status: 'signedIn', user: { id: 'u1', email: 'a@b.co', displayName: null, emailConfirmed: true } });
    (uploadPortrait as jest.Mock).mockImplementation(async (o: { userId: string; analysisId: string; onProgress: (f: number) => void }) => {
      o.onProgress(0.5);
      expect(useAnalysisStore.getState().uploadProgress).toBe(0.5);
      return `${o.userId}/${o.analysisId}/original.jpg`;
    });
    mockProvider = fakeProvider(async (input) => {
      expect(input.storagePath).toBe(`u1/${input.analysisId}/original.jpg`);
      return { ...result, provider: 'remote' };
    }, true);

    const id = await runAnalysis({ portrait, request: cloud, signal: new AbortController().signal });
    expect(removeObjects).toHaveBeenCalledWith('portraits', [`u1/${id}/original.jpg`]);
    expect((await mockRepo.getAnalysis(id))?.portrait).toMatchObject({ location: 'device', storagePath: null });
  });

  it('keeps the cloud copy (and no local copy) when the user chose cloud storage', async () => {
    useAuthStore.setState({ status: 'signedIn', user: { id: 'u1', email: 'a@b.co', displayName: null, emailConfirmed: true } });
    (uploadPortrait as jest.Mock).mockImplementation(async (o: { userId: string; analysisId: string }) => `${o.userId}/${o.analysisId}/original.jpg`);
    mockProvider = fakeProvider(async () => ({ ...result, provider: 'remote' }), true);

    const id = await runAnalysis({ portrait, request: { ...cloud, keepInCloud: true }, signal: new AbortController().signal });
    expect(persistPortraitLocally).not.toHaveBeenCalled();
    expect(removeObjects).not.toHaveBeenCalled();
    expect((await mockRepo.getAnalysis(id))?.portrait).toMatchObject({ location: 'cloud', localUri: null, storagePath: `u1/${id}/original.jpg` });
  });
});
