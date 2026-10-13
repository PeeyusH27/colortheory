import type { ReactNode } from 'react';

import { cx } from './cx';

interface RailProps {
  label: string;
  children: ReactNode;
  /** Card width (CSS length) on phones; wider screens use `wideItemWidth`. */
  itemWidth?: string;
  wideItemWidth?: string;
  className?: string;
}

/**
 * Horizontal, scroll-snapping row of cards (palettes, combinations, outfits). Aligned to the page
 * gutter, focusable so keyboard users can scroll it, and labelled as a region.
 */
export function Rail({ label, children, itemWidth = '15rem', wideItemWidth = '17rem', className }: RailProps) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cx(
        'scrollbar-none rail-gutter -my-3 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain py-3',
        '[--rail-item:var(--rail-sm)] md:[--rail-item:var(--rail-md)]',
        className,
      )}
      style={{ ['--rail-sm' as string]: itemWidth, ['--rail-md' as string]: wideItemWidth }}>
      {children}
    </div>
  );
}

/** Wraps one card inside a Rail so it snaps and keeps its width. */
export function RailItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('w-[var(--rail-item)] shrink-0 snap-start', className)}>{children}</div>;
}
