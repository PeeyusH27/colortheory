'use client';

import { ArrowRight, Copy, Heart, Info } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { provenanceOf } from '@/components/analysis/LatestStoryCard';
import { ColorSwatch } from '@/components/colors/ColorSwatch';
import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { OutfitCard } from '@/components/outfits/OutfitCard';
import { ShopLinks } from '@/components/shop/ShopLinks';
import { ProvenanceBadge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Rail, RailItem } from '@/components/ui/Rail';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { toast } from '@/components/ui/Toast';
import { useColorDetail } from '@/features/colors/useColorDetail';
import { useAnalysis, useFavoriteColors, usePortraitUri, useToggleFavoriteColor } from '@/features/data/queries';
import { recommendOutfits } from '@/features/outfits/recommendOutfits';
import { useOutfitSaving } from '@/features/outfits/useOutfitSaving';
import { useShare } from '@/features/outfits/useShareOutfit';
import { routes } from '@/lib/routes';
import { palette } from '@/theme/colors';
import type { ColorRecommendation } from '@/types/domain';
import { darkVariant, lightVariant, readableOn } from '@/utils/color';
import { friendlyError } from '@/utils/errors';

const ROLE_COPY: Record<ColorRecommendation['role'], string> = {
  core: 'Core colour',
  accent: 'Accent',
  neutral: 'Neutral',
  experimental: 'Try with care',
};

function SwatchGrid({ colors, selectedId, onSelect, isFavorite }: { colors: ColorRecommendation[]; selectedId?: string; onSelect: (c: ColorRecommendation) => void; isFavorite: (hex: string) => boolean }) {
  return (
    <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
      {colors.map((c) => (
        <li key={c.id}>
          <ColorSwatch name={c.name} hex={c.hex} selected={c.id === selectedId} favorite={isFavorite(c.hex)} onClick={() => onSelect(c)} />
        </li>
      ))}
    </ul>
  );
}

export function PaletteView() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const analysis = useAnalysis(analysisId);
  const portraitUri = usePortraitUri(analysis.data);
  const favorites = useFavoriteColors();
  const toggleFavorite = useToggleFavoriteColor();
  const colorDetail = useColorDetail(analysisId);
  const share = useShare();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const result = analysis.data?.result ?? null;
  const saving = useOutfitSaving(analysisId, result?.isDemo ?? false);

  if (analysis.isPending) return <LoadingState label="Loading palette" className="min-h-[50dvh]" />;
  if (!result || !analysis.data) {
    return (
      <div className="page py-10">
        <ErrorState
          error={analysis.error ?? undefined}
          code={analysis.error ? undefined : 'not_found'}
          onRetry={analysis.error ? () => void analysis.refetch() : undefined}
          secondary={
            <LinkButton href="/colors" variant="secondary">
              My Colors
            </LinkButton>
          }
        />
      </div>
    );
  }

  const all = [...result.recommendedColors, ...result.neutralColors, ...result.experimentalColors];
  const selected = all.find((c) => c.id === selectedId) ?? result.recommendedColors[0] ?? null;
  const favoriteByHex = new Map((favorites.data ?? []).map((f) => [f.hex.toUpperCase(), f]));
  const favorite = selected ? favoriteByHex.get(selected.hex.toUpperCase()) : undefined;
  const outfits = selected ? recommendOutfits(result, { selectedHex: selected.hex, limit: 8 }) : [];
  const onColor = selected ? readableOn(selected.hex) : palette.cream;

  const select = (c: ColorRecommendation) => setSelectedId(c.id);

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      toast.success(`${hex} copied`);
    } catch {
      toast.error('Copying isn’t allowed here. Select the code and copy it manually.');
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        className="page"
        back={{ href: routes.results(analysisId), label: 'Results' }}
        eyebrow="Interactive palette"
        title="Your palette"
        subtitle={result.headline}
        actions={
          <>
            <ProvenanceBadge kind={provenanceOf(analysis.data)} />
            <Button variant="secondary" size="sm" onClick={() => share.palette(result.headline, all)}>
              Share
            </Button>
          </>
        }
      />

      <div className="page grid gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
        {selected ? (
          <section
            key={selected.id}
            aria-live="polite"
            aria-label={`Selected colour: ${selected.name}`}
            className="editorial-frame flex animate-fade-in flex-col gap-4 p-6 shadow-offset lg:sticky lg:top-24"
            style={{ backgroundColor: selected.hex, color: onColor }}>
            <div className="flex items-center justify-between">
              <span className="type-eyebrow">{ROLE_COPY[selected.role]}</span>
              <span className="flex gap-1">
                <IconButton
                  icon={Heart}
                  label={favorite ? `Remove ${selected.name} from favourites` : `Add ${selected.name} to favourites`}
                  pressed={Boolean(favorite)}
                  tone="glass"
                  className={favorite ? '[&_svg]:fill-coral [&_svg]:text-coral' : undefined}
                  onClick={() =>
                    toggleFavorite.mutate(
                      { name: selected.name, hex: selected.hex, analysisId, favoriteId: favorite?.id ?? null },
                      {
                        onSuccess: (r) => toast.show(r.favorited ? 'Saved to favourite colours' : 'Removed from favourites'),
                        onError: (e) => toast.error(friendlyError(e).body),
                      },
                    )
                  }
                />
                <IconButton icon={Info} label={`${selected.name} details`} tone="glass" onClick={() => colorDetail.open(selected)} />
              </span>
            </div>
            <h2 className="type-display-l">{selected.name}</h2>
            <div className="flex items-center gap-3">
              <span className="type-hex text-lg select-all">{selected.hex}</span>
              <Button size="sm" variant="secondary" tone={onColor === palette.cream ? 'cream' : 'ink'} icon={Copy} onClick={() => void copy(selected.hex)}>
                Copy
              </Button>
            </div>
            <div className="flex h-14 border border-current/30" role="img" aria-label={`Lighter ${lightVariant(selected.hex)}, base ${selected.hex}, deeper ${darkVariant(selected.hex)}`}>
              {[lightVariant(selected.hex), selected.hex, darkVariant(selected.hex)].map((hex, i) => (
                <span key={`${hex}-${i}`} className="type-hex flex flex-1 items-end p-2 text-[0.625rem]" style={{ backgroundColor: hex, color: readableOn(hex) }}>
                  {i === 0 ? 'Lighter' : i === 1 ? 'Base' : 'Deeper'}
                </span>
              ))}
            </div>
            <p className="type-body-s">{selected.reason}</p>
          </section>
        ) : null}

        <div className="flex flex-col gap-10">
          <section aria-labelledby="core-title" className="flex flex-col gap-4">
            <SectionHeader id="core-title" eyebrow="Nº 01" title="Core & accents" description="Choose a swatch to see it in outfits." />
            <SwatchGrid colors={result.recommendedColors} selectedId={selected?.id} onSelect={select} isFavorite={colorDetail.isFavorite} />
          </section>
          <section aria-labelledby="neutral-title" className="flex flex-col gap-4">
            <SectionHeader id="neutral-title" eyebrow="Nº 02" title="Neutrals" />
            <SwatchGrid colors={result.neutralColors} selectedId={selected?.id} onSelect={select} isFavorite={colorDetail.isFavorite} />
          </section>
          {result.experimentalColors.length ? (
            <section aria-labelledby="care-title" className="flex flex-col gap-4">
              <SectionHeader id="care-title" eyebrow="Nº 03" title="Try with care" />
              <SwatchGrid colors={result.experimentalColors} selectedId={selected?.id} onSelect={select} isFavorite={colorDetail.isFavorite} />
            </section>
          ) : null}
        </div>
      </div>

      {selected ? (
        <ShopLinks
          key={selected.id}
          id="shop"
          className="page"
          title={`Shop ${selected.name}`}
          description="The garments this colour works best in, at your favourite stores."
          items={selected.garments.slice(0, 3).map((garment) => ({ colorName: selected.name, hex: selected.hex, garment }))}
        />
      ) : null}

      <section aria-labelledby="wear-title" className="flex flex-col gap-5">
        <SectionHeader
          id="wear-title"
          className="page"
          eyebrow="Nº 04"
          title={selected ? `Wear ${selected.name}` : 'Outfits'}
          description={outfits.length ? `${outfits.length} looks that use this colour.` : 'Neutrals shine as supporting pieces — pick a core colour to build around.'}
          action={
            <LinkButton href={`${routes.gallery(analysisId)}${selected ? `?color=${encodeURIComponent(selected.hex)}` : ''}`} variant="ghost" size="sm" iconRight={ArrowRight}>
              Gallery
            </LinkButton>
          }
        />
        {outfits.length ? (
          <Rail key={selected?.id} label={`Outfits in ${selected?.name ?? 'your palette'}`} itemWidth="15.5rem" wideItemWidth="17rem">
            {outfits.map((o) => (
              <RailItem key={o.id}>
                <OutfitCard
                  outfit={o}
                  href={routes.outfit(analysisId, o.id)}
                  portraitUri={portraitUri}
                  saved={saving.savedIds.has(o.id)}
                  onToggleSave={() => saving.toggle(o)}
                  onShare={() => share.outfit(o)}
                />
              </RailItem>
            ))}
          </Rail>
        ) : null}
      </section>
      {colorDetail.sheet}
    </div>
  );
}
