import { Check, Heart } from 'lucide-react';

import { readableOn } from '@/utils/color';

import { cx } from '../ui/cx';

interface ColorSwatchProps {
  name: string;
  hex: string;
  /** `chip` = colour block with label below; `tile` = tall editorial block with label inside. */
  variant?: 'chip' | 'tile';
  selected?: boolean;
  favorite?: boolean;
  onClick?: () => void;
  showHex?: boolean;
  className?: string;
}

/** Colour swatch. Interactive swatches are buttons that announce name and hex. */
export function ColorSwatch({ name, hex, variant = 'chip', selected = false, favorite = false, onClick, showHex = true, className }: ColorSwatchProps) {
  const onColor = readableOn(hex);
  const label = `${name}, ${hex}${favorite ? ', favourite' : ''}`;

  const block =
    variant === 'tile' ? (
      <span
        className={cx(
          'relative flex aspect-[2/3] w-full flex-col justify-end p-3 text-left transition-transform duration-200',
          selected ? 'scale-[1.04] outline-[2.5px] outline-offset-2 outline-navy' : 'editorial-frame',
        )}
        style={{ backgroundColor: hex, color: onColor }}>
        <span className="type-label line-clamp-2 text-[0.8125rem] leading-tight">{name}</span>
        {showHex ? <span className="type-hex mt-1 text-[0.6875rem] opacity-90">{hex}</span> : null}
        {favorite ? <Heart aria-hidden size={14} fill="currentColor" className="absolute top-2 right-2" /> : null}
        {selected ? (
          <span className="absolute top-2 left-2 flex size-5 items-center justify-center rounded-full" style={{ backgroundColor: onColor, color: hex }}>
            <Check aria-hidden size={12} strokeWidth={3} />
          </span>
        ) : null}
      </span>
    ) : (
      <span className="flex w-full flex-col gap-1.5 text-left">
        <span
          className={cx(
            'relative flex aspect-square w-full items-center justify-center rounded-xs transition-transform duration-200',
            selected ? 'scale-[1.06] outline-[2.5px] outline-offset-2 outline-navy' : 'border border-navy/15',
          )}
          style={{ backgroundColor: hex, color: onColor }}>
          {selected ? <Check aria-hidden size={18} strokeWidth={3} /> : null}
          {favorite ? <Heart aria-hidden size={12} fill="currentColor" className="absolute top-1.5 right-1.5" /> : null}
        </span>
        <span className="type-caption truncate text-navy">{name}</span>
        {showHex ? <span className="type-hex -mt-1 text-[0.6875rem] text-muted">{hex}</span> : null}
      </span>
    );

  if (!onClick) {
    return (
      <div className={className} role="img" aria-label={label}>
        {block}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}. Show details`}
      aria-pressed={selected || undefined}
      className={cx('group block w-full rounded-xs transition-transform duration-150 active:scale-[0.96]', className)}>
      {block}
    </button>
  );
}
