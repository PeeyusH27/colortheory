import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

import { cx } from './cx';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'destructive';
type Tone = 'ink' | 'cream';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Tone, Record<Variant, string>> = {
  ink: {
    primary: 'bg-navy text-cream hover:bg-ink active:bg-ink disabled:bg-disabled',
    secondary: 'border-[1.5px] border-navy text-navy hover:bg-navy/5 active:bg-navy/10 disabled:border-disabled disabled:text-disabled',
    accent: 'bg-coral text-ink hover:bg-[#ff5a35] active:bg-[#f0512d] disabled:opacity-50',
    ghost: 'text-navy underline-offset-4 hover:underline disabled:text-disabled',
    destructive: 'bg-error text-cream hover:bg-[#9a1d13] disabled:opacity-50',
  },
  cream: {
    primary: 'bg-cream text-ink hover:bg-white disabled:opacity-50',
    secondary: 'border-[1.5px] border-cream/70 text-cream hover:bg-cream/10 disabled:opacity-50',
    accent: 'bg-coral text-ink hover:bg-[#ff5a35] disabled:opacity-50',
    ghost: 'text-cream underline-offset-4 hover:underline disabled:opacity-50',
    destructive: 'bg-error text-cream hover:bg-[#9a1d13] disabled:opacity-50',
  },
};

const SIZES: Record<Size, string> = {
  sm: 'min-h-9 px-4 text-[0.8125rem] gap-1.5',
  md: 'min-h-11 px-5 text-[0.9375rem] gap-2',
  lg: 'min-h-13 px-7 text-base gap-2.5',
};

interface CommonProps {
  variant?: Variant;
  tone?: Tone;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

function classes({ variant = 'primary', tone = 'ink', size = 'md', fullWidth, className }: CommonProps) {
  return cx(
    'inline-flex select-none items-center justify-center rounded-full font-sans font-bold tracking-[0.01em] transition-[background-color,transform,color] duration-150 ease-[var(--ease-standard)] active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100',
    variant !== 'ghost' && SIZES[size],
    variant === 'ghost' && 'min-h-11 gap-1.5 px-1 text-[0.9375rem]',
    VARIANTS[tone][variant],
    fullWidth && 'w-full',
    className,
  );
}

function Content({ icon: Icon, iconRight: IconRight, loading, size = 'md', children }: CommonProps) {
  const iconSize = size === 'lg' ? 20 : size === 'sm' ? 15 : 18;
  return (
    <>
      {loading ? <Spinner size={iconSize} /> : Icon ? <Icon aria-hidden size={iconSize} strokeWidth={2} /> : null}
      <span>{children}</span>
      {IconRight && !loading ? <IconRight aria-hidden size={iconSize} strokeWidth={2} /> : null}
    </>
  );
}

type ButtonProps = CommonProps & Omit<ComponentProps<'button'>, 'children' | 'className'>;

export function Button(props: ButtonProps) {
  const { variant, tone, size, icon, iconRight, loading, fullWidth, className, children, disabled, type = 'button', ...rest } = props;
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes({ variant, tone, size, fullWidth, className, children })}
      {...rest}>
      <Content icon={icon} iconRight={iconRight} loading={loading} size={size}>
        {children}
      </Content>
    </button>
  );
}

type LinkButtonProps = CommonProps & Omit<ComponentProps<typeof Link>, 'children' | 'className'>;

/** A link styled as a button (navigation, not an action). */
export function LinkButton(props: LinkButtonProps) {
  const { variant, tone, size, icon, iconRight, loading, fullWidth, className, children, ...rest } = props;
  return (
    <Link className={classes({ variant, tone, size, fullWidth, className, children })} {...rest}>
      <Content icon={icon} iconRight={iconRight} loading={loading} size={size}>
        {children}
      </Content>
    </Link>
  );
}
