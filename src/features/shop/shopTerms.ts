import { COLOR_LIBRARY, findLibraryColorByHex } from '@/features/colors/colorLibrary';
import type { GarmentCategory } from '@/types/domain';

/**
 * Store search engines understand everyday colour words ("teal blue", "dusty pink") better than
 * our editorial names ("Petrol Blue", "Dusty Rose"). One term per library colour; the UI always
 * shows our name and swatch next to the link, so the shopper can compare what the store returns.
 */
export const RETAIL_COLOR_TERMS: Record<string, string> = {
  navy: 'navy blue',
  midnight: 'navy blue',
  indigo: 'indigo blue',
  denim: 'denim blue',
  petrol: 'teal blue',
  cobalt: 'cobalt blue',
  steel: 'steel blue',
  periwinkle: 'periwinkle blue',
  sky: 'sky blue',
  powder: 'powder blue',
  teal: 'teal',
  aqua: 'aqua',
  emerald: 'emerald green',
  forest: 'dark green',
  pine: 'dark green',
  sage: 'sage green',
  olive: 'olive',
  mint: 'mint green',
  'true-red': 'red',
  burgundy: 'burgundy',
  berry: 'wine',
  raspberry: 'dark pink',
  fuchsia: 'fuchsia',
  'dusty-rose': 'dusty pink',
  blush: 'blush pink',
  coral: 'coral',
  terracotta: 'terracotta',
  rust: 'rust',
  apricot: 'peach',
  plum: 'plum',
  amethyst: 'purple',
  lavender: 'lavender',
  mustard: 'mustard',
  saffron: 'yellow',
  lemon: 'lemon yellow',
  chocolate: 'dark brown',
  cognac: 'cognac brown',
  camel: 'camel',
  'soft-white': 'off white',
  'optic-white': 'white',
  ecru: 'cream',
  beige: 'beige',
  stone: 'light beige',
  tan: 'tan',
  taupe: 'taupe',
  pebble: 'grey',
  'cool-grey': 'grey',
  charcoal: 'charcoal',
  black: 'black',
  'dark-denim': 'dark blue',
};

/** Retail search word for a colour; falls back to our own name if it isn't a library colour. */
export function retailColorTerm(color: { name: string; hex: string }): string {
  const library = findLibraryColorByHex(color.hex) ?? COLOR_LIBRARY.find((c) => c.name.toLowerCase() === color.name.toLowerCase());
  return (library && RETAIL_COLOR_TERMS[library.id]) ?? color.name.toLowerCase();
}

const GARMENT_TERMS: Record<GarmentCategory, string> = {
  shirt: 'shirt',
  tee: 't-shirt',
  knit: 'sweater',
  // Our jacket illustration is a lapelled, tailored jacket.
  jacket: 'blazer',
  coat: 'coat',
  trousers: 'trousers',
  jeans: 'jeans',
  skirt: 'skirt',
  dress: 'dress',
  shoes: 'shoes',
  accessory: 'bag',
};

/** Outfit-template labels that are more precise than the garment category. */
const LABEL_TERMS: Record<string, string> = {
  overshirt: 'overshirt',
  'midi skirt': 'midi skirt',
  loafers: 'loafers',
  sneakers: 'sneakers',
};

export function retailGarmentTerm(garment: GarmentCategory, label?: string): string {
  const fromLabel = label ? LABEL_TERMS[label.trim().toLowerCase()] : undefined;
  return fromLabel ?? GARMENT_TERMS[garment];
}

/** Plural for headings: "Shop navy blue shirts". */
export function pluralGarment(term: string): string {
  if (/(jeans|trousers|shoes|loafers|sneakers)$/.test(term)) return term;
  if (term.endsWith('dress')) return `${term}es`;
  return `${term}s`;
}

export const WOMENSWEAR_ONLY = new Set<GarmentCategory>(['dress', 'skirt']);
