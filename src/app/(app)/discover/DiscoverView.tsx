'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Camera } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { LatestStoryCard } from '@/components/analysis/LatestStoryCard';
import { Blob } from '@/components/brand/Blob';
import { ColorPaletteCard } from '@/components/colors/ColorPaletteCard';
import { CombinationCard } from '@/components/colors/CombinationCard';
import { PaletteStrip } from '@/components/colors/PaletteStrip';
import { SectionHeader } from '@/components/layout/PageHeader';
import { OutfitCard } from '@/components/outfits/OutfitCard';
import { Button, LinkButton } from '@/components/ui/Button';
import { Rail, RailItem } from '@/components/ui/Rail';
import { Skeleton } from '@/components/ui/States';
import { toast } from '@/components/ui/Toast';
import { seedDemoAnalysis } from '@/features/analysis/seedDemoAnalysis';
import { selectIsDemo, useAuthStore } from '@/features/auth/authStore';
import { PortraitUploadButton } from '@/features/camera/PortraitUploadButton';
import { queryKeys, useLatestAnalysis, usePalettes, useRepository } from '@/features/data/queries';
import { recommendOutfits } from '@/features/outfits/recommendOutfits';
import { useShare } from '@/features/outfits/useShareOutfit';
import { useOutfitSaving } from '@/features/outfits/useOutfitSaving';
import { EDITORS_PALETTE } from '@/mocks/demoAnalysis';
import { STYLE_PRINCIPLES, TRENDING_COMBINATIONS } from '@/mocks/editorial';
import { routes } from '@/lib/routes';
import { useClientValue } from '@/lib/useClientValue';
import { palette } from '@/theme/colors';
import { staggerStyle } from '@/theme/motion';
import { greetingFor } from '@/utils/format';

function Hero({ onSample, sampling }: { onSample?: () => void; sampling: boolean }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="editorial-frame relative isolate flex animate-enter-up flex-col gap-4 overflow-hidden bg-ink p-6 pt-8 shadow-offset sm:p-8 lg:p-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <Blob seed={11} color={palette.denim} className="absolute -top-[30%] -right-[22%] w-[68%] max-w-md" />
        <Blob seed={41} color={palette.coral} className="absolute top-[18%] -right-[4%] w-[28%] max-w-48" />
        <Blob seed={53} color={palette.sky} className="absolute top-[52%] -right-[10%] w-[20%] max-w-36" />
      </div>
      <p className="type-eyebrow text-sky">Nº 01 — Your colour edit</p>
      <h2 id="hero-title" className="type-display-l max-w-[12ch] text-cream">
        Discover your <span className="font-normal text-sky italic">colours</span>
      </h2>
      <p className="type-body-m max-w-sm text-cream/85">One portrait in good light. A palette, combinations and outfits that work with your colouring.</p>
      <div className="mt-2 flex flex-wrap gap-3">
        <LinkButton href="/analyze" variant="accent" icon={Camera}>
          Analyze my look
        </LinkButton>
        <PortraitUploadButton variant="secondary" tone="cream" label="Upload" />
      </div>
      {onSample ? (
        <Button variant="ghost" tone="cream" className="self-start text-sky underline" onClick={onSample} loading={sampling}>
          No camera? See a sample result (demo)
        </Button>
      ) : null}
    </section>
  );
}

export function DiscoverView() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isDemo = useAuthStore(selectIsDemo);
  const { latest, isPending } = useLatestAnalysis();
  const palettes = usePalettes();
  const source = latest?.result ?? EDITORS_PALETTE;
  const personal = Boolean(latest?.result);
  const outfits = recommendOutfits(source, { limit: 8, includeExperimental: false });
  const saving = useOutfitSaving(latest?.id ?? null, source.isDemo);
  const share = useShare();
  const queryClient = useQueryClient();
  const repo = useRepository();
  const [sampling, setSampling] = useState(false);
  const firstName = user?.displayName?.split(' ')[0];
  const greeting = useClientValue(() => greetingFor(), 'Welcome');
  // Magazine-style section numbers stay sequential whether or not "latest story" is shown.
  const sectionNo = (n: number) => `Nº ${String(personal ? n : n - 1).padStart(2, '0')}`;

  const showSample = async () => {
    setSampling(true);
    try {
      const id = await seedDemoAnalysis();
      await queryClient.invalidateQueries({ queryKey: queryKeys.all(repo.scope) });
      router.push(routes.results(id));
    } catch {
      toast.error('We couldn’t create the sample.');
      setSampling(false);
    }
  };

  return (
    <div className="flex flex-col gap-12 pb-4 md:gap-16">
      <div className="page flex flex-col gap-6 pt-6 md:pt-10">
        <header className="flex animate-enter-up items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="type-eyebrow text-muted">{greeting}</p>
            <h1 className="type-h1 text-navy">{firstName ? `${firstName}.` : 'Hello.'}</h1>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
          <Hero onSample={isDemo && !isPending && !latest ? () => void showSample() : undefined} sampling={sampling} />
          {isPending ? (
            <Skeleton className="h-40" />
          ) : latest?.result ? (
            <section aria-labelledby="latest-title" className="flex animate-enter-up flex-col gap-4" style={staggerStyle(1)}>
              <SectionHeader
                id="latest-title"
                eyebrow="Nº 02"
                title="Your latest story"
                action={
                  <LinkButton href="/history" variant="ghost" size="sm">
                    History
                  </LinkButton>
                }
              />
              <LatestStoryCard session={latest} />
            </section>
          ) : null}
        </div>
      </div>

      <section aria-labelledby="palettes-title" className="flex flex-col gap-5">
        <SectionHeader
          id="palettes-title"
          className="page"
          eyebrow={sectionNo(3)}
          title="Saved palettes"
          action={
            palettes.data?.length ? (
              <LinkButton href="/colors" variant="ghost" size="sm" iconRight={ArrowRight}>
                All
              </LinkButton>
            ) : undefined
          }
        />
        {palettes.data?.length ? (
          <Rail label="Saved palettes" itemWidth="11.5rem" wideItemWidth="13rem">
            {palettes.data.slice(0, 8).map((p) => (
              <RailItem key={p.id}>
                <Link href={p.analysisId ? routes.palette(p.analysisId) : '/colors'} className="block" aria-label={`Open ${p.name}`}>
                  <ColorPaletteCard name={p.name} colors={p.colors} createdAt={p.createdAt} isFavorite={p.isFavorite} />
                </Link>
              </RailItem>
            ))}
          </Rail>
        ) : (
          <div className="page">
            <div className="flex flex-col gap-3 rounded-md border-[1.5px] border-dashed border-line-warm p-5">
              <PaletteStrip
                colors={[
                  { name: 'Linen', hex: palette.linen },
                  { name: 'Sand', hex: palette.sand },
                  { name: 'Mist', hex: palette.mist },
                  { name: 'Linen', hex: palette.linen },
                ]}
                height={36}
                label="Empty palette placeholder"
              />
              <p className="type-body-s text-muted">Palettes you save from your results appear here.</p>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="trending-title" className="flex flex-col gap-5">
        <SectionHeader id="trending-title" className="page" eyebrow={sectionNo(4)} title="Trending combinations" description="Curated by the ColorTheory editors." />
        <Rail label="Trending combinations" itemWidth="14rem" wideItemWidth="16rem">
          {TRENDING_COMBINATIONS.map((c) => (
            <RailItem key={c.id}>
              <CombinationCard name={c.name} hexes={c.hexes} note={c.note} tag={c.season} className="h-full" />
            </RailItem>
          ))}
        </Rail>
      </section>

      <section aria-labelledby="outfits-title" className="flex flex-col gap-5">
        <SectionHeader
          id="outfits-title"
          className="page"
          eyebrow={sectionNo(5)}
          title="Outfit inspiration"
          description={personal ? 'Built from your latest palette.' : 'Editor’s picks from a sample palette — analyse your look to personalise.'}
          action={
            <LinkButton href="/outfits" variant="ghost" size="sm" iconRight={ArrowRight}>
              More
            </LinkButton>
          }
        />
        <Rail label="Outfit inspiration" itemWidth="16rem" wideItemWidth="18rem">
          {outfits.map((o) => (
            <RailItem key={o.id}>
              <OutfitCard
                outfit={o}
                href={routes.outfit(latest?.id ?? null, o.id)}
                saved={saving.savedIds.has(o.id)}
                onToggleSave={personal ? () => saving.toggle(o) : undefined}
                onShare={() => share.outfit(o)}
              />
            </RailItem>
          ))}
        </Rail>
      </section>

      <section aria-labelledby="manifesto-title" className="page">
        <div className="editorial-frame flex flex-col gap-6 bg-ink p-6 text-cream shadow-offset-coral sm:p-10">
          <p className="type-eyebrow text-sky">{sectionNo(6)} — Manifesto</p>
          <h2 id="manifesto-title" className="type-display-l">
            Your colours, <span className="font-normal text-coral italic">your rules.</span>
          </h2>
          <ol className="grid gap-6 md:grid-cols-2">
            {STYLE_PRINCIPLES.map((p, i) => (
              <li key={p.title} className="flex gap-4 border-t border-cream/20 pt-4">
                <span className="type-numeric text-sky">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex flex-col gap-1">
                  <span className="type-h3">{p.title}</span>
                  <span className="type-body-s text-cream/78">{p.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <LinkButton href="/analyze" variant="secondary" tone="cream" iconRight={ArrowRight} className="self-start">
            Start an analysis
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
