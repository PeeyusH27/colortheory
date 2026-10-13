'use client';

import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Palette as PaletteIcon, RotateCcw, Share2, Shirt, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { CharacteristicScale } from '@/components/analysis/CharacteristicScale';
import { provenanceOf } from '@/components/analysis/LatestStoryCard';
import { Blob } from '@/components/brand/Blob';
import { ColorSwatch } from '@/components/colors/ColorSwatch';
import { CombinationCard } from '@/components/colors/CombinationCard';
import { SectionHeader } from '@/components/layout/PageHeader';
import { DrapePreview } from '@/components/outfits/DrapePreview';
import { PortraitFrame } from '@/components/outfits/PortraitFrame';
import { Badge, ProvenanceBadge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { toast } from '@/components/ui/Toast';
import { AdjustSheet } from '@/features/analysis/AdjustSheet';
import { adjustResult, isAdjusted } from '@/features/analysis/adjustResult';
import { useColorDetail } from '@/features/colors/useColorDetail';
import { useAnalysis, usePalettes, usePortraitUri, useSavePalette, useUpdateAnalysisResult } from '@/features/data/queries';
import { useShare } from '@/features/outfits/useShareOutfit';
import { routes } from '@/lib/routes';
import { palette } from '@/theme/colors';
import { staggerStyle } from '@/theme/motion';
import type { ColorAnalysisResult } from '@/types/domain';
import { readableOn } from '@/utils/color';
import { friendlyError } from '@/utils/errors';
import { formatDate, percent } from '@/utils/format';

function confidenceLabel(c: number | null) {
  if (c === null) return 'Not estimated';
  if (c < 0.35) return 'Low';
  if (c < 0.6) return 'Moderate';
  return 'Good';
}

export function ResultsView() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const fresh = useSearchParams().get('fresh') === '1';
  const analysis = useAnalysis(analysisId);
  const portraitUri = usePortraitUri(analysis.data);
  const palettes = usePalettes();
  const savePalette = useSavePalette();
  const updateResult = useUpdateAnalysisResult();
  const colorDetail = useColorDetail(analysisId);
  const share = useShare();
  const [adjusting, setAdjusting] = useState(false);

  if (analysis.isPending) return <LoadingState label="Opening your colour story" className="min-h-[60dvh]" />;
  if (analysis.error || !analysis.data?.result) {
    return (
      <div className="page py-10">
        <ErrorState
          error={analysis.error ?? undefined}
          code={analysis.error ? undefined : 'not_found'}
          title={analysis.error ? undefined : 'Analysis not found'}
          body={analysis.error ? undefined : 'It may have been deleted, or it was saved in a different browser.'}
          onRetry={analysis.error ? () => void analysis.refetch() : undefined}
          secondary={
            <LinkButton href="/discover" variant="secondary">
              Go home
            </LinkButton>
          }
        />
      </div>
    );
  }

  const session = analysis.data;
  const result = session.result as ColorAnalysisResult;
  const c = result.characteristics;
  const savedPalette = palettes.data?.find((p) => p.analysisId === session.id && p.kind === 'analysis');
  const lowConfidence = result.confidence !== null && result.confidence < 0.35;
  const lead = result.recommendedColors[0]?.hex ?? palette.navy;
  const statementFg = readableOn(lead);
  const [headlineLead, ...headlineRest] = result.headline.split(',');
  const portraitForFrame = portraitUri ?? (session.portrait.location === 'deleted' ? null : undefined);

  const onSavePalette = () => {
    savePalette.mutate(
      {
        name: result.headline.split(' and ')[0] ?? 'My palette',
        analysisId: session.id,
        kind: 'analysis',
        colors: [...result.recommendedColors, ...result.neutralColors].map(({ name, hex }) => ({ name, hex })),
      },
      { onSuccess: () => toast.success('Palette saved to My Colors'), onError: (e) => toast.error(friendlyError(e).body) },
    );
  };

  return (
    <article className="flex flex-col pb-4">
      {/* ── Masthead ───────────────────────────────────────────────────────── */}
      <header className="relative isolate overflow-hidden bg-ink text-cream">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <Blob seed={23} color={lead} className="absolute -top-20 -right-24 w-64 md:w-[28rem]" />
          <Blob seed={41} color={result.recommendedColors[1]?.hex ?? palette.sky} className="absolute top-40 -right-6 w-24 md:top-36 md:right-[20rem] md:w-36" />
          {/* Keeps the headline readable whatever the palette's lead colour is. */}
          <div className="absolute inset-0 bg-[linear-gradient(100deg,#0D1626_0%,rgb(13_22_38/0.92)_45%,rgb(13_22_38/0.35)_100%)]" />
        </div>
        <div className="page flex flex-col gap-6 pt-5 pb-10 md:pb-14">
          <div className="flex items-center justify-between">
            <Link
              href={fresh ? '/discover' : '/history'}
              className="type-label -ml-1 inline-flex min-h-10 items-center gap-1.5 rounded-full pr-3 pl-1 text-cream hover:bg-cream/10">
              <ArrowLeft aria-hidden size={18} />
              {fresh ? 'Done' : 'History'}
            </Link>
            <IconButton icon={Share2} label="Share palette" tone="glass" onClick={() => share.palette(result.headline, result.recommendedColors)} />
          </div>
          <div className="flex animate-enter-up flex-col gap-3 md:max-w-2xl">
            <p className="type-eyebrow text-sky">
              {result.title} · {formatDate(session.createdAt)}
            </p>
            <h1 className="type-display-l">
              {headlineLead}
              {headlineRest.length ? ',' : ''}
              {headlineRest.length ? <span className="type-editorial mt-2 block text-sky">{headlineRest.join(',').trim()}</span> : null}
            </h1>
            <div className="mt-1 flex flex-wrap gap-2">
              <ProvenanceBadge kind={provenanceOf(session)} inverse />
              <Badge
                label={`Confidence · ${confidenceLabel(result.confidence)}${result.confidence !== null ? ` ${percent(result.confidence)}` : ''}`}
                tone="inverse"
                title="How much the photo quality lets us trust this estimate"
              />
              {isAdjusted(result.adjustments) ? <Badge label="Adjusted by you" tone="inverse" /> : null}
            </div>
          </div>
        </div>
      </header>

      <div className="page grid gap-10 pt-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-12 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        {/* ── Portrait column ───────────────────────────────────────────────── */}
        <aside className="flex gap-5 md:sticky md:top-24 md:flex-col md:self-start">
          <PortraitFrame
            uri={portraitForFrame}
            shadow="offset-coral"
            className="w-40 shrink-0 md:w-full"
            placeholder={result.isDemo ? <DrapePreview hex={lead} colorName="Sample" showLabel={false} className="absolute inset-0 !aspect-auto h-full" /> : undefined}
          />
          <div className="flex flex-col gap-2">
            {c.sampledHex ? (
              <div role="img" aria-label={`Sampled tone ${c.sampledHex}`} className="flex items-center gap-3">
                <span className="size-10 shrink-0 border-[1.5px] border-navy" style={{ backgroundColor: c.sampledHex }} />
                <span className="flex flex-col">
                  <span className="type-eyebrow text-muted">Sampled tone</span>
                  <span className="type-hex text-navy">{c.sampledHex}</span>
                </span>
              </div>
            ) : null}
            <p className="type-caption text-muted">
              {result.isDemo ? 'Sample data — not based on your photo.' : 'Average of skin-toned pixels in your face guide, as your camera recorded it.'}
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-14">
          {lowConfidence || result.qualityWarnings.length ? (
            <InlineAlert
              tone={lowConfidence ? 'warning' : 'info'}
              title={lowConfidence ? 'Low confidence — consider a retake' : 'About this photo'}
              action={
                lowConfidence ? (
                  <LinkButton href="/analyze" variant="secondary" size="sm" icon={RotateCcw}>
                    Retake in better light
                  </LinkButton>
                ) : undefined
              }>
              {result.qualityWarnings.join(' ')}
            </InlineAlert>
          ) : null}

          {/* ── 01 What we see ──────────────────────────────────────────────── */}
          <section aria-labelledby="see-title" className="flex flex-col gap-6">
            <SectionHeader id="see-title" eyebrow="Nº 01" title="What we see" description="Visible characteristics estimated from one photo — not a diagnosis." />
            <div className="grid gap-6 sm:grid-cols-2">
              <CharacteristicScale
                label="Undertone lean"
                value={(c.undertone.lean + 1) / 2}
                estimate={c.undertone.estimate.replace('-', ' ')}
                left="Cool"
                right="Warm"
                gradient={[palette.steel, palette.cream, palette.camel]}
              />
              <CharacteristicScale label="Depth" value={c.depth.value} estimate={c.depth.estimate.replace('-', ' ')} left="Light" right="Deep" gradient={[palette.cream, palette.camel, palette.ink]} />
              <CharacteristicScale label="Contrast" value={c.contrast.value} estimate={c.contrast.estimate} left="Low" right="High" gradient={[palette.linen, palette.slate, palette.ink]} />
              <CharacteristicScale label="Clarity" value={c.chroma.value} estimate={c.chroma.estimate} left="Soft" right="Clear" gradient={[palette.sage, palette.denim, palette.coral]} />
            </div>
            <Button variant="secondary" icon={SlidersHorizontal} className="self-start" onClick={() => setAdjusting(true)}>
              Doesn’t feel right? Adjust
            </Button>
          </section>

          {/* ── 02 See it on you ────────────────────────────────────────────── */}
          <section aria-labelledby="drape-title" className="flex flex-col gap-5">
            <SectionHeader id="drape-title" eyebrow="Nº 02" title="See it on you" description="Colour drapes over your photo. Not AI — your photo is unchanged." />
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {result.recommendedColors.slice(0, 5).map((color, i) => (
                <li key={color.id} className="animate-enter-up" style={staggerStyle(i)}>
                  <button type="button" onClick={() => colorDetail.open(color)} className="block w-full text-left" aria-label={`${color.name} drape. Show colour details`}>
                    <DrapePreview hex={color.hex} colorName={color.name} portraitUri={portraitUri} showLabel={false} aspect={1.5} className="editorial-frame" />
                    <span className="block border-[1.5px] border-t-0 border-navy px-2 py-1" style={{ backgroundColor: color.hex }}>
                      <span className="type-eyebrow block truncate text-[0.5625rem] tracking-[0.14em]" style={{ color: readableOn(color.hex) }}>
                        {color.name}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* ── 03 Palette ──────────────────────────────────────────────────── */}
          <section aria-labelledby="palette-title" className="flex flex-col gap-5">
            <SectionHeader
              id="palette-title"
              eyebrow="Nº 03"
              title="Your palette"
              action={
                <LinkButton href={routes.palette(session.id)} variant="ghost" size="sm" iconRight={ArrowRight}>
                  Explore
                </LinkButton>
              }
            />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {result.recommendedColors.map((color, i) => (
                <li key={color.id} className="relative animate-enter-up" style={staggerStyle(i)}>
                  <ColorSwatch name={color.name} hex={color.hex} variant="tile" favorite={colorDetail.isFavorite(color.hex)} onClick={() => colorDetail.open(color)} />
                  {color.role === 'accent' ? <Badge label="Accent" className="absolute right-2 bottom-2" /> : null}
                </li>
              ))}
            </ul>
          </section>

          {/* ── 04 Neutrals ─────────────────────────────────────────────────── */}
          <section aria-labelledby="neutrals-title" className="flex flex-col gap-5">
            <SectionHeader id="neutrals-title" eyebrow="Nº 04" title="Balanced neutrals" description="Your base layer: trousers, outerwear, shoes." />
            <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6">
              {result.neutralColors.map((n) => (
                <li key={n.id}>
                  <ColorSwatch name={n.name} hex={n.hex} favorite={colorDetail.isFavorite(n.hex)} onClick={() => colorDetail.open(n)} />
                </li>
              ))}
            </ul>
          </section>

          {/* ── 05 Try with care ────────────────────────────────────────────── */}
          {result.experimentalColors.length ? (
            <section aria-labelledby="care-title" className="flex flex-col gap-4">
              <SectionHeader id="care-title" eyebrow="Nº 05" title="Try with care" description="At the edge of your estimated range. Wear them away from your face." />
              <ul className="flex flex-col gap-3">
                {result.experimentalColors.map((x) => (
                  <li key={x.id}>
                    <button
                      type="button"
                      onClick={() => colorDetail.open(x)}
                      className="flex w-full items-start gap-4 rounded-md border-[1.5px] border-line-warm bg-paper p-3 text-left transition-colors hover:border-navy">
                      <span aria-hidden className="size-12 shrink-0 border border-navy/20" style={{ backgroundColor: x.hex }} />
                      <span className="flex flex-col gap-1">
                        <span className="type-label text-navy">{x.name}</span>
                        <span className="type-body-s text-muted">{x.reason}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* ── 06 Combinations ─────────────────────────────────────────────── */}
          <section aria-labelledby="combos-title" className="flex flex-col gap-5">
            <SectionHeader id="combos-title" eyebrow="Nº 06" title="Combinations" />
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {result.combinations.map((combo) => (
                <li key={combo.id}>
                  <CombinationCard name={combo.name} hexes={combo.hexes} note={combo.note} className="h-full" />
                </li>
              ))}
            </ul>
          </section>

          {/* ── 07 How we got here ──────────────────────────────────────────── */}
          <section aria-labelledby="how-title" className="flex flex-col gap-3">
            <SectionHeader id="how-title" eyebrow="Nº 07" title="How we got here" />
            <p className="type-body-m max-w-2xl text-muted">{result.explanation}</p>
          </section>
        </div>
      </div>

      {/* ── Style statement ──────────────────────────────────────────────── */}
      <section aria-label="Your style statement" className="mt-16 border-y-[1.5px] border-navy" style={{ backgroundColor: lead, color: statementFg }}>
        <div className="page flex flex-col items-center gap-4 py-14 text-center md:py-20">
          <p className="type-eyebrow">Your style statement</p>
          <p className="type-display-l max-w-3xl font-normal italic">“{result.styleStatement}”</p>
        </div>
      </section>

      <div className="page mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {savedPalette ? (
          <LinkButton href="/colors" size="lg" icon={BookmarkCheck}>
            Saved — view in My Colors
          </LinkButton>
        ) : (
          <Button size="lg" icon={Bookmark} loading={savePalette.isPending} onClick={onSavePalette}>
            Save palette
          </Button>
        )}
        <LinkButton href={routes.gallery(session.id)} variant="accent" size="lg" iconRight={ArrowRight}>
          Explore outfit previews
        </LinkButton>
        <div className="flex gap-3">
          <LinkButton href={routes.palette(session.id)} variant="secondary" icon={PaletteIcon}>
            Palette
          </LinkButton>
          <LinkButton href={routes.gallery(session.id)} variant="secondary" icon={Shirt}>
            Outfits
          </LinkButton>
        </div>
      </div>

      {colorDetail.sheet}
      <AdjustSheet
        open={adjusting}
        result={result}
        saving={updateResult.isPending}
        onClose={() => setAdjusting(false)}
        onSave={(adjustments) =>
          updateResult.mutate(
            { id: session.id, result: adjustResult(result, adjustments) },
            {
              onSuccess: () => {
                setAdjusting(false);
                toast.success('Palette updated');
              },
              onError: (e) => toast.error(friendlyError(e).body),
            },
          )
        }
      />
    </article>
  );
}
