import { findLibraryColorByHex, getLibraryColor } from '@/features/colors/colorLibrary';
import type { ColorAnalysisResult, ColorRecommendation, GarmentCategory } from '@/types/domain';
import type { Outfit, OutfitPiece, OutfitTemplate, PairingStrategy } from '@/types/outfits';
import { deltaEHex, hexToLab } from '@/utils/color';

import { OUTFIT_TEMPLATES, TEMPLATE_BY_ID } from './outfitTemplates';

/**
 * Deterministic outfit recommendation engine — no AI required.
 *
 *   outfit = template × palette colour
 *
 * The main slot takes a recommended colour; supporting slots are filled from the person's own
 * neutrals using pairing strategies. Scores combine the colour's role (core > accent >
 * experimental), how naturally that garment comes in the colour, and light/dark balance.
 */

type PaletteSource = Pick<ColorAnalysisResult, 'recommendedColors' | 'neutralColors' | 'experimentalColors' | 'characteristics'>;

interface Swatch {
  name: string;
  hex: string;
}

const STAPLES = {
  white: { name: 'Soft White', hex: '#F4F1EA' },
  denim: { name: 'Dark Indigo Denim', hex: '#243552' },
  grey: { name: 'Pebble Grey', hex: '#A9ABAE' },
  dark: { name: 'Charcoal', hex: '#32363D' },
  light: { name: 'Stone', hex: '#CFC8BC' },
  tan: { name: 'Tan', hex: '#C8A27A' },
} as const;

const ROLE_WEIGHT: Record<ColorRecommendation['role'], number> = { core: 1, accent: 0.82, neutral: 0.6, experimental: 0.55 };

const lightness = (hex: string) => hexToLab(hex).L;
const warmth = (hex: string) => hexToLab(hex).b;

function pickNeutral(strategy: PairingStrategy, neutrals: Swatch[], mainHex: string): Swatch {
  const byLight = [...neutrals].sort((a, b) => lightness(b.hex) - lightness(a.hex) || a.hex.localeCompare(b.hex));
  switch (strategy) {
    case 'white': {
      const white = neutrals.find((n) => lightness(n.hex) > 90);
      return white ?? STAPLES.white;
    }
    case 'denim':
      return STAPLES.denim;
    case 'grey': {
      const grey = neutrals.find((n) => {
        const lab = hexToLab(n.hex);
        return Math.abs(lab.a) < 4 && Math.abs(lab.b) < 9 && lab.L > 45 && lab.L < 80;
      });
      return grey ?? STAPLES.grey;
    }
    case 'light-neutral': {
      // Lightest neutral that isn't a pure white (white trousers are a niche choice).
      const candidate = byLight.find((n) => lightness(n.hex) <= 92 && lightness(n.hex) > 60);
      return candidate ?? STAPLES.light;
    }
    case 'dark-neutral':
      return byLight.length && lightness(byLight[byLight.length - 1]!.hex) < 35 ? byLight[byLight.length - 1]! : STAPLES.dark;
    case 'warm-neutral': {
      const warm = [...neutrals].filter((n) => lightness(n.hex) < 92).sort((a, b) => warmth(b.hex) - warmth(a.hex))[0];
      return warm && warmth(warm.hex) > 10 ? warm : STAPLES.tan;
    }
    case 'contrast-neutral': {
      const mainL = lightness(mainHex);
      const best = [...neutrals].sort((a, b) => Math.abs(lightness(b.hex) - mainL) - Math.abs(lightness(a.hex) - mainL) || a.hex.localeCompare(b.hex))[0];
      return best ?? STAPLES.light;
    }
    default:
      return STAPLES.light;
  }
}

function garmentFit(colorId: string, hex: string, garment: GarmentCategory) {
  const lib = getLibraryColor(colorId) ?? findLibraryColorByHex(hex);
  if (!lib) return 0.8;
  return lib.garments.includes(garment) ? 1 : 0.72;
}

function accessoriesFor(lean: number, outfit: { pieces: OutfitPiece[]; template: OutfitTemplate }, accent?: Swatch) {
  const metal = lean < -0.15 ? 'Silver or white-gold jewellery' : lean > 0.15 ? 'Gold or brass jewellery' : 'Mixed-metal jewellery';
  const items = [metal];
  const shoes = outfit.pieces.find((p) => p.role === 'shoes');
  if (shoes) items.push(`${shoes.colorName} ${shoes.label.toLowerCase()}`);
  if (accent) items.push(`${accent.name} bag or scarf`);
  if (outfit.template.id === 'city-coat') items.push('Leather gloves in a dark neutral');
  return items;
}

function reasonFor(color: ColorRecommendation, template: OutfitTemplate): string {
  const main = template.slots.find((s) => s.role === 'main');
  const nearFace = main && ['shirt', 'tee', 'knit', 'jacket', 'coat', 'dress'].includes(main.garment);
  const base = color.reason.split(' — ')[0]?.replace(/\.$/, '') ?? color.reason;
  if (color.role === 'experimental') {
    return `${color.name} works best away from your face, so the ${main?.label.toLowerCase() ?? 'statement piece'} carries it while a neutral sits near your face.`;
  }
  return nearFace
    ? `${base}. As a ${main?.label.toLowerCase()} it sits right next to your face, where colour does the most work.`
    : `${base}. Worn below the waist it adds colour without competing with your face.`;
}

export function buildOutfit(template: OutfitTemplate, color: ColorRecommendation, source: PaletteSource): Outfit {
  const neutrals: Swatch[] = source.neutralColors.map((n) => ({ name: n.name, hex: n.hex }));
  const pieces: OutfitPiece[] = template.slots.map((slot) => {
    if (slot.role === 'main') return { garment: slot.garment, role: slot.role, label: slot.label, colorName: color.name, hex: color.hex };
    const swatch = pickNeutral(slot.strategy ?? 'light-neutral', neutrals, color.hex);
    return { garment: slot.garment, role: slot.role, label: slot.label, colorName: swatch.name, hex: swatch.hex };
  });

  const mainSlot = template.slots.find((s) => s.role === 'main');
  const visible = pieces.filter((p) => p.role !== 'shoes');
  const name = visible
    .sort((a, b) => Number(b.role === 'main') - Number(a.role === 'main'))
    .map((p) => `${p.colorName} ${p.label}`)
    .join(' + ');

  // Balance: reward a light/dark spread between the main colour and its supporting pieces.
  const supportL = visible.filter((p) => p.role !== 'main').map((p) => lightness(p.hex));
  const spread = supportL.length ? Math.max(...supportL.map((l) => Math.abs(l - lightness(color.hex)))) / 100 : 0.3;
  const balance = Math.min(1, 0.6 + spread);
  const fit = mainSlot ? garmentFit(color.id, color.hex, mainSlot.garment) : 0.8;
  const score = Number((ROLE_WEIGHT[color.role] * fit * balance).toFixed(4));

  const accent = source.recommendedColors.find((c) => c.role === 'accent' && c.hex !== color.hex);
  return {
    id: `${template.id}--${color.id}`,
    templateId: template.id,
    name,
    category: template.category,
    mainColor: { id: color.id, name: color.name, hex: color.hex },
    pieces,
    complementaryHexes: color.pairings,
    occasions: template.occasions,
    accessories: accessoriesFor(source.characteristics.undertone.lean, { pieces, template }, accent),
    reason: reasonFor(color, template),
    combinations: [],
    tryOnCategory: template.tryOnCategory,
    garmentDescription: template.garmentDescription,
    score,
  };
}

function eligible(template: OutfitTemplate, color: ColorRecommendation) {
  if (color.role === 'neutral') return false;
  if (!template.mainRoles.includes(color.role)) return false;
  const main = template.slots.find((s) => s.role === 'main');
  if (!main) return false;
  const lib = getLibraryColor(color.id) ?? findLibraryColorByHex(color.hex);
  // Dresses and coats only in colours that genuinely come in those garments.
  if ((main.garment === 'dress' || main.garment === 'coat') && lib && !lib.garments.includes(main.garment)) return false;
  return true;
}

/** Every outfit possible for one colour, best first. */
export function outfitsForColor(color: ColorRecommendation, source: PaletteSource): Outfit[] {
  const outfits = OUTFIT_TEMPLATES.filter((t) => eligible(t, color)).map((t) => buildOutfit(t, color, source));
  outfits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  // Cross-link alternatives so details screens can suggest "also try…".
  return outfits.map((o) => ({ ...o, combinations: outfits.filter((x) => x.id !== o.id).slice(0, 3).map((x) => x.name) }));
}

export interface RecommendOptions {
  /** Restrict to outfits built around (or pairing with) this colour. */
  selectedHex?: string | null;
  limit?: number;
  includeExperimental?: boolean;
}

/**
 * Ranked, diverse outfit list for a palette. Results are interleaved round-robin across colours
 * so the gallery doesn't show five navy outfits in a row.
 */
export function recommendOutfits(source: PaletteSource, options: RecommendOptions = {}): Outfit[] {
  const { selectedHex, limit = 12, includeExperimental = true } = options;
  const colors = [...source.recommendedColors, ...(includeExperimental ? source.experimentalColors : [])];

  const focus = selectedHex ? colors.filter((c) => deltaEHex(c.hex, selectedHex) < 3) : colors;
  const perColor = focus.map((c) => outfitsForColor(c, source));

  const result: Outfit[] = [];
  for (let round = 0; result.length < limit; round++) {
    let added = false;
    for (const list of perColor) {
      const outfit = list[round];
      if (outfit && result.length < limit) {
        result.push(outfit);
        added = true;
      }
    }
    if (!added) break;
  }

  if (selectedHex && result.length < limit) {
    // Also surface outfits where the selected colour appears as a supporting piece.
    const extra = colors
      .flatMap((c) => outfitsForColor(c, source))
      .filter((o) => !result.some((r) => r.id === o.id) && o.pieces.some((p) => deltaEHex(p.hex, selectedHex) < 3));
    result.push(...extra.slice(0, limit - result.length));
  }
  return result;
}

/** Rebuilds a single outfit from its deterministic ID (`templateId--colorId`). */
export function findOutfit(source: PaletteSource, outfitId: string): Outfit | null {
  const [templateId, colorId] = outfitId.split('--');
  const template = templateId ? TEMPLATE_BY_ID.get(templateId) : undefined;
  const color = [...source.recommendedColors, ...source.experimentalColors].find((c) => c.id === colorId);
  if (!template || !color) return null;
  return outfitsForColor(color, source).find((o) => o.id === outfitId) ?? buildOutfit(template, color, source);
}
