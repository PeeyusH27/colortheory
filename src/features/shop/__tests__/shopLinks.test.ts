import { COLOR_LIBRARY } from '@/features/colors/colorLibrary';
import { applyLinkTemplate, createSearchLinkProvider } from '@/services/shopping/searchLinkProvider';
import { usePreferencesStore } from '@/store/preferencesStore';

import { DEFAULT_RETAILERS, fullQueryText, RETAILER_BY_ID, RETAILERS } from '../retailers';
import { pluralGarment, RETAIL_COLOR_TERMS, retailColorTerm, retailGarmentTerm } from '../shopTerms';

const search = (id: Parameters<typeof RETAILER_BY_ID.get>[0], text: string, audience: 'all' | 'women' | 'men' = 'women', womenswearOnly = false) =>
  RETAILER_BY_ID.get(id)!.searchUrl({ text, audience, womenswearOnly });

describe('retail search terms', () => {
  it('has an everyday colour word for every library colour', () => {
    for (const c of COLOR_LIBRARY) expect(RETAIL_COLOR_TERMS[c.id], c.id).toBeTruthy();
  });

  it('translates editorial names into store vocabulary, by hex or by name', () => {
    expect(retailColorTerm({ name: 'Petrol Blue', hex: '#0F4C5C' })).toBe('teal blue');
    expect(retailColorTerm({ name: 'Dusty Rose', hex: '#c99192' })).toBe('dusty pink');
    expect(retailColorTerm({ name: 'Stone', hex: '#000001' })).toBe('light beige');
    expect(retailColorTerm({ name: 'Not In Library', hex: '#123456' })).toBe('not in library');
  });

  it('uses precise garment words', () => {
    expect(retailGarmentTerm('jacket')).toBe('blazer');
    expect(retailGarmentTerm('knit', 'Sweater')).toBe('sweater');
    expect(retailGarmentTerm('shoes', 'Loafers')).toBe('loafers');
    expect(retailGarmentTerm('skirt', 'Midi skirt')).toBe('midi skirt');
    expect(retailGarmentTerm('tee', 'T-shirt')).toBe('t-shirt');
    expect(pluralGarment('shirt')).toBe('shirts');
    expect(pluralGarment('dress')).toBe('dresses');
    expect(pluralGarment('jeans')).toBe('jeans');
  });
});

describe('store search URLs', () => {
  it('builds each store’s own search link', () => {
    expect(search('myntra', 'navy blue shirt')).toBe('https://www.myntra.com/navy-blue-shirt-for-women?rawQuery=navy%20blue%20shirt%20for%20women');
    expect(search('zara', 'navy blue shirt')).toBe('https://www.zara.com/in/en/search?searchTerm=navy%20blue%20shirt&section=WOMAN');
    expect(search('zara', 'navy blue shirt', 'men')).toBe('https://www.zara.com/in/en/search?searchTerm=navy%20blue%20shirt&section=MAN');
    expect(search('zara', 'navy blue shirt', 'all')).toBe('https://www.zara.com/in/en/search?searchTerm=navy%20blue%20shirt');
    expect(search('westside', 'navy blue shirt')).toBe('https://www.westside.com/search?q=navy%20blue%20shirt%20for%20women');
    expect(search('ajio', 'navy blue shirt')).toBe('https://www.ajio.com/search/?text=navy%20blue%20shirt%20for%20women');
    expect(search('hm', 'navy blue shirt')).toBe('https://www2.hm.com/en_in/search-results.html?q=navy%20blue%20shirt%20for%20women');
    expect(search('uniqlo', 'navy blue shirt')).toBe('https://www.uniqlo.com/in/en/search?q=navy%20blue%20shirt%20for%20women');
    expect(search('tatacliq', 'navy blue shirt')).toBe('https://www.tatacliq.com/search/?searchCategory=all&text=navy%20blue%20shirt%20for%20women');
    expect(search('amazon', 'navy blue shirt')).toBe('https://www.amazon.in/s?k=navy%20blue%20shirt%20for%20women');
  });

  it('never adds "for men" to dresses and skirts', () => {
    expect(fullQueryText({ text: 'plum dress', audience: 'men', womenswearOnly: true })).toBe('plum dress');
    expect(search('zara', 'plum dress', 'men', true)).toBe('https://www.zara.com/in/en/search?searchTerm=plum%20dress');
  });

  it('encodes search words and keeps every link on the store’s own https domain', () => {
    for (const r of RETAILERS) {
      const url = new URL(r.searchUrl({ text: 'off white t-shirt & "tee"', audience: 'all' }));
      expect(url.protocol).toBe('https:');
      expect(url.hostname.endsWith(r.domain.split('/')[0]!.replace(/^www\./, ''))).toBe(true);
      expect(url.href).not.toContain('"');
    }
  });
});

describe('search-link provider', () => {
  const provider = createSearchLinkProvider();
  const item = { colorName: 'Navy Blue', hex: '#172A46', garment: 'shirt' as const, label: 'Shirt' };

  it('returns the chosen stores in order with a readable heading and the exact query', () => {
    const result = provider.links(item, { audience: 'men', retailers: ['zara', 'myntra'] });
    expect(result.heading).toBe('Navy Blue shirts');
    expect(result.query).toBe('navy blue shirt for men');
    expect(result.links.map((l) => l.retailerName)).toEqual(['Zara', 'Myntra']);
    expect(result.links.every((l) => !l.sponsored)).toBe(true);
  });

  it('ignores unknown store ids', () => {
    expect(provider.links(item, { audience: 'all', retailers: ['gone' as never, 'westside'] }).links).toHaveLength(1);
  });

  it('wraps links in a configured affiliate redirect and marks them sponsored', () => {
    const wrapped = createSearchLinkProvider({ linkTemplate: 'https://aff.example/r?u={url}&m={retailer}' }).links(item, { audience: 'all', retailers: ['myntra'] });
    const [link] = wrapped.links;
    expect(link?.sponsored).toBe(true);
    const url = new URL(link!.url);
    expect(url.hostname).toBe('aff.example');
    expect(url.searchParams.get('m')).toBe('myntra');
    expect(url.searchParams.get('u')).toBe('https://www.myntra.com/navy-blue-shirt?rawQuery=navy%20blue%20shirt');
    expect(applyLinkTemplate('https://x.test/a', null, 'zara')).toEqual({ url: 'https://x.test/a', sponsored: false });
  });
});

describe('shopping preferences', () => {
  it('defaults to the requested stores and drops store ids that no longer exist', async () => {
    expect(DEFAULT_RETAILERS.slice(0, 3)).toEqual(['myntra', 'zara', 'westside']);
    localStorage.setItem(
      'colortheory.preferences.v1',
      JSON.stringify({ state: { shopRetailers: ['myntra', 'gone-store', 'amazon'], shopAudience: 'nonsense' }, version: 0 }),
    );
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState().shopRetailers).toEqual(['myntra', 'amazon']);
    expect(usePreferencesStore.getState().shopAudience).toBe('all');
    usePreferencesStore.getState().toggleShopRetailer('zara');
    expect(usePreferencesStore.getState().shopRetailers).toEqual(['myntra', 'amazon', 'zara']);
  });
});
