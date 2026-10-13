import { ArrowRight, Cloud, FlaskConical, MonitorSmartphone, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { DrapePanels, PaletteStack, SwatchFan } from '@/components/brand/EditorialArt';
import { Logo } from '@/components/brand/Logo';
import { SplashShapes } from '@/components/brand/SplashShapes';
import { LandingAccountLink } from '@/components/layout/LandingAccountLink';
import { LinkButton } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { isSupabaseConfigured } from '@/constants/config';
import { DemoEntry } from '@/features/auth/DemoEntry';

const CHAPTERS: { eyebrow: string; title: string; accent: string; body: string; background: string; art: ReactNode }[] = [
  {
    eyebrow: '01 — Discover',
    title: 'Discover your',
    accent: 'colours.',
    body: 'Take a portrait and see which shades work with your visible colouring — explained in plain language, not jargon.',
    background: 'bg-cream',
    art: <SwatchFan />,
  },
  {
    eyebrow: '02 — Preview',
    title: 'See yourself in',
    accent: 'new styles.',
    body: 'Hold each colour up to your own photo with a digital drape, then explore outfit combinations built around it.',
    background: 'bg-sand',
    art: <DrapePanels />,
  },
  {
    eyebrow: '03 — Collect',
    title: 'Build your personal',
    accent: 'palette.',
    body: 'Save palettes, favourite colours and outfits. Revisit any analysis and adjust it when your style evolves.',
    background: 'bg-mist',
    art: <PaletteStack />,
  },
];

const PROMISES = [
  {
    icon: MonitorSmartphone,
    title: 'Analysed in your browser',
    body: 'By default your photo is decoded on this device. Nothing is uploaded, and location metadata is stripped.',
  },
  {
    icon: Cloud,
    title: 'Cloud is opt-in, every time',
    body: 'Cloud analysis and AI previews ask first, use private storage only you can read, and expiring links.',
  },
  {
    icon: Sparkles,
    title: 'Honest labels',
    body: 'Estimates say they’re estimates. AI previews say they’re approximations. Sample content says “Demo”.',
  },
];

export default function Landing() {
  return (
    <>
      <header className="absolute inset-x-0 top-0 z-20">
        <nav aria-label="Main" className="page flex h-16 items-center justify-between">
          <Logo size="sm" inverse />
          <LandingAccountLink />
        </nav>
      </header>

      <main id="main">
        <section aria-labelledby="hero-title" className="relative isolate flex min-h-[min(100dvh,56rem)] items-center overflow-hidden bg-ink text-cream">
          <SplashShapes className="-z-10 opacity-95" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgb(13_22_38/0.82)_0%,rgb(13_22_38/0.45)_45%,transparent_75%)]" />
          <div className="page flex flex-col items-center gap-8 py-28 text-center">
            <p className="type-eyebrow animate-fade-in text-sky [animation-delay:500ms]">Personal colour studio</p>
            <h1 id="hero-title" className="type-display-xl animate-wordmark [animation-delay:350ms]">
              Color<span className="font-normal italic">Theory</span>
            </h1>
            <p className="type-editorial max-w-xl animate-enter-up text-cream/90 [animation-delay:700ms]">
              Your colours, decoded. A portrait, a palette and outfits that work with you — not against you.
            </p>
            <div className="flex animate-enter-up flex-col items-center gap-4 [animation-delay:850ms] sm:flex-row">
              {isSupabaseConfigured ? (
                <>
                  <LinkButton href="/sign-up" variant="accent" size="lg" iconRight={ArrowRight}>
                    Create a free account
                  </LinkButton>
                  <LinkButton href="/sign-in" variant="secondary" tone="cream" size="lg">
                    I have an account
                  </LinkButton>
                </>
              ) : null}
            </div>
            <DemoEntry tone="cream" align="center" className="animate-fade-in [animation-delay:1000ms]" />
          </div>
        </section>

        {CHAPTERS.map((chapter, i) => (
          <section key={chapter.eyebrow} aria-labelledby={`chapter-${i}`} className={cx(chapter.background, 'border-b-[1.5px] border-navy')}>
            <div className={cx('page grid items-center gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-24')}>
              <div className={cx('flex flex-col gap-4', i % 2 === 1 && 'md:order-2')}>
                <p className="type-eyebrow text-muted">{chapter.eyebrow}</p>
                <h2 id={`chapter-${i}`} className="type-display-l text-navy">
                  {chapter.title} <span className="font-normal text-denim italic">{chapter.accent}</span>
                </h2>
                <p className="type-body-l max-w-md text-muted">{chapter.body}</p>
              </div>
              <div className="mx-auto w-full max-w-md">{chapter.art}</div>
            </div>
          </section>
        ))}

        <section aria-labelledby="privacy-title" className="bg-ink text-cream">
          <div className="page flex flex-col gap-10 py-16 md:py-24">
            <div className="flex max-w-2xl flex-col gap-3">
              <p className="type-eyebrow flex items-center gap-2 text-sky">
                <ShieldCheck aria-hidden size={16} /> Private by default
              </p>
              <h2 id="privacy-title" className="type-display-l">
                Your face is <span className="font-normal italic">yours</span>.
              </h2>
            </div>
            <ul className="grid gap-6 md:grid-cols-3">
              {PROMISES.map((p) => (
                <li key={p.title} className="flex flex-col gap-3 border-t border-cream/25 pt-5">
                  <p.icon aria-hidden size={24} strokeWidth={1.7} className="text-sky" />
                  <h3 className="type-h3">{p.title}</h3>
                  <p className="type-body-m text-inverse-muted">{p.body}</p>
                </li>
              ))}
            </ul>
            <div className="flex flex-col items-start gap-5 border-t border-cream/25 pt-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="type-body-m flex items-start gap-2 text-inverse-muted">
                <FlaskConical aria-hidden size={18} className="mt-0.5 shrink-0" />
                Colour results are styling suggestions from one photo — not a medical or scientific assessment.
              </p>
              {isSupabaseConfigured ? (
                <LinkButton href="/sign-up" variant="accent" iconRight={ArrowRight}>
                  Get started
                </LinkButton>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-cream">
        <div className="page type-caption flex flex-col gap-3 py-8 text-muted sm:flex-row sm:items-center sm:justify-between">
          <Logo size="sm" />
          <nav aria-label="Legal" className="flex gap-5">
            <Link href="/legal/privacy" className="hover:text-navy hover:underline">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-navy hover:underline">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
