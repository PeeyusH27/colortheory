import Link from 'next/link';
import type { ReactNode } from 'react';

import { Blob } from '@/components/brand/Blob';
import { DrapePanels } from '@/components/brand/EditorialArt';
import { Logo } from '@/components/brand/Logo';
import { palette } from '@/theme/colors';

interface AuthScaffoldProps {
  eyebrow: string;
  title: string;
  deck?: string;
  /** Brand accent for the decorative blob on this page. */
  accent?: string;
  children: ReactNode;
}

/**
 * Shared frame for auth pages: an editorial panel (desktop) beside a single-column form. Purely
 * presentational, so it renders on the server; forms inside are client components.
 */
export function AuthScaffold({ eyebrow, title, deck, accent = palette.sky, children }: AuthScaffoldProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside aria-hidden className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Blob seed={41} color={accent} className="absolute -top-24 -right-24 w-[70%] opacity-90" />
        <Blob seed={53} color={palette.denim} className="absolute -bottom-32 -left-20 w-[60%] opacity-80" />
        <Logo inverse />
        <div className="relative">
          <DrapePanels className="max-w-md" />
          <p className="type-editorial mt-10 max-w-sm text-cream">“Colour is the first thing people notice — and the easiest thing to get right.”</p>
        </div>
      </aside>
      <div className="flex flex-col">
        <header className="page flex h-16 items-center justify-between lg:hidden">
          <Link href="/" aria-label="ColorTheory home">
            <Logo size="sm" />
          </Link>
        </header>
        <main id="main" className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:px-6 lg:items-center lg:pt-16">
          <div className="flex w-full max-w-md flex-col gap-6">
            <div className="relative isolate flex flex-col gap-2">
              <Blob seed={7} color={accent} className="absolute -top-6 -left-8 -z-10 w-28 opacity-70 lg:hidden" />
              <p className="type-eyebrow text-coral-text">{eyebrow}</p>
              <h1 className="type-h1 text-navy">{title}</h1>
              {deck ? <p className="type-body-l text-muted">{deck}</p> : null}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/** Placeholder while a form that reads the URL streams in. */
export function FormSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-5">
      <div className="h-[4.5rem] animate-pulse-soft rounded-md bg-linen/70" />
      <div className="h-[4.5rem] animate-pulse-soft rounded-md bg-linen/70" />
      <div className="h-11 animate-pulse-soft rounded-full bg-linen/70" />
    </div>
  );
}
