import { config } from '@/constants/config';
import { fullQueryText, RETAILER_BY_ID } from '@/features/shop/retailers';
import { pluralGarment, retailColorTerm, retailGarmentTerm, WOMENSWEAR_ONLY } from '@/features/shop/shopTerms';

import type { ShopItem, ShopItemLinks, ShopLink, ShopPreferences, ShoppingProvider } from './types';

/** Wraps a store link in an affiliate redirect when one is configured. */
export function applyLinkTemplate(url: string, template: string | null, retailerId: string): { url: string; sponsored: boolean } {
  if (!template) return { url, sponsored: false };
  return {
    url: template.replaceAll('{url}', encodeURIComponent(url)).replaceAll('{retailer}', encodeURIComponent(retailerId)),
    sponsored: true,
  };
}

/**
 * Builds links into each store's own search for a colour + garment. Pure and synchronous: no
 * network calls, no scraping, nothing about the user beyond the search words reaches the store.
 */
export function createSearchLinkProvider(options: { linkTemplate?: string | null } = {}): ShoppingProvider {
  const template = options.linkTemplate ?? null;
  return {
    id: 'store-search-links',
    links(item: ShopItem, preferences: ShopPreferences): ShopItemLinks {
      const garmentTerm = retailGarmentTerm(item.garment, item.label);
      const text = `${retailColorTerm({ name: item.colorName, hex: item.hex })} ${garmentTerm}`;
      const query = { text, audience: preferences.audience, womenswearOnly: WOMENSWEAR_ONLY.has(item.garment) };
      const links: ShopLink[] = preferences.retailers.flatMap((id) => {
        const retailer = RETAILER_BY_ID.get(id);
        if (!retailer) return [];
        const wrapped = applyLinkTemplate(retailer.searchUrl(query), template, retailer.id);
        return [{ retailerId: retailer.id, retailerName: retailer.name, url: wrapped.url, sponsored: wrapped.sponsored }];
      });
      return { item, query: fullQueryText(query), heading: `${item.colorName} ${pluralGarment(garmentTerm)}`, links };
    },
  };
}

let provider: ShoppingProvider | null = null;

export function getShoppingProvider(): ShoppingProvider {
  provider ??= createSearchLinkProvider({ linkTemplate: config.shopLinkTemplate });
  return provider;
}
