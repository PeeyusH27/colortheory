import type { CSSProperties } from 'react';

/**
 * Motion tokens used from code. Visual animations are CSS (see `globals.css`): keyframes are
 * defined there and `prefers-reduced-motion` resolves them instantly. These values are for
 * JS-paced behaviour such as the analysis progress list.
 */
export const durations = {
  micro: 140,
  quick: 200,
  base: 280,
  slow: 420,
  stagger: 60,
  splashTotal: 2600,
  splashReduced: 900,
  /** Minimum time each analysis stage stays visible, so fast stages can still be read. */
  analysisStageMin: 750,
  toast: 3200,
} as const;

/** Inline style for a staggered CSS entrance (`animate-enter-up` + delay by index). */
export function staggerStyle(index: number, baseDelay = 0): CSSProperties {
  return { animationDelay: `${baseDelay + index * durations.stagger}ms` };
}
