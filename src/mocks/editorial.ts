import type { ColorCombination } from '@/types/domain';

/**
 * Editorial content curated by the ColorTheory team. Static, labelled as editorial picks — not
 * presented as personalised or as live "trend" data.
 */
export const TRENDING_COMBINATIONS: (ColorCombination & { season: string })[] = [
  { id: 'navy-camel', name: 'Navy & Camel', hexes: ['#172A46', '#C19A6B', '#F4F1EA'], note: 'The quiet-luxury classic. Navy knit, camel coat.', season: 'AW26' },
  { id: 'petrol-rust', name: 'Petrol & Rust', hexes: ['#0F4C5C', '#A8471E', '#EBE1CB'], note: 'Complementary depth: blue-green against burnt orange.', season: 'AW26' },
  { id: 'sky-stone', name: 'Sky & Stone', hexes: ['#A7C7E7', '#CFC8BC', '#32363D'], note: 'Soft contrast for clear spring light.', season: 'SS27' },
  { id: 'indigo-ecru', name: 'Indigo & Ecru', hexes: ['#2E3A87', '#EBE1CB', '#8A4B2A'], note: 'Workwear indigo, lifted by cream and cognac.', season: 'All year' },
  { id: 'sage-chocolate', name: 'Sage & Chocolate', hexes: ['#9DB5A0', '#4E3326', '#F4F1EA'], note: 'Earthy and calm; a warm alternative to black.', season: 'AW26' },
  { id: 'berry-pebble', name: 'Berry & Pebble', hexes: ['#8E2A52', '#A9ABAE', '#121212'], note: 'A jewel tone grounded with grey.', season: 'Evening' },
];

export const STYLE_PRINCIPLES = [
  { title: 'Best colours near your face', body: 'Shirts, knits and collars do the most work. Save your top shades for them.' },
  { title: 'Experiment below the waist', body: 'Colours at the edge of your range shine as trousers, skirts, shoes and bags.' },
  { title: 'Daylight is the judge', body: 'Indoor bulbs and phone filters shift colour. Check a new piece by a window.' },
  { title: 'Your eye has the final say', body: 'Estimates are a starting point. Adjust your palette until it feels like you.' },
];
