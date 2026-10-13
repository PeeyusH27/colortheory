'use client';

import { Sparkles } from 'lucide-react';
import { useState } from 'react';

import { CombinationCard } from '@/components/colors/CombinationCard';
import { SectionHeader } from '@/components/layout/PageHeader';
import { DrapePreview } from '@/components/outfits/DrapePreview';
import { OutfitCard } from '@/components/outfits/OutfitCard';
import { ShopLinks } from '@/components/shop/ShopLinks';
import { ProvenanceBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { Rail, RailItem } from '@/components/ui/Rail';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { routes } from '@/lib/routes';
import { usePreferencesStore } from '@/store/preferencesStore';
import { staggerStyle } from '@/theme/motion';
import type { ColorAnalysisResult } from '@/types/domain';
import type { Outfit } from '@/types/outfits';

import { recommendOutfits } from './recommendOutfits';
import { useOutfitSaving } from './useOutfitSaving';
import { useShare } from './useShareOutfit';

interface OutfitGalleryViewProps {
  result: ColorAnalysisResult;
  analysisId: string | null;
  portraitUri: string | null;
  initialHex?: string | null;
  /** Editorial (non-personal) mode when the user has no analysis yet. */
  editorial?: boolean;
}

/**
 * Outfit gallery in the spirit of the reference style guide: the same portrait in several
 * colours, then outfits built around the selected colour, then full combinations.
 */
export function OutfitGalleryView({ result, analysisId, portraitUri, initialHex = null, editorial = false }: OutfitGalleryViewProps) {
  const [selectedHex, setSelectedHex] = useState<string | null>(initialHex);
  const [visual, setVisual] = useState<'flatlay' | 'drape'>('flatlay');
  const addRecent = usePreferencesStore((s) => s.addRecentlyViewed);
  const saving = useOutfitSaving(analysisId, result.isDemo);
  const share = useShare();

  const colors = [...result.recommendedColors, ...result.experimentalColors];
  const selected = colors.find((c) => c.hex.toUpperCase() === selectedHex?.toUpperCase()) ?? null;
  const focused = recommendOutfits(result, { selectedHex: selected?.hex ?? null, limit: 10 });
  const looks = recommendOutfits(result, { limit: 8, includeExperimental: false });
  const recordOpen = (o: Outfit) => addRecent({ kind: 'outfit', id: o.id, label: o.name, hex: o.mainColor.hex });

  return (
    <div className="flex flex-col gap-14">
      <section aria-labelledby="drapes-title" className="flex flex-col gap-5">
        <div className="page flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <ProvenanceBadge kind={result.isDemo ? 'demo' : 'drape'} />
            {editorial ? <p className="type-caption text-muted">Sample palette — analyse your look to personalise.</p> : null}
          </div>
          <SectionHeader
            id="drapes-title"
            eyebrow="Nº 01"
            title="See it on you"
            description={
              portraitUri
                ? 'Your photo with a colour drape across the shoulders — the way a stylist holds fabric up to your face. Choose one to filter the looks below.'
                : 'Colour drapes on an illustrated figure. Add a portrait to see them on you. Choose one to filter the looks below.'
            }
          />
        </div>
        <Rail label="Colour drapes" itemWidth="8rem" wideItemWidth="10rem">
          {result.recommendedColors.slice(0, 6).map((c, i) => {
            const active = c.hex === selected?.hex;
            return (
              <RailItem key={c.id}>
                <button
                  type="button"
                  style={staggerStyle(i)}
                  onClick={() => setSelectedHex(active ? null : c.hex)}
                  aria-pressed={active}
                  aria-label={`Show outfits in ${c.name}`}
                  className="flex w-full animate-enter-up flex-col gap-1.5 text-left">
                  <DrapePreview
                    hex={c.hex}
                    colorName={c.name}
                    portraitUri={portraitUri}
                    aspect={1.45}
                    className={cx('editorial-frame transition-transform duration-200', active && 'outline-[3px] outline-offset-2 outline-coral')}
                  />
                  <span className="type-caption truncate text-navy">{c.name}</span>
                  <span className="type-hex -mt-1 text-[0.6875rem] text-muted">{c.hex}</span>
                </button>
              </RailItem>
            );
          })}
        </Rail>
      </section>

      <section aria-labelledby="looks-title" className="flex flex-col gap-5">
        <div className="page flex flex-col gap-4">
          <SectionHeader
            id="looks-title"
            eyebrow="Nº 02"
            title={selected ? `Looks in ${selected.name}` : 'Looks for your palette'}
            action={
              selected ? (
                <Button variant="ghost" size="sm" onClick={() => setSelectedHex(null)}>
                  All colours
                </Button>
              ) : undefined
            }
          />
          <SegmentedControl
            label="Preview style"
            className="self-start"
            options={[
              { value: 'flatlay', label: 'Outfit' },
              { value: 'drape', label: 'Colour on me' },
            ]}
            value={visual}
            onChange={setVisual}
          />
        </div>
        <Rail label={selected ? `Looks in ${selected.name}` : 'Looks for your palette'} itemWidth="15.5rem" wideItemWidth="17rem">
          {focused.map((o) => (
            <RailItem key={o.id}>
              <OutfitCard
                outfit={o}
                href={routes.outfit(analysisId, o.id)}
                visual={visual}
                portraitUri={portraitUri}
                saved={saving.savedIds.has(o.id)}
                onOpen={() => recordOpen(o)}
                onToggleSave={editorial ? undefined : () => saving.toggle(o)}
                onShare={() => share.outfit(o)}
              />
            </RailItem>
          ))}
        </Rail>
      </section>

      <section aria-labelledby="combos-title" className="flex flex-col gap-5">
        <SectionHeader id="combos-title" className="page" eyebrow="Nº 03" title="Colour combinations" description="Proportions hint at how much of each to wear." />
        <Rail label="Colour combinations" itemWidth="14rem" wideItemWidth="16rem">
          {result.combinations.map((c) => (
            <RailItem key={c.id}>
              <CombinationCard name={c.name} hexes={c.hexes} note={c.note} className="h-full" />
            </RailItem>
          ))}
        </Rail>
      </section>

      <section aria-labelledby="complete-title" className="page flex flex-col gap-5">
        <SectionHeader id="complete-title" eyebrow="Nº 04" title="Complete looks" />
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {looks.map((o, i) => (
            <li key={o.id} className="animate-enter-up" style={staggerStyle(i)}>
              <OutfitCard
                outfit={o}
                href={routes.outfit(analysisId, o.id)}
                saved={saving.savedIds.has(o.id)}
                onOpen={() => recordOpen(o)}
                onToggleSave={editorial ? undefined : () => saving.toggle(o)}
              />
            </li>
          ))}
        </ul>
        <InlineAlert
          tone="info"
          title="Want to see the real thing?"
          action={
            <p className="type-caption flex items-center gap-1.5 text-denim">
              <Sparkles aria-hidden size={14} />
              Colour drapes and illustrations above are not AI-generated.
            </p>
          }>
          Open any outfit to request an AI try-on preview. It’s generated from your portrait only with your consent, and clearly labelled as
          an approximation.
        </InlineAlert>
      </section>

      <ShopLinks
        id="shop"
        className="page"
        title={editorial ? 'Shop the sample palette' : 'Shop your palette'}
        description={
          editorial
            ? 'Store searches for the editor’s sample colours. Analyse your look to shop your own.'
            : 'Your top colours in the garments they suit best. Open any look above for piece-by-piece links.'
        }
        items={result.recommendedColors
          .slice(0, 4)
          .flatMap((c) => (c.garments[0] ? [{ colorName: c.name, hex: c.hex, garment: c.garments[0] }] : []))}
      />
    </div>
  );
}
