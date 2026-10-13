import { Heart } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatDate } from '@/utils/format';

import { cx } from '../ui/cx';

import { PaletteStrip } from './PaletteStrip';

interface ColorPaletteCardProps {
  name: string;
  colors: { name: string; hex: string }[];
  subtitle?: string;
  createdAt?: string;
  isFavorite?: boolean;
  /** Action buttons rendered in the card footer (rename, favourite, delete…). */
  actions?: ReactNode;
  className?: string;
}

/** Saved-palette card: a stacked colour block over a paper label, like a paint-chip card. */
export function ColorPaletteCard({ name, colors, subtitle, createdAt, isFavorite, actions, className }: ColorPaletteCardProps) {
  const lead = colors.slice(0, 6);
  return (
    <article className={cx('editorial-frame flex flex-col bg-paper shadow-offset-sm', className)}>
      <div aria-hidden className="h-24" style={{ backgroundColor: lead[0]?.hex ?? '#EDE6DA' }} />
      <PaletteStrip colors={lead.slice(1)} height={26} className="border-x-0" label={`${name}: ${colors.map((c) => c.name).join(', ')}`} />
      <div className="flex flex-col gap-1 border-t-[1.5px] border-navy p-3">
        <div className="flex items-center gap-2">
          <h3 className="type-h3 min-w-0 flex-1 truncate text-navy">{name}</h3>
          {isFavorite ? <Heart aria-label="Favourite" size={16} className="shrink-0 text-coral-text" fill="#FF6B4A" /> : null}
        </div>
        <p className="type-caption truncate text-muted">
          {subtitle ?? `${colors.length} colours${createdAt ? ` · ${formatDate(createdAt)}` : ''}`}
        </p>
        {actions ? <div className="-mx-1.5 mt-1 flex items-center gap-1">{actions}</div> : null}
      </div>
    </article>
  );
}
