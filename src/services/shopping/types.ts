import type { RetailerId, ShopAudience } from '@/features/shop/retailers';
import type { GarmentCategory } from '@/types/domain';

/**
 * Provider-independent contract for "shop this colour". Today the only provider builds links into
 * each store's own search (no data leaves the browser beyond what the shopper would type there).
 * A future provider backed by an affiliate product feed or a shopping-search API — always behind a
 * Supabase Edge Function, never with a key in the browser — can add `products()` without UI
 * changes to the link rows.
 */

/** One thing to shop for: a garment in a colour. */
export interface ShopItem {
  /** Our colour name and swatch, shown next to the link so the shopper can compare. */
  colorName: string;
  hex: string;
  garment: GarmentCategory;
  /** Outfit-template label ("Loafers", "Midi skirt") when shopping for an outfit piece. */
  label?: string;
}

export interface ShopPreferences {
  audience: ShopAudience;
  retailers: RetailerId[];
}

export interface ShopLink {
  retailerId: RetailerId;
  retailerName: string;
  url: string;
  /** True when the URL goes through an affiliate redirect (disclosed in the UI, `rel="sponsored"`). */
  sponsored: boolean;
}

export interface ShopItemLinks {
  item: ShopItem;
  /** What we searched for, e.g. "navy blue shirt for women". */
  query: string;
  /** Short heading, e.g. "Navy Blue shirts". */
  heading: string;
  links: ShopLink[];
}

/** A real product (not implemented yet — reserved for a server-backed feed provider). */
export interface ProductCard {
  retailerId: RetailerId;
  title: string;
  priceText: string | null;
  imageUrl: string;
  productUrl: string;
  colorHex: string | null;
  sponsored: boolean;
}

export interface ShoppingProvider {
  readonly id: string;
  links(item: ShopItem, preferences: ShopPreferences): ShopItemLinks;
  products?(item: ShopItem, preferences: ShopPreferences, options?: { signal?: AbortSignal }): Promise<ProductCard[]>;
}
