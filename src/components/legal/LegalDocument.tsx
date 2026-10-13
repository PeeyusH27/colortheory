import Link from 'next/link';

import { Logo } from '@/components/brand/Logo';
import { InlineAlert } from '@/components/ui/InlineAlert';
import type { LegalSection } from '@/constants/legal';

/** In-app summaries of what this codebase does with data. Not a substitute for reviewed policies. */
export function LegalDocument({ eyebrow, title, sections }: { eyebrow: string; title: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-dvh">
      <header className="page flex h-16 items-center">
        <Link href="/" aria-label="ColorTheory home">
          <Logo size="sm" />
        </Link>
      </header>
      <main id="main" className="page flex max-w-3xl flex-col gap-8 pt-6 pb-20">
        <div className="flex flex-col gap-2">
          <p className="type-eyebrow text-coral-text">{eyebrow}</p>
          <h1 className="type-h1 text-navy">{title}</h1>
        </div>
        <InlineAlert tone="warning" title="Summary, not a legal document">
          This describes what the ColorTheory code does. The operator of this site should publish a reviewed privacy policy and terms and
          link them here.
        </InlineAlert>
        <div className="flex flex-col gap-7">
          {sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-2">
              <h2 className="type-h3 text-navy">{section.heading}</h2>
              <p className="type-body-m text-muted">{section.body}</p>
            </section>
          ))}
        </div>
        <nav aria-label="Legal" className="type-label flex gap-5 border-t border-line-warm pt-6 text-denim">
          <Link href="/legal/privacy" className="underline-offset-4 hover:underline">
            Privacy
          </Link>
          <Link href="/legal/terms" className="underline-offset-4 hover:underline">
            Terms
          </Link>
          <Link href="/discover" className="underline-offset-4 hover:underline">
            Back to ColorTheory
          </Link>
        </nav>
      </main>
    </div>
  );
}
