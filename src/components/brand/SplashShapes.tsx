import type { CSSProperties } from 'react';

import { palette } from '@/theme/colors';

import { cx } from '../ui/cx';

import { Blob } from './Blob';

interface BlobSpec {
  seed: number;
  color: string;
  /** Diameter as a fraction of the container width. */
  size: number;
  /** Centre position as fractions of the container. */
  x: number;
  y: number;
  rotate: number;
  delay: number;
}

/**
 * Composition: large cool blues anchor the corners, warm accents collide on the right, leaving a
 * calm band through the middle for the oversized wordmark. (Ported from the app's splash.)
 */
const BLOBS: BlobSpec[] = [
  { seed: 11, color: palette.denim, size: 0.62, x: 0.06, y: 0.14, rotate: 18, delay: 0 },
  { seed: 23, color: palette.petrol, size: 0.5, x: 0.94, y: 0.06, rotate: -24, delay: 70 },
  { seed: 37, color: palette.teal, size: 0.28, x: 0.54, y: -0.02, rotate: 40, delay: 160 },
  { seed: 41, color: palette.coral, size: 0.36, x: 0.96, y: 0.68, rotate: -12, delay: 120 },
  { seed: 53, color: palette.sky, size: 0.46, x: 0.04, y: 0.88, rotate: 30, delay: 90 },
  { seed: 67, color: palette.violet, size: 0.3, x: 0.62, y: 1.02, rotate: -30, delay: 210 },
  { seed: 71, color: palette.camel, size: 0.22, x: 0.99, y: 0.95, rotate: 22, delay: 260 },
  { seed: 83, color: palette.saffron, size: 0.11, x: 0.16, y: 0.6, rotate: 0, delay: 320 },
];

/** Paint droplets thrown off where blobs collide (centre fractions, size in px). */
const DROPLETS = [
  { x: 0.74, y: 0.5, size: 14, color: palette.coral, delay: 480 },
  { x: 0.7, y: 0.6, size: 9, color: palette.coral, delay: 520 },
  { x: 0.77, y: 0.74, size: 18, color: palette.blush, delay: 560 },
  { x: 0.3, y: 0.36, size: 12, color: palette.sky, delay: 500 },
  { x: 0.36, y: 0.28, size: 7, color: palette.mist, delay: 540 },
  { x: 0.58, y: 0.24, size: 10, color: palette.teal, delay: 600 },
  { x: 0.64, y: 0.3, size: 6, color: palette.saffron, delay: 640 },
  { x: 0.36, y: 0.76, size: 16, color: palette.violet, delay: 580 },
  { x: 0.42, y: 0.82, size: 8, color: palette.lilac, delay: 620 },
  { x: 0.86, y: 0.82, size: 11, color: palette.camel, delay: 660 },
];

/**
 * Procedural paint splash for the landing hero: organic SVG blobs drop in and settle, then
 * droplets appear. Pure CSS animation (transform/opacity only); with reduced motion it renders in
 * its final state immediately.
 */
export function SplashShapes({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {BLOBS.map((b) => (
        <div
          key={b.seed}
          className="absolute aspect-square animate-shape-drop"
          style={
            {
              width: `${b.size * 100}%`,
              left: `${b.x * 100}%`,
              top: `${b.y * 100}%`,
              translate: '-50% -50%',
              animationDelay: `${b.delay}ms`,
              '--shape-rotate': `${b.rotate}deg`,
              '--shape-rotate-from': `${b.rotate - 30}deg`,
            } as CSSProperties
          }>
          <Blob seed={b.seed} color={b.color} className="size-full" />
        </div>
      ))}
      {DROPLETS.map((d) => (
        <span
          key={`${d.x}-${d.y}`}
          className="absolute animate-fade-in rounded-full"
          style={{
            width: d.size,
            height: d.size,
            left: `${d.x * 100}%`,
            top: `${d.y * 100}%`,
            backgroundColor: d.color,
            animationDelay: `${d.delay}ms`,
            animationDuration: '600ms',
          }}
        />
      ))}
    </div>
  );
}
