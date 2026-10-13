import { FACE_SAMPLE_ELLIPSE, insideEllipse } from '@/features/analysis/faceRegion';
import type { PixelImage } from '@/features/analysis/imageAnalysis';
import { invokeFunction } from '@/services/supabase/functions';
import { AppError } from '@/utils/errors';

import { MockColorAnalysisProvider } from '../MockColorAnalysisProvider';
import { OnDeviceColorAnalysisProvider } from '../OnDeviceColorAnalysisProvider';
import { isQualityGateError } from '../QualityGateError';
import { RemoteColorAnalysisProvider } from '../RemoteColorAnalysisProvider';
import { remoteAnalysisResponseSchema } from '../remoteSchema';

jest.mock('@/services/supabase/functions', () => ({ invokeFunction: jest.fn() }));
const invoke = invokeFunction as jest.MockedFunction<typeof invokeFunction>;

function image(skin: [number, number, number], bg: [number, number, number] = [150, 150, 150]): PixelImage {
  const width = 100;
  const height = 130;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inFace = insideEllipse((x + 0.5) / width, (y + 0.5) / height, FACE_SAMPLE_ELLIPSE);
      const c = inFace ? skin : bg;
      const n = ((x * 7 + y * 13) % 21) - 10; // deterministic texture so it isn't "blurry"
      const i = (y * width + x) * 4;
      data.set([c[0] + n, c[1] + n, c[2] + n, 255], i);
    }
  }
  return { width, height, data };
}

const input = { analysisId: '6f1c1f4e-8b0e-4c35-9e6d-9a1b2c3d4e5f', imageUri: 'file:///p.jpg', width: 1024, height: 1280, storagePath: 'u/a/original.jpg' };
const goodSampler = async () => image([198, 150, 120]);

const validResponse = {
  characteristics: { lean: -0.4, depth: 0.6, contrast: 0.7, chroma: 0.5 },
  confidence: 0.9,
  observations: ['Your hair reads as a deep, cool brown.'],
  qualityConcerns: [],
  usable: true,
  model: 'claude-opus-5-5',
};

beforeEach(() => invoke.mockReset());

describe('remoteAnalysisResponseSchema', () => {
  it('accepts a valid response and defaults optional arrays', () => {
    const r = remoteAnalysisResponseSchema.parse({ ...validResponse, observations: undefined, qualityConcerns: undefined });
    expect(r.observations).toEqual([]);
    expect(r.qualityConcerns).toEqual([]);
  });

  it.each([
    [{ characteristics: { ...validResponse.characteristics, lean: 1.5 } }],
    [{ characteristics: { ...validResponse.characteristics, depth: -0.1 } }],
    [{ confidence: 2 }],
    [{ observations: Array.from({ length: 7 }, () => 'x') }],
    [{ model: undefined }],
  ])('rejects out-of-contract payload %#', (override) => {
    expect(remoteAnalysisResponseSchema.safeParse({ ...validResponse, ...override }).success).toBe(false);
  });
});

describe('RemoteColorAnalysisProvider', () => {
  it('builds a palette locally from server characteristics', async () => {
    invoke.mockResolvedValue(remoteAnalysisResponseSchema.parse(validResponse));
    const stages: string[] = [];
    const result = await new RemoteColorAnalysisProvider(goodSampler).analyze(input, { onProgress: (e) => stages.push(e.stage) });
    expect(invoke).toHaveBeenCalledWith('analyze-portrait', { analysisId: input.analysisId, storagePath: input.storagePath }, expect.anything(), expect.anything());
    expect(stages).toEqual(['checking_quality', 'estimating', 'palettes']);
    expect(result.provider).toBe('remote');
    expect(result.isDemo).toBe(false);
    expect(result.characteristics.undertone.lean).toBeCloseTo(-0.4);
    expect(result.recommendedColors).toHaveLength(8);
    expect(result.explanation).toMatch(/deep, cool brown/);
    // Confidence is capped by measured photo quality.
    expect(result.confidence).toBeLessThanOrEqual(0.9);
  });

  it('turns an unusable verdict into a quality gate', async () => {
    invoke.mockResolvedValue(
      remoteAnalysisResponseSchema.parse({ ...validResponse, usable: false, qualityConcerns: ['Two faces are visible.'] }),
    );
    const error = await new RemoteColorAnalysisProvider(goodSampler).analyze(input).catch((e: unknown) => e);
    expect(isQualityGateError(error)).toBe(true);
  });

  it('checks quality on the device before calling the server', async () => {
    const error = await new RemoteColorAnalysisProvider(async () => image([40, 90, 200])).analyze(input).catch((e: unknown) => e);
    expect(isQualityGateError(error)).toBe(true);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('requires an uploaded portrait', async () => {
    const error = await new RemoteColorAnalysisProvider(goodSampler).analyze({ ...input, storagePath: null }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe('upload_failed');
  });

  it('propagates server errors unchanged', async () => {
    invoke.mockRejectedValue(new AppError('quota_exceeded', 'Daily limit reached.'));
    await expect(new RemoteColorAnalysisProvider(goodSampler).analyze(input)).rejects.toMatchObject({ code: 'quota_exceeded' });
  });
});

describe('OnDeviceColorAnalysisProvider', () => {
  it('analyses real pixels without any network call', async () => {
    const result = await new OnDeviceColorAnalysisProvider(goodSampler).analyze(input);
    expect(result.provider).toBe('on-device');
    expect(result.isDemo).toBe(false);
    expect(result.characteristics.sampledHex).toMatch(/^#/);
    expect(result.confidence).toBeLessThanOrEqual(0.75);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('lets the user continue past a quality gate with very low confidence', async () => {
    const sampler = async () => image([40, 90, 200]);
    await expect(new OnDeviceColorAnalysisProvider(sampler).analyze(input)).rejects.toMatchObject({ code: 'low_quality' });
    const result = await new OnDeviceColorAnalysisProvider(sampler).analyze(input, { acceptLowQuality: true });
    expect(result.confidence).toBe(0.1);
  });
});

describe('MockColorAnalysisProvider', () => {
  it('always labels its output as demo data', async () => {
    const result = await new MockColorAnalysisProvider(0).analyze(input);
    expect(result.isDemo).toBe(true);
    expect(result.provider).toBe('mock');
    expect(result.confidence).toBeNull();
  });

  it('can be cancelled', async () => {
    const controller = new AbortController();
    const promise = new MockColorAnalysisProvider(50).analyze(input, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ code: 'cancelled' });
  });
});
