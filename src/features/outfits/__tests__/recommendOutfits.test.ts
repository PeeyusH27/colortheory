import { createDemoAnalysisResult } from '@/mocks/demoAnalysis';
import { deltaEHex, hexToLab } from '@/utils/color';

import { OUTFIT_TEMPLATES } from '../outfitTemplates';
import { buildOutfit, findOutfit, outfitsForColor, recommendOutfits } from '../recommendOutfits';

const result = createDemoAnalysisResult({ createdAt: '2026-01-01T00:00:00.000Z' });
const navy = result.recommendedColors.find((c) => c.id === 'navy');

describe('recommendOutfits', () => {
  it('is deterministic', () => {
    expect(recommendOutfits(result)).toEqual(recommendOutfits(result));
  });

  it('respects the limit and produces unique, stable ids', () => {
    const list = recommendOutfits(result, { limit: 7 });
    expect(list).toHaveLength(7);
    expect(new Set(list.map((o) => o.id)).size).toBe(7);
    for (const o of list) expect(o.id).toMatch(/^[a-z0-9-]+--[a-z0-9-]+$/);
  });

  it('interleaves colours so the first looks are all different colours', () => {
    const list = recommendOutfits(result, { limit: 6, includeExperimental: false });
    expect(new Set(list.map((o) => o.mainColor.id)).size).toBe(6);
  });

  it('filters to a selected swatch', () => {
    const selected = result.recommendedColors[1]!;
    const list = recommendOutfits(result, { selectedHex: selected.hex, limit: 20 });
    expect(list.length).toBeGreaterThan(0);
    for (const o of list) {
      const usesColour = o.mainColor.hex === selected.hex || o.pieces.some((p) => deltaEHex(p.hex, selected.hex) < 3);
      expect(usesColour).toBe(true);
    }
  });

  it('keeps experimental colours away from the face', () => {
    for (const x of result.experimentalColors) {
      for (const o of outfitsForColor(x, result)) {
        const main = o.pieces.find((p) => p.role === 'main');
        expect(['trousers', 'skirt']).toContain(main?.garment);
      }
    }
  });

  it('fills supporting pieces from the person’s own neutrals (or wardrobe staples)', () => {
    const neutralHexes = new Set(result.neutralColors.map((n) => n.hex));
    const staples = new Set(['#F4F1EA', '#243552', '#A9ABAE', '#32363D', '#CFC8BC', '#C8A27A']);
    for (const o of recommendOutfits(result, { limit: 12 })) {
      for (const p of o.pieces.filter((x) => x.role !== 'main')) {
        expect(neutralHexes.has(p.hex) || staples.has(p.hex)).toBe(true);
      }
    }
  });
});

describe('outfit construction', () => {
  it('builds the reference "navy shirt + light trousers" look', () => {
    const template = OUTFIT_TEMPLATES.find((t) => t.id === 'clean-shirt')!;
    const outfit = buildOutfit(template, navy!, result);
    expect(outfit.name).toMatch(/^Navy Blue Shirt \+ .+ Trousers$/);
    const trousers = outfit.pieces.find((p) => p.garment === 'trousers')!;
    expect(hexToLab(trousers.hex).L).toBeGreaterThan(60); // a light neutral
    expect(outfit.accessories[0]).toMatch(/Silver/); // cool palette → cool metals
    expect(outfit.occasions).toContain('work');
  });

  it('pairs a knit with dark denim for the weekend look', () => {
    const template = OUTFIT_TEMPLATES.find((t) => t.id === 'weekend-knit')!;
    const outfit = buildOutfit(template, navy!, result);
    expect(outfit.pieces.find((p) => p.garment === 'jeans')?.hex).toBe('#243552');
  });

  it('round-trips through findOutfit by id', () => {
    const first = recommendOutfits(result, { limit: 1 })[0]!;
    expect(findOutfit(result, first.id)?.name).toBe(first.name);
    expect(findOutfit(result, 'unknown--navy')).toBeNull();
    expect(findOutfit(result, 'clean-shirt--not-a-colour')).toBeNull();
  });

  it('cross-links alternative looks for the details screen', () => {
    const looks = outfitsForColor(navy!, result);
    expect(looks.length).toBeGreaterThan(2);
    expect(looks[0]!.combinations).not.toContain(looks[0]!.name);
  });
});
