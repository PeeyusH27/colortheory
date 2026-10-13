'use client';

/* eslint-disable @next/next/no-img-element -- AI previews are short-lived signed URLs from private storage */
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, RefreshCw, Share2, Sparkles } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { DrapePreview } from '@/components/outfits/DrapePreview';
import { OutfitFlatLay } from '@/components/outfits/OutfitFlatLay';
import { ShopLinks } from '@/components/shop/ShopLinks';
import { Badge, ProvenanceBadge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconButton } from '@/components/ui/IconButton';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { toast } from '@/components/ui/Toast';
import { useAnalysis, usePortraitUri, useRemoveSavedOutfit, useSaveOutfit, useSavedOutfits } from '@/features/data/queries';
import { outfitsForColor } from '@/features/outfits/recommendOutfits';
import { shareRemoteImage } from '@/features/outfits/share';
import { useOutfitPreviewGeneration } from '@/features/outfits/useOutfitPreviewGeneration';
import { useShare } from '@/features/outfits/useShareOutfit';
import { EDITORIAL_ID, routes } from '@/lib/routes';
import { EDITORS_PALETTE } from '@/mocks/demoAnalysis';
import type { Occasion, Outfit } from '@/types/outfits';
import { friendlyError } from '@/utils/errors';

type Visual = 'outfit' | 'drape' | 'ai';

const OCCASIONS: Record<Occasion, string> = {
  work: 'Work',
  weekend: 'Weekend',
  evening: 'Evening',
  travel: 'Travel',
  event: 'Events',
  everyday: 'Every day',
};

export function OutfitView() {
  const params = useParams<{ analysisId: string; outfitId: string }>();
  const outfitId = decodeURIComponent(params.outfitId);
  const editorial = params.analysisId === EDITORIAL_ID;
  const analysis = useAnalysis(editorial ? undefined : params.analysisId);
  const portraitUri = usePortraitUri(analysis.data);
  const result = editorial ? EDITORS_PALETTE : (analysis.data?.result ?? null);
  const session = editorial ? null : (analysis.data ?? null);

  const colorId = outfitId.split('--')[1];
  const color = result ? [...result.recommendedColors, ...result.experimentalColors].find((c) => c.id === colorId) : undefined;
  const variations: Outfit[] = color && result ? outfitsForColor(color, result) : [];
  const [currentId, setCurrentId] = useState(outfitId);
  const [visual, setVisual] = useState<Visual>('outfit');
  const [consent, setConsent] = useState(false);
  const index = Math.max(0, variations.findIndex((o) => o.id === currentId));
  const outfit = variations[index] ?? null;

  const saved = useSavedOutfits();
  const save = useSaveOutfit();
  const remove = useRemoveSavedOutfit();
  const generation = useOutfitPreviewGeneration(session, outfit);
  const share = useShare();
  const ready = Boolean(outfit && result);

  // Arriving from a card's "Shop" button (`#shop`): scroll once the outfit has rendered.
  useEffect(() => {
    if (!ready || window.location.hash !== '#shop') return;
    document.getElementById('shop')?.scrollIntoView({ block: 'start' });
  }, [ready]);

  if (!editorial && analysis.isPending) return <LoadingState label="Loading outfit" className="min-h-[50dvh]" />;
  if (!outfit || !result) {
    return (
      <div className="page py-10">
        <ErrorState
          error={analysis.error ?? undefined}
          code={analysis.error ? undefined : 'not_found'}
          title={analysis.error ? undefined : 'Outfit not found'}
          body={analysis.error ? undefined : 'This outfit may belong to a deleted analysis.'}
          secondary={
            <LinkButton href="/outfits" variant="secondary">
              All outfits
            </LinkButton>
          }
        />
      </div>
    );
  }

  const savedEntry = saved.data?.find((s) => s.preview.outfitId === outfit.id && s.preview.analysisId === (session?.id ?? null) && s.preview.mode === 'drape');
  const aiDone = generation.state.phase === 'done' ? generation.state.result : null;

  const goTo = (i: number) => {
    const next = variations[i];
    if (!next) return;
    setCurrentId(next.id);
    generation.reset();
    // Keep the URL shareable without a navigation.
    window.history.replaceState(null, '', routes.outfit(session?.id ?? null, next.id));
  };

  const toggleSave = () => {
    if (editorial || !session) return;
    if (savedEntry) {
      remove.mutate(savedEntry.id, { onSuccess: () => toast.show('Removed from wardrobe') });
      return;
    }
    save.mutate(
      {
        analysisId: session.id,
        outfitId: outfit.id,
        outfitName: outfit.name,
        garmentHex: outfit.mainColor.hex,
        mode: 'drape',
        provider: 'template',
        generationStatus: 'not_requested',
        imageUri: null,
        imagePath: null,
        isDemo: result.isDemo,
      },
      { onSuccess: () => toast.success('Saved to your wardrobe'), onError: (e) => toast.error(friendlyError(e).body) },
    );
  };

  const saveAiPreview = () => {
    if (!aiDone || !session) return;
    save.mutate(
      {
        id: aiDone.isDemo ? undefined : aiDone.previewId,
        analysisId: session.id,
        outfitId: outfit.id,
        outfitName: outfit.name,
        garmentHex: outfit.mainColor.hex,
        mode: 'ai',
        provider: aiDone.provider,
        generationStatus: 'completed',
        imageUri: null,
        imagePath: aiDone.imagePath,
        isDemo: aiDone.isDemo,
      },
      { onSuccess: () => toast.success('Preview saved'), onError: (e) => toast.error(friendlyError(e).body) },
    );
  };

  const visualBadge = visual === 'ai' && aiDone ? (aiDone.isDemo ? 'demo' : 'ai') : result.isDemo ? 'demo' : visual === 'outfit' ? null : 'drape';

  const renderVisual = () => {
    if (visual === 'drape') return <DrapePreview hex={outfit.mainColor.hex} colorName={outfit.mainColor.name} portraitUri={portraitUri} aspect={1.2} />;
    if (visual === 'ai' && aiDone) {
      return aiDone.isDemo || !aiDone.imageUri ? (
        <div className="relative">
          <DrapePreview hex={outfit.mainColor.hex} colorName={outfit.mainColor.name} portraitUri={portraitUri} aspect={1.2} />
          <p className="type-eyebrow absolute inset-x-4 top-[42%] -rotate-4 bg-saffron py-2 text-center text-ink">Demo · not a real AI try-on</p>
        </div>
      ) : (
        <img src={aiDone.imageUri} alt={`AI-generated preview of you wearing ${outfit.name}. An approximation.`} className="aspect-[1/1.3] w-full object-cover" />
      );
    }
    return <OutfitFlatLay pieces={outfit.pieces} />;
  };

  const aiPanel = () => {
    if (editorial) {
      return <InlineAlert tone="info">AI previews use your own portrait. Run an analysis first, then open an outfit from your results.</InlineAlert>;
    }
    if (!generation.provider) {
      return <InlineAlert tone="info">AI previews are turned off on this site. The colour drape shows the colour against your photo.</InlineAlert>;
    }
    const s = generation.state;
    if (s.phase === 'uploading') return <LoadingState label={`Uploading portrait… ${Math.round(s.progress * 100)}%`} className="py-8" />;
    if (s.phase === 'running') {
      return (
        <div className="flex flex-col items-center gap-2 rounded-md border-[1.5px] border-navy bg-paper p-4">
          <LoadingState
            className="py-4"
            label={
              generation.isRemote
                ? s.status === 'queued'
                  ? 'Queued with the try-on service'
                  : 'Generating your preview — usually 5–20 seconds'
                : `Demo: simulating the ${s.status === 'queued' ? 'queue' : 'generation'} step`
            }
          />
          <Button variant="ghost" onClick={generation.cancel}>
            Cancel
          </Button>
        </div>
      );
    }
    if (s.phase === 'failed') {
      return (
        <ErrorState
          error={s.error}
          compact
          onRetry={() => void generation.generate({ consentToUpload: consent })}
          secondary={
            <Button variant="secondary" onClick={() => setVisual('drape')}>
              Use colour drape
            </Button>
          }
        />
      );
    }
    if (s.phase === 'done') {
      return (
        <div className="flex flex-col gap-3 rounded-md border-[1.5px] border-navy bg-paper p-4">
          <ProvenanceBadge kind={s.result.isDemo ? 'demo' : 'ai'} />
          <p className="type-body-s text-muted">
            {s.result.isDemo
              ? 'Demo mode walks through the generation steps without calling an AI service. Configure the try-on provider to see a real preview.'
              : 'An approximation generated from your portrait. Faces, fabric and fit may not be reproduced exactly. Your original photo is unchanged.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" icon={RefreshCw} onClick={() => void generation.generate({ consentToUpload: consent })}>
              Generate another
            </Button>
            <Button onClick={saveAiPreview} loading={save.isPending}>
              Save preview
            </Button>
          </div>
          {!s.result.isDemo && s.result.imageUri ? (
            <Button
              variant="ghost"
              icon={Share2}
              className="self-start"
              onClick={() =>
                void shareRemoteImage(s.result.imageUri as string, `colortheory-${outfit.mainColor.id}.png`).catch(() => toast.error('The preview couldn’t be downloaded.'))
              }>
              Share preview image
            </Button>
          ) : null}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4 rounded-md border-[1.5px] border-navy bg-paper p-4">
        <h2 className="type-h3 text-navy">See yourself in this outfit</h2>
        <p className="type-body-s text-muted">
          {generation.isRemote
            ? 'We send your portrait and this outfit to our virtual try-on provider through a link that expires in minutes. The result is an approximation and is saved privately to your account.'
            : 'Demo mode: no image is sent anywhere and no AI image is produced. The result is clearly labelled as a demo.'}
        </p>
        {generation.needsUpload ? (
          generation.canUpload ? (
            <Checkbox
              checked={consent}
              onChange={setConsent}
              label="Upload this portrait to my private storage"
              description="Required for AI previews. Only your account can access it, and you can delete it in Settings."
            />
          ) : (
            <InlineAlert tone="warning">
              The portrait for this analysis isn’t in this browser anymore. Run a new analysis with cloud storage to use AI previews.
            </InlineAlert>
          )
        ) : null}
        <Button
          variant="accent"
          icon={Sparkles}
          disabled={generation.needsUpload && (!consent || !generation.canUpload)}
          onClick={() => void generation.generate({ consentToUpload: consent })}>
          {generation.isRemote ? 'Generate AI preview' : 'Run demo generation'}
        </Button>
      </div>
    );
  };

  return (
    <div className="page flex flex-col gap-6">
      <PageHeader
        back={editorial ? { href: '/outfits', label: 'Outfits' } : { href: routes.gallery(session?.id ?? ''), label: 'Gallery' }}
        eyebrow={`${outfit.category} · ${index + 1} of ${variations.length}`}
        title={outfit.name}
        actions={<IconButton icon={Share2} label={`Share ${outfit.name}`} tone="outline" onClick={() => share.outfit(outfit)} />}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-14">
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <SegmentedControl
            label="Preview type"
            value={visual}
            onChange={setVisual}
            className="self-start"
            options={[
              { value: 'outfit', label: 'Outfit' },
              { value: 'drape', label: 'Colour on me' },
              { value: 'ai', label: 'AI preview' },
            ]}
          />
          <div className="editorial-frame relative overflow-hidden bg-paper shadow-offset">
            <div key={`${outfit.id}-${visual}`} className="animate-fade-in">
              {renderVisual()}
            </div>
            {visualBadge ? <ProvenanceBadge kind={visualBadge} className="absolute top-3 left-3" /> : null}
          </div>
          {variations.length > 1 ? (
            <div className="flex items-center justify-between">
              <IconButton icon={ChevronLeft} label="Previous variation" tone="outline" onClick={() => goTo(index - 1)} disabled={index === 0} />
              <span className="type-caption text-muted" aria-live="polite">
                Variation {index + 1} of {variations.length}
              </span>
              <IconButton icon={ChevronRight} label="Next variation" tone="outline" onClick={() => goTo(index + 1)} disabled={index === variations.length - 1} />
            </div>
          ) : null}
          {visual === 'ai' ? <div className="animate-fade-in">{aiPanel()}</div> : null}
        </div>

        <div key={outfit.id} className="flex min-w-0 animate-fade-in flex-col gap-8">
          <div className="flex items-center gap-3">
            <span aria-hidden className="size-11 shrink-0 border-[1.5px] border-navy" style={{ backgroundColor: outfit.mainColor.hex }} />
            <span className="flex flex-col">
              <span className="type-eyebrow text-muted">Main colour</span>
              <span className="type-label text-navy">
                {outfit.mainColor.name} · <span className="type-hex">{outfit.mainColor.hex}</span>
              </span>
            </span>
          </div>
          <p className="type-body-l text-muted">{outfit.reason}</p>

          <section aria-labelledby="pieces-title" className="flex flex-col gap-3">
            <h2 id="pieces-title" className="type-eyebrow text-muted">
              The pieces
            </h2>
            <ul className="divide-y divide-line-warm rounded-md border-[1.5px] border-navy bg-paper">
              {outfit.pieces.map((p) => (
                <li key={`${p.garment}-${p.role}`} className="flex items-center gap-3 px-4 py-3">
                  <span aria-hidden className="size-6 shrink-0 border border-navy/30" style={{ backgroundColor: p.hex }} />
                  <span className="type-body-m flex-1 text-navy">
                    {p.colorName} {p.label.toLowerCase()}
                  </span>
                  <span className="type-hex text-muted">{p.hex}</span>
                </li>
              ))}
            </ul>
          </section>

          <ShopLinks
            id="shop"
            title="Shop this look"
            description="Find each piece in your colours at your favourite stores."
            items={[...outfit.pieces]
              .sort((a, b) => (a.role === 'main' ? -1 : b.role === 'main' ? 1 : 0))
              .map((p) => ({ colorName: p.colorName, hex: p.hex, garment: p.garment, label: p.label }))}
          />

          <section aria-labelledby="occasions-title" className="flex flex-col gap-3">
            <h2 id="occasions-title" className="type-eyebrow text-muted">
              Suitable for
            </h2>
            <div className="flex flex-wrap gap-2">
              {outfit.occasions.map((o) => (
                <Badge key={o} label={OCCASIONS[o]} />
              ))}
            </div>
          </section>

          <section aria-labelledby="accessories-title" className="flex flex-col gap-2">
            <h2 id="accessories-title" className="type-eyebrow text-muted">
              Matching accessories
            </h2>
            <ul className="type-body-m flex flex-col gap-1 text-navy">
              {outfit.accessories.map((a) => (
                <li key={a}>— {a}</li>
              ))}
            </ul>
          </section>

          {outfit.combinations.length ? (
            <section aria-labelledby="also-title" className="flex flex-col gap-2">
              <h2 id="also-title" className="type-eyebrow text-muted">
                Also try with {outfit.mainColor.name}
              </h2>
              <ul className="flex flex-col items-start">
                {outfit.combinations.map((c) => (
                  <li key={c}>
                    <Button variant="ghost" onClick={() => goTo(variations.findIndex((v) => v.name === c))}>
                      {c}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            {!editorial ? (
              <Button size="lg" icon={savedEntry ? BookmarkCheck : Bookmark} onClick={toggleSave} loading={save.isPending || remove.isPending} aria-pressed={Boolean(savedEntry)}>
                {savedEntry ? 'Saved to wardrobe' : 'Save to wardrobe'}
              </Button>
            ) : null}
            <Button
              size="lg"
              variant="secondary"
              icon={RefreshCw}
              onClick={() => (visual === 'ai' && aiDone ? void generation.generate({ consentToUpload: consent }) : goTo((index + 1) % variations.length))}>
              Another variation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
