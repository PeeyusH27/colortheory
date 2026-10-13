import type { ImageQualityReport, QualityIssue, VisibleCharacteristics } from '@/types/domain';
import { labToHex, labToLch, rgbToLab, type Lab } from '@/utils/color';

import { FACE_SAMPLE_ELLIPSE, insideEllipse } from './faceRegion';
import { characteristicsFrom } from './paletteEngine';

/**
 * Pure pixel analysis used by the on-device provider. Input is a small RGBA bitmap (≈256px wide)
 * decoded from the user's photo; nothing here touches the network or the file system.
 *
 * What it can do: measure exposure, clipping, colour casts on near-grey pixels, sharpness, and the
 * average colour of skin-like pixels in the face guide region.
 * What it cannot do: identify a "true" undertone. Camera white balance, makeup, lighting and
 * screen processing all shift these numbers — results are labelled as estimates.
 */

export interface PixelImage {
  width: number;
  height: number;
  /** RGBA, 8 bits per channel. */
  data: Uint8Array | Uint8ClampedArray;
}

export interface FaceSample {
  /** Median CIELAB of skin-like pixels in the face ellipse. */
  lab: Lab;
  hex: string;
  /** Fraction of ellipse pixels classified as skin-like. */
  skinFraction: number;
  /** Mean luminance (0–1) of the skin pixels. */
  luminance: number;
  clippedFraction: number;
  /** Darkest-decile lightness just above the face (hair / brows), for contrast. */
  darkFeatureL: number | null;
}

export interface ImageQualityIssueInput {
  meanLuminance: number;
  clippedHighlights: number;
  face: FaceSample | null;
  skinFraction: number;
  cast: { a: number; b: number } | null;
  sharpness: number;
  original: { width: number; height: number };
}

export interface PixelAnalysis {
  quality: ImageQualityReport;
  face: FaceSample | null;
  /** Lab a* and b* of near-grey pixels (white-balance cast), or null if too few were found. */
  cast: { a: number; b: number } | null;
}

const lum = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** Broad YCbCr skin classifier (after Chai & Ngan), widened to cover a wide range of skin tones. */
export function isSkinLike(r: number, g: number, b: number) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return y > 25 && y < 250 && cb >= 70 && cb <= 135 && cr >= 128 && cr <= 182;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] as number) : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)))] as number;
}

/** Variance of the 4-neighbour Laplacian of luminance — a standard blur heuristic. */
export function laplacianVariance(img: PixelImage) {
  const { width: w, height: h, data } = img;
  if (w < 3 || h < 3) return 0;
  const luma = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    luma[i] = 0.299 * (data[i * 4] as number) + 0.587 * (data[i * 4 + 1] as number) + 0.114 * (data[i * 4 + 2] as number);
  }
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const v = (luma[i - 1] as number) + (luma[i + 1] as number) + (luma[i - w] as number) + (luma[i + w] as number) - 4 * (luma[i] as number);
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

export function analyzePixels(img: PixelImage, original: { width: number; height: number }): PixelAnalysis {
  const { width: w, height: h, data } = img;
  let lumSum = 0;
  let clipped = 0;
  let crushed = 0;
  const greyA: number[] = [];
  const greyB: number[] = [];
  const skinL: number[] = [];
  const skinA: number[] = [];
  const skinB: number[] = [];
  let skinLum = 0;
  let skinClipped = 0;
  let ellipsePixels = 0;
  const featureL: number[] = [];
  const e = FACE_SAMPLE_ELLIPSE;

  for (let y = 0; y < h; y++) {
    const ny = (y + 0.5) / h;
    for (let x = 0; x < w; x++) {
      const nx = (x + 0.5) / w;
      const i = (y * w + x) * 4;
      const r = data[i] as number;
      const g = data[i + 1] as number;
      const b = data[i + 2] as number;
      const Y = lum(r, g, b);
      lumSum += Y;
      if (Y > 0.97) clipped++;
      if (Y < 0.03) crushed++;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (sat < 0.12 && Y > 0.2 && Y < 0.92) {
        // Sample every other near-grey pixel to bound the Lab conversions.
        if ((x + y) % 2 === 0) {
          const lab = rgbToLab({ r, g, b });
          greyA.push(lab.a);
          greyB.push(lab.b);
        }
      }

      if (insideEllipse(nx, ny, e)) {
        ellipsePixels++;
        if (isSkinLike(r, g, b)) {
          const lab = rgbToLab({ r, g, b });
          skinL.push(lab.L);
          skinA.push(lab.a);
          skinB.push(lab.b);
          skinLum += Y;
          if (Y > 0.95) skinClipped++;
        }
      } else if (
        // Band just above the face oval: hair line and brows.
        ny > e.cy - e.ry - 0.1 &&
        ny < e.cy - e.ry * 0.55 &&
        Math.abs(nx - e.cx) < e.rx * 0.9
      ) {
        featureL.push(rgbToLab({ r, g, b }).L);
      }
    }
  }

  const total = w * h;
  const meanLuminance = lumSum / total;
  const clippedHighlights = clipped / total;
  const crushedShadows = crushed / total;
  const cast = greyA.length > total * 0.03 ? { a: median(greyA), b: median(greyB) } : null;
  const sharpness = laplacianVariance(img);

  let face: FaceSample | null = null;
  const skinFraction = ellipsePixels ? skinL.length / ellipsePixels : 0;
  if (skinL.length >= 30) {
    const lab = { L: median(skinL), a: median(skinA), b: median(skinB) };
    face = {
      lab,
      hex: labToHex(lab),
      skinFraction,
      luminance: skinLum / skinL.length,
      clippedFraction: skinClipped / skinL.length,
      darkFeatureL: percentile(featureL, 0.1),
    };
  }

  const issues = qualityIssues({
    meanLuminance,
    clippedHighlights,
    face,
    skinFraction,
    cast,
    sharpness,
    original,
  });
  const penalty = issues.reduce((s, i) => s + (i.severity === 'blocking' ? 0.4 : i.severity === 'warning' ? 0.15 : 0.05), 0);

  return {
    face,
    cast,
    quality: {
      score: Math.max(0, Math.min(1, 1 - penalty)),
      issues,
      metrics: {
        meanLuminance,
        clippedHighlights,
        crushedShadows,
        warmCast: cast?.b ?? 0,
        greenMagentaCast: cast?.a ?? 0,
        sharpness,
        width: original.width,
        height: original.height,
      },
    },
  };
}

export function qualityIssues(input: ImageQualityIssueInput): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const { face, cast, sharpness, original } = input;
  const faceLum = face?.luminance ?? input.meanLuminance;

  if (Math.min(original.width, original.height) < 480) {
    issues.push({ code: 'low_resolution', severity: 'warning', message: 'This image is quite small. A higher-resolution photo gives more reliable colour.' });
  }
  if (!face || input.skinFraction < 0.08) {
    issues.push({
      code: 'face_region_unclear',
      severity: 'blocking',
      message: 'We couldn’t find a clear face area in the centre of the photo. Centre your face in the guide and avoid busy backgrounds.',
    });
  }
  if (faceLum < 0.14) {
    issues.push({ code: 'too_dark', severity: 'blocking', message: 'Your face is underexposed. Face a window or soft light source and retake.' });
  } else if (faceLum < 0.24) {
    issues.push({ code: 'too_dark', severity: 'warning', message: 'The photo is a little dark, which can make colours read deeper than they are.' });
  }
  if ((face?.clippedFraction ?? 0) > 0.3 || faceLum > 0.9) {
    issues.push({ code: 'overexposed', severity: 'blocking', message: 'Highlights on your face are blown out. Avoid direct sun or harsh flash and retake.' });
  } else if ((face?.clippedFraction ?? 0) > 0.12 || input.clippedHighlights > 0.25) {
    issues.push({ code: 'overexposed', severity: 'warning', message: 'Some highlights are clipped. Softer light will give a more accurate reading.' });
  }
  if (cast) {
    if (cast.b > 9) issues.push({ code: 'color_cast_warm', severity: cast.b > 16 ? 'warning' : 'info', message: 'The light looks warm or yellow (indoor bulbs?). Results may skew warmer than reality.' });
    else if (cast.b < -9) issues.push({ code: 'color_cast_cool', severity: cast.b < -16 ? 'warning' : 'info', message: 'The light looks cool or blue (shade or screens). Results may skew cooler than reality.' });
    if (cast.a < -7) issues.push({ code: 'color_cast_green', severity: 'warning', message: 'The light has a green tint (fluorescent or LED). Colour readings may be off.' });
    else if (cast.a > 8) issues.push({ code: 'color_cast_magenta', severity: 'warning', message: 'The light has a pink or magenta tint. Colour readings may be off.' });
  }
  if (sharpness < 6) {
    issues.push({ code: 'blurry', severity: 'warning', message: 'The photo looks soft or blurred. Hold still and let the camera focus before capturing.' });
  }
  return issues;
}

/**
 * Converts a face sample into visible characteristics. Each mapping is a coarse heuristic and is
 * corrected for any measured white-balance cast.
 */
export function characteristicsFromSample(face: FaceSample, cast: { a: number; b: number } | null): VisibleCharacteristics {
  const { L, C, h } = labToLch(face.lab);
  // Skin hue typically sits between ~35° (pinker) and ~70° (yellower/olive).
  const castCorrection = cast ? cast.b / 22 : 0;
  const lean = (h - 54) / 14 - castCorrection;
  const depth = (78 - L) / 50;
  const contrast = face.darkFeatureL === null ? 0.5 : (L - face.darkFeatureL) / 45;
  const chroma = (C - 10) / 20;
  return characteristicsFrom({ lean, depth, contrast, chroma, sampledHex: face.hex });
}

/** Confidence for on-device estimates. Capped at 0.75: heuristics never deserve "certain". */
export function onDeviceConfidence(quality: ImageQualityReport, face: FaceSample | null) {
  if (!face) return 0.1;
  const coverage = Math.min(1, face.skinFraction / 0.35);
  const raw = 0.25 + 0.45 * quality.score + 0.1 * coverage;
  return Math.round(Math.max(0.1, Math.min(0.75, raw)) * 100) / 100;
}
