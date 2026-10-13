import { palette } from '@/theme/colors';
import { donutSegmentPath } from '@/utils/blob';

import { cx } from '../ui/cx';

/** Six petals of the colour wheel, clockwise from 12 o'clock. Shared with the app icon. */
export const LOGO_SEGMENTS = ['#A7C7E7', '#4682B4', '#1F8A84', '#E8C9A0', '#FF6B4A', '#7A5AF0'] as const;

interface MarkProps {
  size?: number;
  /** Colour of the centre (matches the surface the mark sits on). */
  holeColor?: string;
  dotColor?: string;
  className?: string;
}

/** The colour-wheel mark on its own (decorative; the wordmark or a label names it). */
export function ColorWheelMark({ size = 40, holeColor = palette.ink, dotColor = palette.cream, className }: MarkProps) {
  const step = 360 / LOGO_SEGMENTS.length;
  const gap = 2.4;
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 100 100" className={className}>
      {LOGO_SEGMENTS.map((color, i) => (
        <path key={color} d={donutSegmentPath(50, 50, 49, 27, i * step + gap / 2, (i + 1) * step - gap / 2)} fill={color} />
      ))}
      <circle cx={50} cy={50} r={26} fill={holeColor} />
      <circle cx={50} cy={50} r={7.5} fill={dotColor} />
    </svg>
  );
}

const SIZES = { sm: { mark: 26, text: 'text-xl' }, md: { mark: 34, text: 'text-[1.6rem]' }, lg: { mark: 72, text: 'text-[2.5rem]' } } as const;

interface LogoProps {
  size?: keyof typeof SIZES;
  inverse?: boolean;
  stacked?: boolean;
  className?: string;
}

/** ColorTheory logo: colour-wheel mark + wordmark set in Playfair Display, "Theory" in italic. */
export function Logo({ size = 'md', inverse = false, stacked = false, className }: LogoProps) {
  const s = SIZES[size];
  return (
    <span className={cx('inline-flex items-center', stacked ? 'flex-col gap-3' : 'gap-2', className)}>
      <ColorWheelMark size={s.mark} holeColor={inverse ? palette.ink : palette.cream} dotColor={inverse ? palette.cream : palette.navy} />
      <span className={cx('font-serif leading-none tracking-[-0.015em]', s.text, inverse ? 'text-cream' : 'text-navy')}>
        <span className="font-bold">Color</span>
        <span className="italic">Theory</span>
      </span>
    </span>
  );
}
