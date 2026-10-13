import type { GarmentCategory } from '@/types/domain';
import { hexToLab, labToLch } from '@/utils/color';

/**
 * The curated colour library the palette engine chooses from. Hand-picked names and hexes;
 * temperature, depth and chroma are *derived from the hex* (CIELAB) so attributes can never drift
 * out of sync with the swatch the user sees.
 */
export type ColorFamily = 'blue' | 'green' | 'red' | 'pink' | 'purple' | 'yellow' | 'orange' | 'brown' | 'neutral';

interface LibrarySeed {
  id: string;
  name: string;
  hex: string;
  family: ColorFamily;
  garments: GarmentCategory[];
  /** Optional manual temperature override where Lab maths misleads (e.g. true red reads warm). */
  temperatureOverride?: number;
}

export interface LibraryColor extends LibrarySeed {
  /** -1 cool … +1 warm. */
  temperature: number;
  /** 0 light … 1 deep. */
  depth: number;
  /** 0 muted … 1 clear. */
  chroma: number;
  isNeutral: boolean;
}

const TOPS: GarmentCategory[] = ['shirt', 'tee', 'knit'];
const OUTER: GarmentCategory[] = ['jacket', 'coat'];
const BOTTOMS: GarmentCategory[] = ['trousers', 'skirt'];

const SEEDS: LibrarySeed[] = [
  // Blues — the backbone of the reference style guide.
  { id: 'navy', name: 'Navy Blue', hex: '#172A46', family: 'blue', garments: [...TOPS, ...OUTER, ...BOTTOMS, 'dress'] },
  { id: 'midnight', name: 'Midnight', hex: '#1B2440', family: 'blue', garments: [...OUTER, 'trousers', 'dress'] },
  { id: 'indigo', name: 'Indigo Blue', hex: '#2E3A87', family: 'blue', garments: [...TOPS, 'jacket', 'jeans'] },
  { id: 'denim', name: 'Denim Blue', hex: '#2E5B89', family: 'blue', garments: ['shirt', 'jacket', 'jeans', 'dress'] },
  { id: 'petrol', name: 'Petrol Blue', hex: '#0F4C5C', family: 'blue', garments: [...TOPS, 'coat', 'dress'] },
  { id: 'cobalt', name: 'Cobalt', hex: '#1F4FB3', family: 'blue', garments: ['knit', 'shirt', 'dress', 'accessory'] },
  { id: 'steel', name: 'Steel Blue', hex: '#4682B4', family: 'blue', garments: ['shirt', 'tee', 'knit', 'jacket'] },
  { id: 'periwinkle', name: 'Periwinkle', hex: '#8C9EDB', family: 'blue', garments: ['shirt', 'knit', 'dress'] },
  { id: 'sky', name: 'Sky Blue', hex: '#A7C7E7', family: 'blue', garments: ['shirt', 'tee', 'knit', 'dress'] },
  { id: 'powder', name: 'Powder Blue', hex: '#C3D5E8', family: 'blue', garments: ['shirt', 'knit'] },
  { id: 'teal', name: 'Teal', hex: '#176B6B', family: 'blue', garments: [...TOPS, 'jacket', 'dress'] },
  { id: 'aqua', name: 'Soft Aqua', hex: '#6FB7B0', family: 'blue', garments: ['tee', 'shirt', 'knit'] },

  // Greens.
  { id: 'emerald', name: 'Emerald', hex: '#0F7A5A', family: 'green', garments: ['knit', 'dress', 'shirt', 'accessory'], temperatureOverride: -0.2 },
  { id: 'forest', name: 'Forest Green', hex: '#24503C', family: 'green', garments: [...OUTER, 'knit', 'trousers'] },
  { id: 'pine', name: 'Pine', hex: '#1F4A44', family: 'green', garments: ['coat', 'knit'] },
  { id: 'sage', name: 'Sage', hex: '#9DB5A0', family: 'green', garments: ['knit', 'shirt', 'trousers'] },
  { id: 'olive', name: 'Olive', hex: '#6B6B2E', family: 'green', garments: ['jacket', 'trousers', 'shirt'] },
  { id: 'mint', name: 'Mint', hex: '#B8DCC8', family: 'green', garments: ['tee', 'shirt', 'knit'] },

  // Reds and pinks.
  { id: 'true-red', name: 'True Red', hex: '#C1272D', family: 'red', garments: ['knit', 'dress', 'accessory'], temperatureOverride: 0.1 },
  { id: 'burgundy', name: 'Burgundy', hex: '#6D1F2F', family: 'red', garments: ['knit', 'coat', 'trousers', 'dress'] },
  { id: 'berry', name: 'Berry', hex: '#8E2A52', family: 'pink', garments: ['knit', 'shirt', 'dress'] },
  { id: 'raspberry', name: 'Raspberry', hex: '#B3245E', family: 'pink', garments: ['knit', 'dress', 'accessory'] },
  { id: 'fuchsia', name: 'Fuchsia', hex: '#C2307A', family: 'pink', garments: ['dress', 'accessory'] },
  { id: 'dusty-rose', name: 'Dusty Rose', hex: '#C99192', family: 'pink', garments: ['knit', 'shirt', 'dress'] },
  { id: 'blush', name: 'Blush', hex: '#F2C1B6', family: 'pink', garments: ['shirt', 'knit'] },
  { id: 'coral', name: 'Coral', hex: '#FF6B4A', family: 'orange', garments: ['tee', 'knit', 'dress', 'accessory'] },
  { id: 'terracotta', name: 'Terracotta', hex: '#C4623E', family: 'orange', garments: ['shirt', 'knit', 'trousers'] },
  { id: 'rust', name: 'Rust', hex: '#A8471E', family: 'orange', garments: ['knit', 'jacket', 'shirt'] },
  { id: 'apricot', name: 'Apricot', hex: '#F2A877', family: 'orange', garments: ['tee', 'shirt'] },

  // Purples.
  { id: 'plum', name: 'Plum', hex: '#5B2A4E', family: 'purple', garments: ['knit', 'coat', 'dress'] },
  { id: 'amethyst', name: 'Amethyst', hex: '#7B5BA6', family: 'purple', garments: ['knit', 'shirt', 'dress'] },
  { id: 'lavender', name: 'Lavender', hex: '#B9A7DB', family: 'purple', garments: ['shirt', 'knit', 'tee'] },

  // Yellows.
  { id: 'mustard', name: 'Mustard', hex: '#C99A2E', family: 'yellow', garments: ['knit', 'accessory'] },
  { id: 'saffron', name: 'Saffron', hex: '#F2B33D', family: 'yellow', garments: ['tee', 'knit', 'accessory'] },
  { id: 'lemon', name: 'Soft Lemon', hex: '#F1E08A', family: 'yellow', garments: ['tee', 'shirt'] },

  // Browns.
  { id: 'chocolate', name: 'Chocolate', hex: '#4E3326', family: 'brown', garments: ['coat', 'knit', 'trousers', 'shoes'] },
  { id: 'cognac', name: 'Cognac', hex: '#8A4B2A', family: 'brown', garments: ['jacket', 'shoes', 'accessory'] },
  { id: 'camel', name: 'Camel', hex: '#C19A6B', family: 'brown', garments: ['coat', 'knit', 'trousers'] },

  // Neutrals.
  { id: 'soft-white', name: 'Soft White', hex: '#F4F1EA', family: 'neutral', garments: ['shirt', 'tee', 'knit', 'trousers'] },
  { id: 'optic-white', name: 'Optic White', hex: '#FFFFFF', family: 'neutral', garments: ['shirt', 'tee', 'shoes'] },
  { id: 'ecru', name: 'Ecru', hex: '#EBE1CB', family: 'neutral', garments: ['tee', 'knit', 'trousers'] },
  { id: 'beige', name: 'Beige', hex: '#D9C3A0', family: 'neutral', garments: ['trousers', 'coat', 'knit'] },
  { id: 'stone', name: 'Stone', hex: '#CFC8BC', family: 'neutral', garments: ['trousers', 'coat', 'knit'] },
  { id: 'tan', name: 'Tan', hex: '#C8A27A', family: 'neutral', garments: ['trousers', 'shoes', 'jacket'] },
  { id: 'taupe', name: 'Taupe', hex: '#8B7D70', family: 'neutral', garments: ['knit', 'trousers', 'coat'] },
  { id: 'pebble', name: 'Pebble Grey', hex: '#A9ABAE', family: 'neutral', garments: ['trousers', 'knit', 'coat'] },
  { id: 'cool-grey', name: 'Cool Grey', hex: '#8E96A3', family: 'neutral', garments: ['trousers', 'knit'] },
  { id: 'charcoal', name: 'Charcoal', hex: '#32363D', family: 'neutral', garments: ['trousers', 'coat', 'knit', 'jacket'] },
  { id: 'black', name: 'Black', hex: '#121212', family: 'neutral', garments: ['tee', 'trousers', 'jacket', 'shoes'] },
  { id: 'dark-denim', name: 'Dark Indigo Denim', hex: '#243552', family: 'neutral', garments: ['jeans'] },
];

function derive(seed: LibrarySeed): LibraryColor {
  const lab = hexToLab(seed.hex);
  const { C } = labToLch(lab);
  // Warmth follows the yellow–blue axis (b*): colour-analysis "warm" means yellow-based and
  // "cool" means blue-based, so redness (a*) alone doesn't make a colour warm (berry, fuchsia).
  const temperature = seed.temperatureOverride ?? Math.tanh(lab.b / 28);
  // Chroma relative to what is achievable at that lightness, so deep classics like navy are not
  // mistaken for "muted" just because dark colours have low absolute Lab chroma.
  const chroma = C / (22 + 1.1 * Math.min(lab.L, 100 - lab.L));
  return {
    ...seed,
    temperature,
    depth: Math.max(0, Math.min(1, (100 - lab.L) / 90)),
    chroma: Math.max(0, Math.min(1, chroma)),
    isNeutral: seed.family === 'neutral',
  };
}

export const COLOR_LIBRARY: readonly LibraryColor[] = SEEDS.map(derive);

const BY_ID = new Map(COLOR_LIBRARY.map((c) => [c.id, c]));
const BY_HEX = new Map(COLOR_LIBRARY.map((c) => [c.hex.toUpperCase(), c]));

export function getLibraryColor(id: string): LibraryColor | undefined {
  return BY_ID.get(id);
}

export function findLibraryColorByHex(hex: string): LibraryColor | undefined {
  return BY_HEX.get(hex.toUpperCase());
}

export const FAMILY_LABELS: Record<ColorFamily, { singular: string; plural: string }> = {
  blue: { singular: 'blue', plural: 'blues' },
  green: { singular: 'green', plural: 'greens' },
  red: { singular: 'red', plural: 'reds' },
  pink: { singular: 'rose', plural: 'rosy pinks' },
  purple: { singular: 'plum', plural: 'plums and violets' },
  yellow: { singular: 'gold', plural: 'golds' },
  orange: { singular: 'terracotta', plural: 'terracottas and corals' },
  brown: { singular: 'earth tone', plural: 'earth tones' },
  neutral: { singular: 'neutral', plural: 'neutrals' },
};
