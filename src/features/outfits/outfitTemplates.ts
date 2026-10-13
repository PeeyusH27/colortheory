import type { OutfitTemplate } from '@/types/outfits';

/**
 * Colour-agnostic outfit structures. Concrete outfits are produced by filling the `main` slot with
 * a palette colour and the other slots via pairing strategies (see recommendOutfits.ts). This keeps
 * the dataset small, works for every possible palette, and avoids stock imagery entirely — garments
 * are rendered as original SVG illustrations in the exact recommended colour.
 */
export const OUTFIT_TEMPLATES: readonly OutfitTemplate[] = [
  {
    id: 'clean-shirt',
    name: 'The Clean Shirt',
    category: 'Shirting',
    slots: [
      { garment: 'shirt', role: 'main', label: 'Shirt' },
      { garment: 'trousers', role: 'secondary', strategy: 'light-neutral', label: 'Trousers' },
      { garment: 'shoes', role: 'shoes', strategy: 'dark-neutral', label: 'Loafers' },
    ],
    occasions: ['work', 'everyday'],
    mainRoles: ['core', 'accent'],
    tryOnCategory: 'tops',
    garmentDescription: 'long-sleeve button-down shirt',
  },
  {
    id: 'layered-overshirt',
    name: 'Layered Overshirt',
    category: 'Layering',
    slots: [
      { garment: 'shirt', role: 'main', label: 'Overshirt' },
      { garment: 'tee', role: 'layer', strategy: 'white', label: 'T-shirt' },
      { garment: 'trousers', role: 'secondary', strategy: 'warm-neutral', label: 'Trousers' },
    ],
    occasions: ['weekend', 'travel', 'everyday'],
    mainRoles: ['core'],
    tryOnCategory: 'tops',
    garmentDescription: 'open overshirt worn over a crew-neck t-shirt',
  },
  {
    id: 'weekend-knit',
    name: 'Weekend Knit',
    category: 'Knitwear',
    slots: [
      { garment: 'knit', role: 'main', label: 'Sweater' },
      { garment: 'jeans', role: 'secondary', strategy: 'denim', label: 'Dark jeans' },
      { garment: 'shoes', role: 'shoes', strategy: 'white', label: 'Sneakers' },
    ],
    occasions: ['weekend', 'everyday', 'travel'],
    mainRoles: ['core', 'accent'],
    tryOnCategory: 'tops',
    garmentDescription: 'crew-neck knit sweater',
  },
  {
    id: 'soft-tailoring',
    name: 'Soft Tailoring',
    category: 'Tailoring',
    slots: [
      { garment: 'jacket', role: 'main', label: 'Jacket' },
      { garment: 'tee', role: 'layer', strategy: 'dark-neutral', label: 'T-shirt' },
      { garment: 'jeans', role: 'secondary', strategy: 'denim', label: 'Jeans' },
    ],
    occasions: ['work', 'evening', 'event'],
    mainRoles: ['core'],
    tryOnCategory: 'tops',
    garmentDescription: 'unstructured single-breasted jacket over a t-shirt',
  },
  {
    id: 'city-shirt',
    name: 'City Shirt',
    category: 'Shirting',
    slots: [
      { garment: 'shirt', role: 'main', label: 'Shirt' },
      { garment: 'trousers', role: 'secondary', strategy: 'grey', label: 'Trousers' },
      { garment: 'shoes', role: 'shoes', strategy: 'dark-neutral', label: 'Shoes' },
    ],
    occasions: ['work', 'travel'],
    mainRoles: ['core', 'accent'],
    tryOnCategory: 'tops',
    garmentDescription: 'crisp long-sleeve shirt',
  },
  {
    id: 'city-coat',
    name: 'City Coat',
    category: 'Outerwear',
    slots: [
      { garment: 'coat', role: 'main', label: 'Coat' },
      { garment: 'knit', role: 'layer', strategy: 'contrast-neutral', label: 'Knit' },
      { garment: 'trousers', role: 'secondary', strategy: 'dark-neutral', label: 'Trousers' },
    ],
    occasions: ['work', 'evening', 'travel'],
    mainRoles: ['core'],
    tryOnCategory: 'tops',
    garmentDescription: 'long tailored overcoat',
  },
  {
    id: 'column-dress',
    name: 'Column Dress',
    category: 'Dresses',
    slots: [
      { garment: 'dress', role: 'main', label: 'Dress' },
      { garment: 'shoes', role: 'shoes', strategy: 'dark-neutral', label: 'Shoes' },
    ],
    occasions: ['evening', 'event', 'work'],
    mainRoles: ['core', 'accent'],
    tryOnCategory: 'one-pieces',
    garmentDescription: 'simple long-sleeve midi dress',
  },
  {
    id: 'easy-tee',
    name: 'Easy Tee',
    category: 'Essentials',
    slots: [
      { garment: 'tee', role: 'main', label: 'T-shirt' },
      { garment: 'jeans', role: 'secondary', strategy: 'denim', label: 'Jeans' },
      { garment: 'shoes', role: 'shoes', strategy: 'white', label: 'Sneakers' },
    ],
    occasions: ['weekend', 'everyday'],
    mainRoles: ['core', 'accent'],
    tryOnCategory: 'tops',
    garmentDescription: 'relaxed crew-neck t-shirt',
  },
  {
    // Experimental colours live away from the face: the statement is below the waist.
    id: 'statement-trousers',
    name: 'Statement Trousers',
    category: 'Separates',
    slots: [
      { garment: 'knit', role: 'secondary', strategy: 'light-neutral', label: 'Knit' },
      { garment: 'trousers', role: 'main', label: 'Trousers' },
      { garment: 'shoes', role: 'shoes', strategy: 'dark-neutral', label: 'Shoes' },
    ],
    occasions: ['weekend', 'work', 'event'],
    mainRoles: ['experimental', 'accent'],
    tryOnCategory: 'bottoms',
    garmentDescription: 'wide-leg tailored trousers',
  },
  {
    id: 'statement-skirt',
    name: 'Statement Skirt',
    category: 'Separates',
    slots: [
      { garment: 'tee', role: 'secondary', strategy: 'white', label: 'T-shirt' },
      { garment: 'skirt', role: 'main', label: 'Midi skirt' },
      { garment: 'shoes', role: 'shoes', strategy: 'dark-neutral', label: 'Shoes' },
    ],
    occasions: ['weekend', 'event'],
    mainRoles: ['experimental', 'accent'],
    tryOnCategory: 'bottoms',
    garmentDescription: 'pleated midi skirt',
  },
];

export const TEMPLATE_BY_ID = new Map(OUTFIT_TEMPLATES.map((t) => [t.id, t]));
