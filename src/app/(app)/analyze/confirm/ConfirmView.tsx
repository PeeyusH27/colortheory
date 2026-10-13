'use client';

import { ArrowRight, Cloud, FlaskConical, MonitorSmartphone, RotateCcw, Trash2, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ImageQualityNotice } from '@/components/camera/ImageQualityNotice';
import { PageHeader } from '@/components/layout/PageHeader';
import { PortraitFrame } from '@/components/outfits/PortraitFrame';
import { Button, LinkButton } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { cx } from '@/components/ui/cx';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { EmptyState } from '@/components/ui/States';
import { useAnalysisStore } from '@/features/analysis/analysisStore';
import { useQualityPreview } from '@/features/analysis/useQualityPreview';
import { selectIsDemo, useAuthStore } from '@/features/auth/authStore';
import { PortraitUploadButton } from '@/features/camera/PortraitUploadButton';
import { usePortraitStore } from '@/features/camera/portraitStore';
import { availableAnalysisMethods, defaultAnalysisMethod, type AnalysisMethod } from '@/services/color-analysis';
import { usePreferencesStore } from '@/store/preferencesStore';

const METHOD_COPY: Record<AnalysisMethod, { icon: LucideIcon; title: string; body: string }> = {
  device: {
    icon: MonitorSmartphone,
    title: 'In this browser',
    body: 'Private and offline. A heuristic estimate from the pixels in your face guide — nothing is uploaded.',
  },
  cloud: {
    icon: Cloud,
    title: 'Cloud analysis',
    body: 'Uploads the portrait to your private storage and asks an AI vision model for a second opinion.',
  },
  demo: {
    icon: FlaskConical,
    title: 'Demo results',
    body: 'Sample palette for exploring the app. Your photo is not analysed.',
  },
};

export function ConfirmView() {
  const router = useRouter();
  const portrait = usePortraitStore((s) => s.portrait);
  const discard = usePortraitStore((s) => s.discard);
  const configure = useAnalysisStore((s) => s.configure);
  const status = useAuthStore((s) => s.status);
  const isDemo = useAuthStore(selectIsDemo);
  const storagePreference = usePreferencesStore((s) => s.portraitStorage);
  const signedIn = status === 'signedIn';
  const methods = availableAnalysisMethods({ signedIn });
  const [method, setMethod] = useState<AnalysisMethod>(isDemo ? 'device' : defaultAnalysisMethod({ signedIn }));
  const [keepInCloud, setKeepInCloud] = useState(signedIn && storagePreference === 'cloud');
  const [consent, setConsent] = useState(false);
  const quality = useQualityPreview(portrait);

  const upload = method === 'cloud' || keepInCloud;
  const blocking = quality.data?.issues.some((i) => i.severity === 'blocking') ?? false;
  const canContinue = Boolean(portrait) && !quality.isError && (!upload || consent);

  const cancel = () => {
    discard();
    router.replace('/discover');
  };

  const proceed = () => {
    configure({ method, upload, keepInCloud: keepInCloud && signedIn, consentedAt: upload && consent ? new Date().toISOString() : null });
    router.push('/analyze/progress');
  };

  if (!portrait) {
    return (
      <div className="page">
        <EmptyState
          title="No portrait selected"
          body="Photos are kept in memory only, so reloading the page clears them. Take a new portrait or upload one."
          action={
            <>
              <LinkButton href="/analyze">Open camera</LinkButton>
              <PortraitUploadButton variant="secondary" />
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="page flex flex-col gap-6">
      <PageHeader eyebrow="Step 2 of 3 · Confirm" title="Happy with this photo?" back={{ href: '/analyze', label: 'Retake' }} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-14">
        <div className="flex flex-col gap-5">
          <PortraitFrame uri={portrait.url} shadow="offset-coral" alt="Your selected portrait" className="mx-auto w-full max-w-xs animate-enter-up lg:max-w-none" />
          <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
            <LinkButton href="/analyze" variant="secondary" size="sm" icon={RotateCcw}>
              Retake
            </LinkButton>
            <PortraitUploadButton variant="secondary" size="sm" label="Choose another" />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <p className="type-body-m text-muted">
            Lighting and camera processing (white balance, beauty modes, HDR) change how colour is recorded, which affects your
            recommendations. A daylight photo facing a window works best.
          </p>
          <ImageQualityNotice report={quality.data ?? null} loading={quality.isPending} />
          {quality.isError ? (
            <InlineAlert tone="error" role="alert">
              We couldn’t read this image. Try another photo.
            </InlineAlert>
          ) : null}

          <fieldset className="flex flex-col gap-3">
            <legend className="type-eyebrow mb-3 text-muted">How should we analyse it?</legend>
            {methods.map((m) => {
              const copy = METHOD_COPY[m];
              const selected = method === m;
              return (
                <label
                  key={m}
                  className={cx(
                    'flex cursor-pointer gap-3 rounded-md border-[1.5px] bg-paper p-4 transition-colors duration-150 has-[:focus-visible]:outline-[2.5px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-denim',
                    selected ? 'border-navy shadow-offset-sm' : 'border-line hover:border-navy/50',
                  )}>
                  <input type="radio" name="method" value={m} checked={selected} onChange={() => setMethod(m)} className="mt-1 size-4 accent-navy" />
                  <span className="flex flex-col gap-1">
                    <span className="type-label flex items-center gap-2 text-navy">
                      <copy.icon aria-hidden size={16} />
                      {copy.title}
                    </span>
                    <span className="type-body-s text-muted">{copy.body}</span>
                  </span>
                </label>
              );
            })}
            {!signedIn ? (
              <p className="type-caption text-muted">Cloud analysis and cloud storage need an account. In demo mode everything stays in this browser.</p>
            ) : null}
          </fieldset>

          {signedIn ? (
            <fieldset className="flex flex-col gap-3">
              <legend className="type-eyebrow mb-3 text-muted">Where should the portrait live?</legend>
              <Checkbox
                checked={keepInCloud}
                onChange={setKeepInCloud}
                label="Keep it in my private cloud storage"
                description="Needed for AI outfit previews and viewing on other devices. Otherwise it stays in this browser only."
              />
            </fieldset>
          ) : null}

          {upload ? (
            <div className="flex flex-col gap-3 rounded-md border-[1.5px] border-coral bg-paper p-4">
              <Checkbox
                checked={consent}
                onChange={setConsent}
                label="I consent to uploading this portrait"
                description={
                  method === 'cloud'
                    ? 'It goes to your private storage (only your account can read it) and is sent to our AI provider via a link that expires in minutes. You can delete it any time.'
                    : 'It goes to your private storage; only your account can read it. You can delete it any time.'
                }
              />
              <Link href="/legal/privacy" className="type-label self-start text-denim underline underline-offset-4" target="_blank">
                How we handle portraits
              </Link>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="accent" size="lg" iconRight={ArrowRight} disabled={!canContinue} onClick={proceed}>
              {blocking ? 'Continue to analysis anyway' : 'Continue to analysis'}
            </Button>
            <Button variant="ghost" icon={Trash2} className="text-coral-text" onClick={cancel}>
              Delete photo and cancel
            </Button>
          </div>
          {upload && !consent ? <p className="type-caption -mt-2 text-muted">Tick the consent box to continue.</p> : null}
        </div>
      </div>
    </div>
  );
}
