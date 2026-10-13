/**
 * Stores we link to. ColorTheory never scrapes or republishes retailer content: each link opens the
 * store's own public search for a colour + garment, exactly as if the shopper had typed it there.
 *
 * `verified` records how each URL format was checked (2026-10-13), so it's clear which links to
 * re-test when a store redesigns its site:
 *   - `live`               the search page loaded with matching results in a browser
 *   - `published-example`  format copied from real links the store's search produces
 *   - `standard-pattern`   the store's standard site-search format; its bot protection blocked an
 *                          automated check, so click-test it (Settings → Developer diagnostics)
 */

export type RetailerId = 'myntra' | 'ajio' | 'zara' | 'hm' | 'westside' | 'uniqlo' | 'tatacliq' | 'amazon';
export type ShopAudience = 'all' | 'women' | 'men';

export interface RetailerQuery {
  /** Colour + garment, e.g. "navy blue shirt". */
  text: string;
  audience: ShopAudience;
  /** Garments sold almost only in womenswear (dresses, skirts) ignore a "men" audience. */
  womenswearOnly?: boolean;
}

export interface Retailer {
  id: RetailerId;
  name: string;
  /** Shown under the store name, e.g. "myntra.com". */
  domain: string;
  verified: 'live' | 'published-example' | 'standard-pattern';
  searchUrl: (query: RetailerQuery) => string;
}

const enc = encodeURIComponent;

function effectiveAudience({ audience, womenswearOnly }: RetailerQuery): ShopAudience {
  return womenswearOnly && audience === 'men' ? 'all' : audience;
}

/** Query text including the audience, e.g. "navy blue shirt for women". */
export function fullQueryText(query: RetailerQuery): string {
  const audience = effectiveAudience(query);
  return audience === 'all' ? query.text : `${query.text} for ${audience}`;
}

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const RETAILERS: readonly Retailer[] = [
  {
    id: 'myntra',
    name: 'Myntra',
    domain: 'myntra.com',
    verified: 'published-example',
    // Myntra's search box produces /<query-slug>?rawQuery=<query>.
    searchUrl: (q) => {
      const text = fullQueryText(q);
      return `https://www.myntra.com/${slug(text)}?rawQuery=${enc(text)}`;
    },
  },
  {
    id: 'zara',
    name: 'Zara',
    domain: 'zara.com/in',
    verified: 'standard-pattern',
    searchUrl: (q) => {
      const audience = effectiveAudience(q);
      const section = audience === 'women' ? '&section=WOMAN' : audience === 'men' ? '&section=MAN' : '';
      return `https://www.zara.com/in/en/search?searchTerm=${enc(q.text)}${section}`;
    },
  },
  {
    id: 'westside',
    name: 'Westside',
    domain: 'westside.com',
    verified: 'live',
    searchUrl: (q) => `https://www.westside.com/search?q=${enc(fullQueryText(q))}`,
  },
  {
    id: 'ajio',
    name: 'AJIO',
    domain: 'ajio.com',
    verified: 'standard-pattern',
    searchUrl: (q) => `https://www.ajio.com/search/?text=${enc(fullQueryText(q))}`,
  },
  {
    id: 'hm',
    name: 'H&M',
    domain: 'hm.com/en_in',
    verified: 'standard-pattern',
    searchUrl: (q) => `https://www2.hm.com/en_in/search-results.html?q=${enc(fullQueryText(q))}`,
  },
  {
    id: 'uniqlo',
    name: 'Uniqlo',
    domain: 'uniqlo.com/in',
    verified: 'standard-pattern',
    searchUrl: (q) => `https://www.uniqlo.com/in/en/search?q=${enc(fullQueryText(q))}`,
  },
  {
    id: 'tatacliq',
    name: 'Tata CLiQ',
    domain: 'tatacliq.com',
    verified: 'live',
    searchUrl: (q) => `https://www.tatacliq.com/search/?searchCategory=all&text=${enc(fullQueryText(q))}`,
  },
  {
    id: 'amazon',
    name: 'Amazon Fashion',
    domain: 'amazon.in',
    verified: 'live',
    searchUrl: (q) => `https://www.amazon.in/s?k=${enc(fullQueryText(q))}`,
  },
];

export const RETAILER_BY_ID = new Map(RETAILERS.map((r) => [r.id, r]));

/** Shown until the shopper picks their own stores in Settings. */
export const DEFAULT_RETAILERS: RetailerId[] = ['myntra', 'zara', 'westside', 'ajio', 'hm'];

export function isRetailerId(value: string): value is RetailerId {
  return RETAILER_BY_ID.has(value as RetailerId);
}
