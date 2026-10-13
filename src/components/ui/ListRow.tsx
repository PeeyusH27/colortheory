import { ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cx } from './cx';

interface ListRowProps {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  trailing?: ReactNode;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Settings/profile row. Renders as a link, a button, or static content. */
export function ListRow({ title, description, icon: Icon, trailing, href, external, onClick, destructive, disabled, className }: ListRowProps) {
  const body = (
    <>
      {Icon ? (
        <span
          className={cx(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            destructive ? 'bg-error-soft text-error' : 'bg-mist text-denim',
          )}>
          <Icon aria-hidden size={18} strokeWidth={1.9} />
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span className={cx('type-label', destructive ? 'text-error' : 'text-navy')}>{title}</span>
        {description ? <span className="type-body-s text-muted">{description}</span> : null}
      </span>
      {trailing ?? (href || onClick ? <ChevronRight aria-hidden size={18} className="shrink-0 text-slate" /> : null)}
    </>
  );
  const base = cx('flex min-h-16 w-full items-center gap-4 px-4 py-3', className);
  const interactive = 'transition-colors duration-150 hover:bg-sand/70 active:bg-sand disabled:opacity-50';

  if (href) {
    return external ? (
      <a href={href} target="_blank" rel="noreferrer noopener" className={cx(base, interactive)}>
        {body}
      </a>
    ) : (
      <Link href={href} className={cx(base, interactive)}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={cx(base, interactive)}>
        {body}
      </button>
    );
  }
  return <div className={base}>{body}</div>;
}

/** Card that groups ListRows with hairline separators. */
export function ListGroup({ children, label, className }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <section aria-label={label} className={cx('flex flex-col', className)}>
      {label ? <h2 className="type-eyebrow mb-2 px-1 text-muted">{label}</h2> : null}
      <div className="divide-y divide-line-warm overflow-hidden rounded-md border-[1.5px] border-navy bg-paper">{children}</div>
    </section>
  );
}
