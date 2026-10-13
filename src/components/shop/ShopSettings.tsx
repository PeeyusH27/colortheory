'use client';

import { ArrowUpRight } from 'lucide-react';

import { config } from '@/constants/config';
import { RETAILERS } from '@/features/shop/retailers';
import { usePreferencesStore } from '@/store/preferencesStore';

import { SectionHeader } from '../layout/PageHeader';
import { Badge } from '../ui/Badge';
import { Checkbox } from '../ui/Checkbox';
import { SegmentedControl } from '../ui/SegmentedControl';

const VERIFIED_LABEL = {
  live: 'Checked live',
  'published-example': 'Matches real links',
  'standard-pattern': 'Please click-test',
} as const;

/** Settings → Shopping: who to shop for and which stores to show. Stored in this browser only. */
export function ShopSettings() {
  const audience = usePreferencesStore((s) => s.shopAudience);
  const setAudience = usePreferencesStore((s) => s.setShopAudience);
  const selected = usePreferencesStore((s) => s.shopRetailers);
  const toggle = usePreferencesStore((s) => s.toggleShopRetailer);

  return (
    <section id="shopping" aria-labelledby="shopping-title" className="flex scroll-mt-24 flex-col gap-4">
      <SectionHeader
        id="shopping-title"
        title="Shopping"
        description="“Shop this look” opens each store’s own search for your colours. Nothing but the search words is sent to the store."
      />
      <SegmentedControl
        label="Shop for"
        className="self-start"
        value={audience}
        onChange={setAudience}
        options={[
          { value: 'all', label: 'All' },
          { value: 'women', label: 'Women' },
          { value: 'men', label: 'Men' },
        ]}
      />
      <fieldset className="flex flex-col gap-3 rounded-md border-[1.5px] border-navy bg-paper p-4">
        <legend className="type-eyebrow px-1 text-muted">Stores to show</legend>
        {RETAILERS.map((r) => (
          <Checkbox key={r.id} checked={selected.includes(r.id)} onChange={() => toggle(r.id)} label={r.name} description={r.domain} />
        ))}
      </fieldset>
      {config.shopLinkTemplate ? (
        <p className="type-caption text-muted">Store links go through an affiliate redirect; every shop section says so.</p>
      ) : null}
    </section>
  );
}

/**
 * Development-only: one sample link per store, so URL formats that couldn't be checked
 * automatically (bot protection) can be verified by clicking through in a normal browser.
 */
export function ShopLinkCheck() {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="type-eyebrow text-muted">Store link check</h3>
      <ul className="flex flex-col divide-y divide-line-warm rounded-md border-[1.5px] border-line-warm bg-paper">
        {RETAILERS.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <a
              href={r.searchUrl({ text: 'navy blue shirt', audience: 'women' })}
              target="_blank"
              rel="noopener noreferrer"
              className="type-label inline-flex items-center gap-1 text-denim underline-offset-4 hover:underline">
              {r.name}
              <ArrowUpRight aria-hidden size={14} />
            </a>
            <Badge label={VERIFIED_LABEL[r.verified]} tone={r.verified === 'standard-pattern' ? 'warning' : 'success'} />
          </li>
        ))}
      </ul>
    </div>
  );
}
