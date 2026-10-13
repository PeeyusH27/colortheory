'use client';

import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

import { getShoppingProvider } from '@/services/shopping/searchLinkProvider';
import type { ShopItem } from '@/services/shopping/types';
import { usePreferencesStore } from '@/store/preferencesStore';

import { cx } from '../ui/cx';
import { InlineAlert } from '../ui/InlineAlert';
import { SegmentedControl } from '../ui/SegmentedControl';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'women', label: 'Women' },
  { value: 'men', label: 'Men' },
] as const;

interface ShopLinksProps {
  items: ShopItem[];
  title?: string;
  description?: string;
  /** `section` adds a heading, audience switch and disclosure; `compact` is for sheets and side panels. */
  variant?: 'section' | 'compact';
  id?: string;
  className?: string;
}

/** Dedupes items that would produce the same search (e.g. two neutral pieces in one colour). */
function uniqueItems(items: ShopItem[]) {
  const seen = new Set<string>();
  return items.filter((i) => {
    const key = `${i.hex.toUpperCase()}|${i.garment}|${i.label ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * "Shop this colour" rows: our swatch and colour name, then one link per chosen store into that
 * store's own search. Links open in a new tab; nothing about the user except the search words
 * reaches the store, and no retailer content is copied into ColorTheory.
 */
export function ShopLinks({ items, title = 'Shop this look', description, variant = 'section', id, className }: ShopLinksProps) {
  const audience = usePreferencesStore((s) => s.shopAudience);
  const retailers = usePreferencesStore((s) => s.shopRetailers);
  const setAudience = usePreferencesStore((s) => s.setShopAudience);
  const provider = getShoppingProvider();
  const rows = uniqueItems(items).map((item) => provider.links(item, { audience, retailers }));
  const sponsored = rows.some((r) => r.links.some((l) => l.sponsored));
  const compact = variant === 'compact';
  const headingId = id ? `${id}-title` : undefined;

  return (
    <section id={id} aria-labelledby={headingId} className={cx('flex min-w-0 scroll-mt-24 flex-col gap-4', className)}>
      {compact ? (
        <h3 id={headingId} className="type-eyebrow text-muted">
          {title}
        </h3>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id={headingId} className="type-h2 flex items-center gap-2 text-navy">
              <ShoppingBag aria-hidden size={22} strokeWidth={1.8} className="text-coral-text" />
              {title}
            </h2>
            {description ? <p className="type-body-m text-muted">{description}</p> : null}
          </div>
          <SegmentedControl label="Shop for" options={AUDIENCE_OPTIONS} value={audience} onChange={setAudience} />
        </div>
      )}

      {retailers.length === 0 ? (
        <InlineAlert tone="info">
          No stores selected.{' '}
          <Link href="/settings#shopping" className="underline underline-offset-2">
            Choose stores in Settings
          </Link>
          .
        </InlineAlert>
      ) : (
        <ul className={cx('flex flex-col', compact ? 'gap-3' : 'divide-y divide-line-warm rounded-md border-[1.5px] border-navy bg-paper')}>
          {rows.map((row) => (
            <li key={`${row.item.hex}-${row.item.garment}-${row.item.label ?? ''}`} className={cx('flex flex-col gap-3', !compact && 'p-4')}>
              <div className="flex items-center gap-3">
                <span aria-hidden className="size-9 shrink-0 border-[1.5px] border-navy" style={{ backgroundColor: row.item.hex }} />
                <span className="flex min-w-0 flex-col">
                  <span className="type-label text-navy">{row.heading}</span>
                  <span className="type-caption truncate text-muted">
                    Searches for “{row.query}” · our swatch <span className="type-hex text-[0.6875rem]">{row.item.hex}</span>
                  </span>
                </span>
              </div>
              <ul className="flex flex-wrap gap-2" aria-label={`Stores for ${row.heading}`}>
                {row.links.map((link) => (
                  <li key={link.retailerId}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel={link.sponsored ? 'noopener noreferrer sponsored nofollow' : 'noopener noreferrer'}
                      aria-label={`Search ${link.retailerName} for ${row.query} (opens in a new tab)`}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-[1.5px] border-navy bg-paper px-3.5 text-[0.8125rem] font-bold text-navy transition-colors duration-150 hover:bg-navy hover:text-cream">
                      {link.retailerName}
                      <ArrowUpRight aria-hidden size={14} strokeWidth={2.2} />
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <p className="type-caption text-muted">
        Links open each store’s own search in a new tab. Store colours vary between photos and screens — compare with your swatch.{' '}
        {sponsored
          ? 'These are affiliate links: ColorTheory may earn a commission at no extra cost to you. Stores don’t pay to be listed.'
          : 'ColorTheory isn’t affiliated with these stores.'}{' '}
        <Link href="/settings#shopping" className="underline underline-offset-2">
          Choose stores
        </Link>
      </p>
    </section>
  );
}
