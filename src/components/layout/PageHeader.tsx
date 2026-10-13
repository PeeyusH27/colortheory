import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cx } from '../ui/cx';

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  className?: string;
  size?: 'display' | 'h1';
}

/** Editorial page header: eyebrow, serif headline and an optional back link and actions. */
export function PageHeader({ eyebrow, title, subtitle, back, actions, className, size = 'h1' }: PageHeaderProps) {
  return (
    <header className={cx('flex flex-col gap-4 pt-6 pb-2 md:pt-10', className)}>
      {back ? (
        <Link
          href={back.href}
          className="type-label -ml-1 inline-flex min-h-10 items-center gap-1.5 self-start rounded-full pr-3 pl-1 text-navy hover:bg-navy/6">
          <ArrowLeft aria-hidden size={18} />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-3xl min-w-0 flex-col gap-2">
          {eyebrow ? <p className="type-eyebrow text-coral-text">{eyebrow}</p> : null}
          <h1 className={cx(size === 'display' ? 'type-display-l' : 'type-h1', 'text-navy')}>{title}</h1>
          {subtitle ? <div className="type-body-l text-muted">{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/** Section heading with an optional trailing link/action. */
export function SectionHeader({
  title,
  eyebrow,
  description,
  action,
  id,
  className,
}: {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cx('flex items-end justify-between gap-4', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? <p className="type-eyebrow text-muted">{eyebrow}</p> : null}
        <h2 id={id} className="type-h2 text-navy">
          {title}
        </h2>
        {description ? <div className="type-body-m text-muted">{description}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
