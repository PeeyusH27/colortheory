import Link from 'next/link';

import { Blob } from '@/components/brand/Blob';
import { Logo } from '@/components/brand/Logo';
import { LinkButton } from '@/components/ui/Button';
import { palette } from '@/theme/colors';

export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <Blob seed={37} color={palette.sky} className="absolute -top-24 -right-24 -z-10 w-96 opacity-70" />
      <Blob seed={41} color={palette.coral} className="absolute -bottom-20 -left-16 -z-10 w-64 opacity-60" />
      <header className="page flex h-16 items-center">
        <Link href="/" aria-label="ColorTheory home">
          <Logo size="sm" />
        </Link>
      </header>
      <main id="main" className="page flex flex-1 flex-col items-start justify-center gap-5 pb-24">
        <p className="type-eyebrow text-coral-text">404 · Off-palette</p>
        <h1 className="type-display-l max-w-xl text-navy">
          This page isn’t in <span className="font-normal italic">our</span> colours.
        </h1>
        <p className="type-body-l max-w-md text-muted">The link may be old, or the item was deleted.</p>
        <LinkButton href="/discover" size="lg">
          Back to Discover
        </LinkButton>
      </main>
    </div>
  );
}
