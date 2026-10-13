import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ComponentProps } from 'react';

import { cx } from './cx';

type Tone = 'plain' | 'outline' | 'solid' | 'inverse' | 'glass';

const TONES: Record<Tone, string> = {
  plain: 'text-navy hover:bg-navy/6 active:bg-navy/10',
  outline: 'border-[1.5px] border-navy bg-paper text-navy hover:bg-sand',
  solid: 'bg-navy text-cream hover:bg-ink',
  inverse: 'text-cream hover:bg-cream/10 active:bg-cream/15',
  glass: 'bg-ink/55 text-cream backdrop-blur-md hover:bg-ink/70',
};

interface Props {
  icon: LucideIcon;
  /** Accessible name; icon-only buttons must always have one. */
  label: string;
  tone?: Tone;
  size?: number;
  iconSize?: number;
  className?: string;
  pressed?: boolean;
}

function classes(tone: Tone, className?: string) {
  return cx(
    'inline-flex shrink-0 items-center justify-center rounded-full transition-[background-color,transform] duration-150 active:scale-[0.94] disabled:opacity-40',
    TONES[tone],
    className,
  );
}

export function IconButton({
  icon: Icon,
  label,
  tone = 'plain',
  size = 44,
  iconSize = 20,
  className,
  pressed,
  type = 'button',
  ...rest
}: Props & Omit<ComponentProps<'button'>, 'children' | 'className'>) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={classes(tone, className)}
      style={{ width: size, height: size }}
      {...rest}>
      <Icon aria-hidden size={iconSize} strokeWidth={1.9} />
    </button>
  );
}

export function IconLink({
  icon: Icon,
  label,
  tone = 'plain',
  size = 44,
  iconSize = 20,
  className,
  ...rest
}: Props & Omit<ComponentProps<typeof Link>, 'children' | 'className'>) {
  return (
    <Link aria-label={label} title={label} className={classes(tone, className)} style={{ width: size, height: size }} {...rest}>
      <Icon aria-hidden size={iconSize} strokeWidth={1.9} />
    </Link>
  );
}
