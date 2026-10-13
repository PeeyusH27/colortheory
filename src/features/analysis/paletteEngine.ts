import { COLOR_LIBRARY, FAMILY_LABELS, type ColorFamily, type LibraryColor } from '@/features/colors/colorLibrary';
import type {
  AnalysisAdjustments,
  ChromaEstimate,
  ColorCombination,
  ColorRecommendation,
  ContrastEstimate,
  DepthEstimate,
  GarmentCategory,
  UndertoneLean,
  VisibleCharacteristics,
} from '@/types/domain';
import { deltaEHex } from '@/utils/color';

/**
 * Deterministic palette engine.
 *
 * Input: visible characteristics (estimated by any analysis provider) plus optional user
 * adjustments. Output: ranked, explained colour recommendations. The same input always produces
 * the same palette, which keeps results reproducible, testable and independent of any AI provider.
 *
 * This encodes common colour-analysis heuristics (harmonise temperature, match depth to the
 * person's natural depth, widen the range for high contrast, match chroma to clarity). They are
 * styling conventions, not science — the UI says so.
 */

export interface PaletteParams {
  lean: number; // -1 cool … +1 warm
  depth: number; // 0 light … 1 deep
  contrast: number; // 0 … 1
  chroma: number; // 0 soft … 1 clear
}

export interface PaletteOutput {
  title: string;
  headline: string;
  styleStatement: string;
  recommendedColors: ColorRecommendation[];
  neutralColors: ColorRecommendation[];
  experimentalColors: ColorRecommendation[];
  combinations: ColorCombination[];
  heroFamily: ColorFamily;
}

const clamp = (v: number, min = -1, max = 1) => Math.min(max, Math.max(min, v));
export const NO_ADJUSTMENTS: AnalysisAdjustments = { warmth: 0, depth: 0 };

export function paramsFrom(c: VisibleCharacteristics, adj: AnalysisAdjustments = NO_ADJUSTMENTS): PaletteParams {
  return {
    lean: clamp(c.undertone.lean + adj.warmth * 0.5),
    depth: clamp(c.depth.value + adj.depth * 0.25, 0, 1),
    contrast: clamp(c.contrast.value, 0, 1),
    chroma: clamp(c.chroma.value, 0, 1),
  };
}

interface Fit {
  color: LibraryColor;
  total: number;
  tempFit: number;
  depthFit: number;
  chromaFit: number;
}

export function scoreColor(color: LibraryColor, p: PaletteParams): Fit {
  const target = p.lean * 0.9;
  // Going further in the *same* direction (a very cool blue for a cool lean) is penalised far
  // less than crossing to the other side.
  const sameSideBeyond = Math.sign(color.temperature) === Math.sign(target) && Math.abs(color.temperature) > Math.abs(target);
  const tempDiff = Math.abs(color.temperature - target) * (sameSideBeyond ? 0.35 : 1);
  const tempFit = 1 - tempDiff / 2;
  // Smooth falloff around the person's own depth; higher contrast widens what still works.
  const targetDepth = 0.25 + 0.55 * p.depth;
  const spread = 0.45 + 0.35 * p.contrast;
  const depthFit = Math.max(0, 1 - (Math.abs(color.depth - targetDepth) / spread) ** 2);
  const targetChroma = 0.25 + 0.55 * p.chroma;
  const chromaFit = 1 - Math.abs(color.chroma - targetChroma);
  const total = 0.5 * tempFit + 0.3 * depthFit + 0.2 * chromaFit;
  return { color, total, tempFit, depthFit, chromaFit };
}

const byScore = (a: Fit, b: Fit) => b.total - a.total || a.color.id.localeCompare(b.color.id);

/** Greedy diverse pick: skips near-duplicates (ΔE2000 < minDelta) and caps per-family counts. */
function pickDiverse(fits: Fit[], count: number, opts: { minDelta?: number; familyCap?: (f: ColorFamily) => number; exclude?: Set<string> } = {}) {
  const { minDelta = 10, familyCap = () => 3, exclude = new Set<string>() } = opts;
  const chosen: Fit[] = [];
  const perFamily = new Map<ColorFamily, number>();
  for (const fit of fits) {
    if (chosen.length >= count) break;
    if (exclude.has(fit.color.id)) continue;
    const famCount = perFamily.get(fit.color.family) ?? 0;
    if (famCount >= familyCap(fit.color.family)) continue;
    if (chosen.some((c) => deltaEHex(c.color.hex, fit.color.hex) < minDelta)) continue;
    chosen.push(fit);
    perFamily.set(fit.color.family, famCount + 1);
  }
  return chosen;
}

const NEAR_FACE: GarmentCategory[] = ['shirt', 'tee', 'knit', 'dress', 'jacket', 'coat'];

function reasonFor(fit: Fit, p: PaletteParams, role: ColorRecommendation['role']): string {
  const { color } = fit;
  const phrases: { weight: number; text: string }[] = [];

  if (p.lean < -0.2 && color.temperature < 0) {
    phrases.push({ weight: fit.tempFit, text: 'Its cool base echoes the cool lean we estimated in your coloring' });
  } else if (p.lean > 0.2 && color.temperature > 0) {
    phrases.push({ weight: fit.tempFit, text: 'Its warm base echoes the warm lean we estimated in your coloring' });
  } else if (Math.abs(color.temperature) < 0.35 && Math.abs(p.lean) <= 0.35) {
    phrases.push({ weight: fit.tempFit, text: 'It sits close to neutral, like the balanced undertone we estimated' });
  }

  if (color.depth > 0.6 && p.depth > 0.5) {
    phrases.push({ weight: fit.depthFit, text: 'deep enough to match the natural depth in your photo' });
  } else if (color.depth < 0.35 && p.depth < 0.5) {
    phrases.push({ weight: fit.depthFit, text: 'light enough to keep the look luminous against your coloring' });
  } else if (p.contrast > 0.6 && (color.depth > 0.7 || color.depth < 0.25)) {
    phrases.push({ weight: fit.depthFit, text: 'your contrast can carry this much light–dark punch' });
  } else {
    phrases.push({ weight: fit.depthFit * 0.9, text: 'its mid depth harmonises without overpowering you' });
  }

  if (color.chroma > 0.55 && p.chroma > 0.5) {
    phrases.push({ weight: fit.chromaFit, text: 'clear and saturated, mirroring the clarity in your features' });
  } else if (color.chroma < 0.35 && p.chroma < 0.5) {
    phrases.push({ weight: fit.chromaFit, text: 'softly muted, so it flatters rather than shouts' });
  }

  const top = phrases.sort((a, b) => b.weight - a.weight).slice(0, 2).map((x) => x.text);
  const sentence = top.length === 2 ? `${top[0]} — ${top[1]}.` : `${top[0] ?? 'A versatile shade for your palette'}.`;
  const capitalised = sentence.charAt(0).toUpperCase() + sentence.slice(1);

  if (role === 'neutral') return `${capitalised} A base for trousers, outerwear and shoes.`;
  if (role === 'accent') return `${capitalised} Use it as a highlight — a knit, scarf or bag.`;
  return capitalised;
}

const GARMENT_WORDS: Partial<Record<GarmentCategory, string>> = {
  trousers: 'trousers',
  jeans: 'jeans',
  skirt: 'a skirt',
  shoes: 'shoes',
  accessory: 'a bag or scarf',
};

function experimentalReason(fit: Fit, p: PaletteParams): string {
  const { color } = fit;
  const weakest = [
    { k: 'temp', v: fit.tempFit },
    { k: 'depth', v: fit.depthFit },
    { k: 'chroma', v: fit.chromaFit },
  ].sort((a, b) => a.v - b.v)[0]?.k;
  const lean = undertoneLabel(p.lean).replace('-', ' ');
  let why = `${color.name} sits at the edge of your estimated range`;
  if (weakest === 'temp') {
    why = color.temperature > p.lean ? `${color.name} runs warmer than the ${lean} lean we estimated` : `${color.name} runs cooler than the ${lean} lean we estimated`;
  } else if (weakest === 'depth') {
    why = color.depth > 0.25 + 0.55 * p.depth ? `${color.name} is deeper than your natural depth` : `${color.name} is lighter than your natural depth`;
  } else if (weakest === 'chroma') {
    why = color.chroma > 0.25 + 0.55 * p.chroma ? `${color.name} is brighter than the clarity in your photo` : `${color.name} is softer than the clarity in your photo`;
  }
  const away = color.garments.map((g) => GARMENT_WORDS[g]).filter((w): w is string => Boolean(w));
  const suggestion = away.length ? `Try it as ${away.slice(0, 2).join(' or ')}` : 'Try it in a small accessory';
  return `${why}. ${suggestion}, with a core colour near your face.`;
}

function garmentsFor(color: LibraryColor, role: ColorRecommendation['role']): GarmentCategory[] {
  if (role === 'experimental') {
    const away = color.garments.filter((g) => !NEAR_FACE.includes(g));
    return away.length ? away : ['accessory'];
  }
  if (role === 'neutral') return color.garments.filter((g) => g !== 'tee' || color.depth < 0.2).slice(0, 4);
  const near = color.garments.filter((g) => NEAR_FACE.includes(g));
  return (near.length ? near : color.garments).slice(0, 4);
}

function pairingsFor(fit: Fit, neutrals: Fit[], core: Fit[]): string[] {
  const contrasting = [...neutrals]
    .sort((a, b) => Math.abs(b.color.depth - fit.color.depth) - Math.abs(a.color.depth - fit.color.depth) || a.color.id.localeCompare(b.color.id))
    .slice(0, 2)
    .map((n) => n.color.hex);
  const companion = core
    .filter((c) => c.color.id !== fit.color.id)
    .sort((a, b) => deltaEHex(a.color.hex, fit.color.hex) - deltaEHex(b.color.hex, fit.color.hex) || a.color.id.localeCompare(b.color.id))
    .find((c) => deltaEHex(c.color.hex, fit.color.hex) > 12);
  return companion ? [...contrasting, companion.color.hex] : contrasting;
}

function toRecommendation(fit: Fit, role: ColorRecommendation['role'], p: PaletteParams, neutrals: Fit[], core: Fit[]): ColorRecommendation {
  return {
    id: fit.color.id,
    name: fit.color.name,
    hex: fit.color.hex,
    role,
    garments: garmentsFor(fit.color, role),
    reason: role === 'experimental' ? experimentalReason(fit, p) : reasonFor(fit, p, role),
    pairings: role === 'experimental' ? pairingsFor(fit, neutrals, core).slice(0, 2) : pairingsFor(fit, neutrals, core),
  };
}

// ── Labels ──────────────────────────────────────────────────────────────────────────────────────

export function undertoneLabel(lean: number): UndertoneLean {
  if (lean <= -0.45) return 'cool';
  if (lean <= -0.15) return 'neutral-cool';
  if (lean < 0.15) return 'neutral';
  if (lean < 0.45) return 'neutral-warm';
  return 'warm';
}

export function depthLabel(value: number): DepthEstimate {
  if (value < 0.2) return 'light';
  if (value < 0.4) return 'light-medium';
  if (value < 0.6) return 'medium';
  if (value < 0.8) return 'medium-deep';
  return 'deep';
}

export function contrastLabel(value: number): ContrastEstimate {
  if (value < 0.35) return 'low';
  if (value < 0.65) return 'medium';
  return 'high';
}

export function chromaLabel(value: number): ChromaEstimate {
  if (value < 0.35) return 'soft';
  if (value < 0.65) return 'balanced';
  return 'clear';
}

const DEPTH_ADJ: Record<DepthEstimate, string> = {
  light: 'Light',
  'light-medium': 'Airy',
  medium: 'Mid-tone',
  'medium-deep': 'Rich',
  deep: 'Deep',
};

const TEMP_ADJ: Record<UndertoneLean, string> = {
  cool: 'cool',
  'neutral-cool': 'cool-leaning',
  neutral: 'balanced',
  'neutral-warm': 'warm-leaning',
  warm: 'warm',
};

const STATEMENTS: Record<ColorFamily, string> = {
  blue: 'Blue isn’t a trend for you — it’s your signature.',
  green: 'Green grounds you — calm, rich and quietly confident.',
  red: 'Red is your power colour. Wear it like you mean it.',
  pink: 'Rose tones bring life to your face — let them lead.',
  purple: 'Plum and violet give you depth with a creative edge.',
  yellow: 'Golden tones light you up — keep them close to your face.',
  orange: 'Terracotta and coral bring out your natural glow.',
  brown: 'Earth tones are your quiet luxury.',
  neutral: 'Your neutrals do the heavy lifting — elegant, every day.',
};

function neutralAdjective(neutrals: Fit[]) {
  const avg = neutrals.reduce((s, n) => s + n.color.temperature, 0) / Math.max(1, neutrals.length);
  if (avg < -0.05) return 'crisp';
  if (avg > 0.25) return 'warm';
  return 'balanced';
}

// ── Combinations ───────────────────────────────────────────────────────────────────────────────

function buildCombinations(core: Fit[], accents: Fit[], neutrals: Fit[], hero: ColorFamily): ColorCombination[] {
  const combos: ColorCombination[] = [];
  const light = [...neutrals].sort((a, b) => a.color.depth - b.color.depth)[0];
  const dark = [...neutrals].sort((a, b) => b.color.depth - a.color.depth)[0];
  const mid = [...neutrals].sort((a, b) => Math.abs(a.color.depth - 0.45) - Math.abs(b.color.depth - 0.45))[0];

  const heroCore = core.filter((c) => c.color.family === hero);
  if (heroCore.length >= 2) {
    const sorted = [...heroCore].sort((a, b) => b.color.depth - a.color.depth);
    const deepest = sorted[0] as Fit;
    const lightest = sorted[sorted.length - 1] as Fit;
    combos.push({
      id: `tonal-${deepest.color.id}-${lightest.color.id}`,
      name: `Tonal ${FAMILY_LABELS[hero].plural}`,
      hexes: [deepest.color.hex, lightest.color.hex, ...(light ? [light.color.hex] : [])],
      note: `${deepest.color.name} with ${lightest.color.name}: one family, two depths. Polished without trying.`,
    });
  }
  const [c0, c1] = core;
  if (c0 && light) {
    combos.push({
      id: `classic-${c0.color.id}-${light.color.id}`,
      name: `${c0.color.name} & ${light.color.name}`,
      hexes: [c0.color.hex, light.color.hex, ...(dark ? [dark.color.hex] : [])],
      note: `A clean, high-contrast base. ${c0.color.name} near your face, ${light.color.name.toLowerCase()} below.`,
    });
  }
  const a0 = accents[0];
  if (c1 && a0 && dark) {
    combos.push({
      id: `lift-${c1.color.id}-${a0.color.id}`,
      name: 'Accent lift',
      hexes: [c1.color.hex, a0.color.hex, dark.color.hex],
      note: `${c1.color.name} as the anchor with a flash of ${a0.color.name.toLowerCase()} — a scarf, bag or knit.`,
    });
  }
  if (mid && dark && c0) {
    combos.push({
      id: `quiet-${mid.color.id}-${dark.color.id}`,
      name: 'Quiet neutrals',
      hexes: [mid.color.hex, dark.color.hex, c0.color.hex],
      note: `${mid.color.name} and ${dark.color.name.toLowerCase()} with a touch of ${c0.color.name.toLowerCase()} — easy for every day.`,
    });
  }
  return combos;
}

/**
 * The palette's "story" family: the family whose three best colours score highest on average.
 * A story needs depth, so one lucky outlier cannot decide it; families with fewer than three
 * members count missing slots as zero.
 */
function heroFamilyOf(colorFits: Fit[]): ColorFamily {
  const byFamily = new Map<ColorFamily, number[]>();
  for (const f of colorFits) {
    const list = byFamily.get(f.color.family) ?? [];
    if (list.length < 3) list.push(f.total);
    byFamily.set(f.color.family, list);
  }
  let best: ColorFamily = 'blue';
  let bestScore = -Infinity;
  for (const [family, scores] of [...byFamily.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const mean = scores.reduce((a, b) => a + b, 0) / 3;
    if (mean > bestScore) {
      bestScore = mean;
      best = family;
    }
  }
  return best;
}

// ── Public API ─────────────────────────────────────────────────────────────────────────────────

export function buildPalette(characteristics: VisibleCharacteristics, adjustments: AnalysisAdjustments = NO_ADJUSTMENTS): PaletteOutput {
  const p = paramsFrom(characteristics, adjustments);
  // `dark-denim` exists for jeans in outfits; it is not offered as a palette neutral.
  const pool = COLOR_LIBRARY.filter((c) => c.id !== 'dark-denim');
  const fits = pool.map((c) => scoreColor(c, p)).sort(byScore);
  const colorFits = fits.filter((f) => !f.color.isNeutral);
  const neutralFits = fits.filter((f) => f.color.isNeutral);

  const hero = heroFamilyOf(colorFits);
  // Hero-family colours lead the story; within each group, best score first.
  const core = pickDiverse(colorFits, 6, { familyCap: (f) => (f === hero ? 5 : 2) }).sort(
    (a, b) => Number(b.color.family === hero) - Number(a.color.family === hero) || byScore(a, b),
  );
  const used = new Set(core.map((c) => c.color.id));
  const accents = pickDiverse(
    colorFits.filter((f) => !core.some((c) => c.color.family === f.color.family)),
    2,
    { familyCap: () => 1, exclude: used },
  );
  accents.forEach((a) => used.add(a.color.id));

  // Neutrals: guarantee a light, a dark and a mid option when the library allows.
  const lightN = neutralFits.filter((n) => n.color.depth < 0.25);
  const darkN = neutralFits.filter((n) => n.color.depth > 0.6);
  const seeded = [lightN[0], darkN[0]].filter((x): x is Fit => Boolean(x));
  const rest = pickDiverse(neutralFits, 6, { minDelta: 8, familyCap: () => 6, exclude: new Set(seeded.map((s) => s.color.id)) });
  const neutrals = [...seeded, ...rest].slice(0, 4);

  // Experimental: middle-of-the-range colours from other families, never the bottom of the list.
  const midBand = colorFits.filter((f) => !used.has(f.color.id) && f.total >= 0.45 && f.total < 0.72);
  const experimental = pickDiverse(midBand.length >= 3 ? midBand : colorFits.filter((f) => !used.has(f.color.id)), 3, {
    familyCap: () => 1,
  });

  const depthEst = depthLabel(p.depth);
  const tempEst = undertoneLabel(p.lean);
  const headline = `${DEPTH_ADJ[depthEst]}, ${TEMP_ADJ[tempEst]} ${FAMILY_LABELS[hero].plural} and ${neutralAdjective(neutrals)} neutrals`;

  return {
    title: 'Your Color Story',
    headline,
    styleStatement: STATEMENTS[hero],
    heroFamily: hero,
    recommendedColors: [
      ...core.map((f) => toRecommendation(f, 'core', p, neutrals, core)),
      ...accents.map((f) => toRecommendation(f, 'accent', p, neutrals, core)),
    ],
    neutralColors: neutrals.map((f) => toRecommendation(f, 'neutral', p, neutrals, core)),
    experimentalColors: experimental.map((f) => toRecommendation(f, 'experimental', p, neutrals, core)),
    combinations: buildCombinations(core, accents, neutrals, hero),
  };
}

/** Builds characteristics with labels from raw 0–1 / -1–1 values. */
export function characteristicsFrom(values: { lean: number; depth: number; contrast: number; chroma: number; sampledHex?: string | null }): VisibleCharacteristics {
  return {
    undertone: { estimate: undertoneLabel(values.lean), lean: clamp(values.lean) },
    depth: { estimate: depthLabel(values.depth), value: clamp(values.depth, 0, 1) },
    contrast: { estimate: contrastLabel(values.contrast), value: clamp(values.contrast, 0, 1) },
    chroma: { estimate: chromaLabel(values.chroma), value: clamp(values.chroma, 0, 1) },
    sampledHex: values.sampledHex ?? null,
  };
}
