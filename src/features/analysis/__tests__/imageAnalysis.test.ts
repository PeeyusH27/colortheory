import { FACE_SAMPLE_ELLIPSE, insideEllipse } from '../faceRegion';
import { analyzePixels, characteristicsFromSample, isSkinLike, onDeviceConfidence, type PixelImage } from '../imageAnalysis';

type RGB = [number, number, number];

/**
 * Synthetic portrait: a background, a "skin" oval in the face guide, a darker band above it for
 * hair, and optional per-pixel noise (so sharpness isn't zero).
 */
function portrait(opts: { bg: RGB; skin: RGB; hair?: RGB; noise?: number; width?: number; height?: number; scale?: number }): PixelImage {
  const width = opts.width ?? 120;
  const height = opts.height ?? 160;
  const data = new Uint8ClampedArray(width * height * 4);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
  const e = FACE_SAMPLE_ELLIPSE;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x + 0.5) / width;
      const ny = (y + 0.5) / height;
      let c: RGB = opts.bg;
      if (insideEllipse(nx, ny, e)) c = opts.skin;
      else if (opts.hair && ny > e.cy - e.ry - 0.1 && ny < e.cy - e.ry * 0.55 && Math.abs(nx - e.cx) < e.rx * 0.9) c = opts.hair;
      const n = (opts.noise ?? 18) * rand();
      const s = opts.scale ?? 1;
      const i = (y * width + x) * 4;
      data[i] = c[0] * s + n;
      data[i + 1] = c[1] * s + n;
      data[i + 2] = c[2] * s + n;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

const ORIGINAL = { width: 1024, height: 1280 };
const GREY: RGB = [150, 150, 150];
const SKIN_MEDIUM: RGB = [198, 150, 120];
const HAIR_DARK: RGB = [40, 30, 28];

describe('isSkinLike', () => {
  it('accepts a range of skin tones and rejects saturated non-skin colours', () => {
    for (const c of [[236, 200, 180], [198, 150, 120], [141, 85, 60], [90, 56, 40]] as RGB[]) expect(isSkinLike(...c)).toBe(true);
    for (const c of [[40, 90, 200], [30, 160, 60], [150, 150, 150]] as RGB[]) expect(isSkinLike(...c)).toBe(false);
  });
});

describe('analyzePixels', () => {
  it('passes a well-lit portrait with no blocking issues', () => {
    const a = analyzePixels(portrait({ bg: GREY, skin: SKIN_MEDIUM, hair: HAIR_DARK }), ORIGINAL);
    expect(a.face).not.toBeNull();
    expect(a.quality.issues.filter((i) => i.severity === 'blocking')).toEqual([]);
    expect(a.quality.score).toBeGreaterThan(0.7);
  });

  it('blocks a very dark photo', () => {
    const a = analyzePixels(portrait({ bg: GREY, skin: SKIN_MEDIUM, hair: HAIR_DARK, scale: 0.12, noise: 2 }), ORIGINAL);
    expect(a.quality.issues.some((i) => i.code === 'too_dark' || i.code === 'face_region_unclear')).toBe(true);
    expect(a.quality.issues.some((i) => i.severity === 'blocking')).toBe(true);
  });

  it('reports no cast for a neutral grey background', () => {
    const a = analyzePixels(portrait({ bg: GREY, skin: SKIN_MEDIUM, hair: HAIR_DARK }), ORIGINAL);
    expect(Math.abs(a.cast?.b ?? 99)).toBeLessThan(3);
  });

  it('does not count a grey wall inside the face guide as skin', () => {
    const a = analyzePixels(portrait({ bg: GREY, skin: GREY }), ORIGINAL);
    expect(a.face).toBeNull();
  });

  it('blocks when no face-like region is found', () => {
    const a = analyzePixels(portrait({ bg: GREY, skin: [40, 90, 200] }), ORIGINAL);
    expect(a.quality.issues.map((i) => i.code)).toContain('face_region_unclear');
  });

  it('detects a warm white-balance cast from a tinted background wall', () => {
    // A grey/white wall under a warm bulb.
    const a = analyzePixels(portrait({ bg: [205, 188, 150], skin: SKIN_MEDIUM, hair: HAIR_DARK }), ORIGINAL);
    expect(a.cast?.b ?? 0).toBeGreaterThan(9);
    expect(a.quality.issues.map((i) => i.code)).toContain('color_cast_warm');
  });

  it('flags a perfectly flat (blurred) image', () => {
    const a = analyzePixels(portrait({ bg: GREY, skin: SKIN_MEDIUM, noise: 0 }), ORIGINAL);
    expect(a.quality.issues.map((i) => i.code)).toContain('blurry');
  });

  it('warns about low resolution originals', () => {
    const a = analyzePixels(portrait({ bg: GREY, skin: SKIN_MEDIUM, hair: HAIR_DARK }), { width: 320, height: 400 });
    expect(a.quality.issues.map((i) => i.code)).toContain('low_resolution');
  });
});

describe('characteristicsFromSample', () => {
  it('reads a lighter, pinker sample as cooler and lighter than a deeper, golden one', () => {
    const light = analyzePixels(portrait({ bg: GREY, skin: [240, 205, 200], hair: HAIR_DARK }), ORIGINAL);
    const deep = analyzePixels(portrait({ bg: GREY, skin: [150, 100, 55], hair: HAIR_DARK }), ORIGINAL);
    const cLight = characteristicsFromSample(light.face!, light.cast);
    const cDeep = characteristicsFromSample(deep.face!, deep.cast);
    expect(cLight.undertone.lean).toBeLessThan(cDeep.undertone.lean);
    expect(cLight.depth.value).toBeLessThan(cDeep.depth.value);
    expect(cLight.sampledHex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('estimates higher contrast when hair is much darker than skin', () => {
    const high = analyzePixels(portrait({ bg: GREY, skin: [235, 200, 180], hair: [25, 20, 20] }), ORIGINAL);
    const low = analyzePixels(portrait({ bg: GREY, skin: [235, 200, 180], hair: [200, 170, 140] }), ORIGINAL);
    expect(characteristicsFromSample(high.face!, high.cast).contrast.value).toBeGreaterThan(
      characteristicsFromSample(low.face!, low.cast).contrast.value,
    );
  });
});

describe('onDeviceConfidence', () => {
  it('never exceeds 0.75 and drops to 0.1 without a face', () => {
    const good = analyzePixels(portrait({ bg: GREY, skin: SKIN_MEDIUM, hair: HAIR_DARK }), ORIGINAL);
    expect(onDeviceConfidence(good.quality, good.face)).toBeLessThanOrEqual(0.75);
    expect(onDeviceConfidence(good.quality, null)).toBe(0.1);
  });
});
