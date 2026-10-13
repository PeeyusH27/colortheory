import { act, render, screen, within } from '@testing-library/react';

import { usePreferencesStore } from '@/store/preferencesStore';

import { ShopLinks } from '../ShopLinks';

const items = [
  { colorName: 'Navy Blue', hex: '#172A46', garment: 'shirt' as const, label: 'Shirt' },
  { colorName: 'Stone', hex: '#CFC8BC', garment: 'trousers' as const, label: 'Trousers' },
  // Same search as the shirt row — shown once.
  { colorName: 'Navy Blue', hex: '#172a46', garment: 'shirt' as const, label: 'Shirt' },
];

beforeEach(() => {
  act(() => usePreferencesStore.setState({ shopAudience: 'women', shopRetailers: ['myntra', 'zara'] }));
});

describe('ShopLinks', () => {
  it('renders one row per piece with safe, labelled links into each store', () => {
    render(<ShopLinks items={items} />);
    expect(screen.getByRole('heading', { name: 'Shop this look' })).toBeTruthy();
    const shirts = screen.getByRole('list', { name: 'Stores for Navy Blue shirts' });
    const links = within(shirts).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Myntra', 'Zara']);
    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
    expect(links[0]?.getAttribute('aria-label')).toBe('Search Myntra for navy blue shirt for women (opens in a new tab)');
    expect(screen.getAllByRole('list', { name: /^Stores for/ })).toHaveLength(2);
    expect(screen.getByText(/isn’t affiliated with these stores/)).toBeTruthy();
  });

  it('lets the shopper switch audience, which rewrites the searches', () => {
    render(<ShopLinks items={items.slice(0, 1)} />);
    act(() => screen.getByRole('radio', { name: 'Men' }).click());
    expect(screen.getByRole('link', { name: /Search Zara/ }).getAttribute('href')).toContain('section=MAN');
  });

  it('explains how to choose stores when none are selected', () => {
    act(() => usePreferencesStore.setState({ shopRetailers: [] }));
    render(<ShopLinks items={items} variant="compact" title="Shop this colour" />);
    expect(screen.getByText(/No stores selected/)).toBeTruthy();
    expect(screen.queryAllByRole('link', { name: /^Search / })).toHaveLength(0);
  });
});
