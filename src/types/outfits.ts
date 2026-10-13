import type { GarmentCategory } from './domain';

/** How a secondary piece's colour is chosen when an outfit template is filled from a palette. */
export type PairingStrategy =
  | 'light-neutral' // beige, stone, ecru
  | 'dark-neutral' // charcoal, ink, black
  | 'white' // soft white / ecru tee
  | 'denim' // indigo jeans
  | 'grey' // mid grey trousers
  | 'warm-neutral' // tan, camel
  | 'contrast-neutral'; // whichever neutral contrasts most with the main colour

export type Occasion = 'work' | 'weekend' | 'evening' | 'travel' | 'event' | 'everyday';

export interface OutfitSlot {
  garment: GarmentCategory;
  role: 'main' | 'secondary' | 'layer' | 'shoes';
  strategy?: PairingStrategy;
  label: string;
}

/** A colour-agnostic outfit structure; concrete outfits are template × palette colour. */
export interface OutfitTemplate {
  id: string;
  name: string;
  /** Category shown in UI ("Shirt", "Knitwear", "Tailoring"). */
  category: string;
  slots: OutfitSlot[];
  occasions: Occasion[];
  /** Which colour roles may fill the main slot. Experimental colours only suit small doses. */
  mainRoles: ('core' | 'accent' | 'experimental')[];
  /** Reference to the provider garment category used for AI try-on. */
  tryOnCategory: 'tops' | 'bottoms' | 'one-pieces';
  /** Short description for try-on prompts / garment descriptions. */
  garmentDescription: string;
}

export interface OutfitPiece {
  garment: GarmentCategory;
  role: OutfitSlot['role'];
  label: string;
  colorName: string;
  hex: string;
}

export interface Outfit {
  /** `${templateId}--${colorId}` — deterministic, so it can be used in URLs and saved. */
  id: string;
  templateId: string;
  name: string;
  category: string;
  mainColor: { id: string; name: string; hex: string };
  pieces: OutfitPiece[];
  complementaryHexes: string[];
  occasions: Occasion[];
  accessories: string[];
  reason: string;
  combinations: string[];
  tryOnCategory: OutfitTemplate['tryOnCategory'];
  garmentDescription: string;
  score: number;
}
