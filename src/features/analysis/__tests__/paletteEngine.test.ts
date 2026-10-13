import { COLOR_LIBRARY } from '@/features/colors/colorLibrary';
import { deltaEHex, hexToLab } from '@/utils/color';

import { adjustResult } from '../adjustResult';
import {
  buildPalette,
  characteristicsFrom,
  chromaLabel,
  contrastLabel,
  depthLabel,
  undertoneLabel,
} from '../paletteEngine';
import { createDemoAnalysisResult } from '@/mocks/demoAnalysis';

const coolDeep = characteristicsFrom({ lean: -0.55, depth: 0.72, contrast: 0.7, chroma: 0.5 });
const warmMid = characteristicsFrom({ lean: 0.6, depth: 0.5, contrast: 0.4, chroma: 0.4 });
const lightSoft = characteristicsFrom({ lean: 0, depth: 0.15, contrast: 0.25, chroma: 0.25 });

describe('labels', () => {
  it('buckets estimates consistently', () => {
    expect(undertoneLabel(-0.8)).toBe('cool');
    expect(undertoneLabel(-0.2)).toBe('neutral-cool');
    expect(undertoneLabel(0)).toBe('neutral');
    expect(undertoneLabel(0.3)).toBe('neutral-warm');
    expect(undertoneLabel(0.9)).toBe('warm');
    expect(depthLabel(0.1)).toBe('light');
    expect(depthLabel(0.9)).toBe('deep');
    expect(contrastLabel(0.7)).toBe('high');
    expect(chromaLabel(0.2)).toBe('soft');
  });

  it('clamps out-of-range inputs', () => {
    const c = characteristicsFrom({ lean: -4, depth: 2, contrast: -1, chroma: 9 });
    expect(c.undertone.lean).toBe(-1);
    expect(c.depth.value).toBe(1);
    expect(c.contrast.value).toBe(0);
    expect(c.chroma.value).toBe(1);
  });
});

describe('buildPalette', () => {
  it('is deterministic for the same input', () => {
    expect(buildPalette(coolDeep)).toEqual(buildPalette(coolDeep));
  });

  it('builds a blue story for deep, cool colouring (the reference style guide)', () => {
    const p = buildPalette(coolDeep);
    expect(p.heroFamily).toBe('blue');
    expect(p.headline).toMatch(/cool blues/);
    const names = p.recommendedColors.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['Navy Blue', 'Denim Blue', 'Petrol Blue']));
  });

  it('leans warm for warm colouring', () => {
    const p = buildPalette(warmMid);
    const avgWarmth = p.recommendedColors.filter((c) => c.role === 'core').reduce((s, c) => s + hexToLab(c.hex).b, 0) / 6;
    expect(avgWarmth).toBeGreaterThan(10); // yellow-based on average
    expect(p.headline).toMatch(/warm/);
  });

  it('returns 6 core + 2 accent colours, 4 neutrals and up to 3 experimental', () => {
    const p = buildPalette(lightSoft);
    expect(p.recommendedColors.filter((c) => c.role === 'core')).toHaveLength(6);
    expect(p.recommendedColors.filter((c) => c.role === 'accent')).toHaveLength(2);
    expect(p.neutralColors).toHaveLength(4);
    expect(p.experimentalColors.length).toBeGreaterThan(0);
    expect(p.experimentalColors.length).toBeLessThanOrEqual(3);
  });

  it('never repeats a colour across sections or includes near-duplicates in core', () => {
    const p = buildPalette(coolDeep);
    const ids = [...p.recommendedColors, ...p.neutralColors, ...p.experimentalColors].map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const core = p.recommendedColors;
    for (let i = 0; i < core.length; i++) {
      for (let j = i + 1; j < core.length; j++) {
        expect(deltaEHex(core[i]!.hex, core[j]!.hex)).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('always offers a light and a dark neutral', () => {
    for (const c of [coolDeep, warmMid, lightSoft]) {
      const Ls = buildPalette(c).neutralColors.map((n) => hexToLab(n.hex).L);
      expect(Math.max(...Ls)).toBeGreaterThan(75);
      expect(Math.min(...Ls)).toBeLessThan(40);
    }
  });

  it('explains every recommendation and suggests wearing experimental colours away from the face', () => {
    const p = buildPalette(coolDeep);
    for (const c of [...p.recommendedColors, ...p.neutralColors, ...p.experimentalColors]) {
      expect(c.reason.length).toBeGreaterThan(20);
    }
    for (const x of p.experimentalColors) {
      expect(x.reason).toMatch(/core colour near your face/);
      expect(x.garments.some((g) => ['shirt', 'tee', 'knit', 'dress'].includes(g))).toBe(false);
    }
  });

  it('only recommends colours from the curated library', () => {
    const libraryHexes = new Set(COLOR_LIBRARY.map((c) => c.hex));
    for (const c of buildPalette(warmMid).recommendedColors) expect(libraryHexes.has(c.hex)).toBe(true);
  });

  it('produces combinations made of palette colours', () => {
    const p = buildPalette(coolDeep);
    const all = new Set([...p.recommendedColors, ...p.neutralColors].map((c) => c.hex));
    expect(p.combinations.length).toBeGreaterThanOrEqual(3);
    for (const combo of p.combinations) for (const hex of combo.hexes) expect(all.has(hex)).toBe(true);
  });
});

describe('user adjustments', () => {
  it('shifts the palette warmer without touching the original estimate', () => {
    const result = createDemoAnalysisResult({ createdAt: '2026-01-01T00:00:00.000Z' });
    const warmer = adjustResult(result, { warmth: 1, depth: 0 });
    expect(warmer.characteristics).toEqual(result.characteristics);
    expect(warmer.adjustments).toEqual({ warmth: 1, depth: 0 });
    const warmthOf = (r: typeof result) => r.recommendedColors.reduce((s, c) => s + hexToLab(c.hex).b, 0);
    expect(warmthOf(warmer)).toBeGreaterThan(warmthOf(result));
  });

  it('returns to the estimate when adjustments are reset', () => {
    const result = createDemoAnalysisResult({ createdAt: '2026-01-01T00:00:00.000Z' });
    const back = adjustResult(adjustResult(result, { warmth: -1, depth: 1 }), { warmth: 0, depth: 0 });
    expect(back.recommendedColors).toEqual(result.recommendedColors);
  });
});
