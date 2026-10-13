import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOut,
  ReduceMotion,
  type WithSpringConfig,
} from 'react-native-reanimated';

/**
 * Motion tokens.
 *
 * Ownership rule: the navigator (Expo Router's native Stack) owns screen-to-screen transitions;
 * Reanimated owns everything that happens *inside* a screen (entrances, presses, progress, the
 * splash). We never animate a whole screen in JS on top of a native transition.
 *
 * Every Reanimated animation built from these helpers uses `ReduceMotion.System`, so when the OS
 * "Reduce Motion" setting is on, animations jump to their final state.
 */

export const durations = {
  instant: 90,
  micro: 140,
  press: 120,
  quick: 200,
  base: 280,
  slow: 420,
  slower: 650,
  splashTotal: 2600,
  splashReduced: 900,
  stagger: 60,
  analysisStageMin: 750,
  toast: 3200,
} as const;

export const easings = {
  /** Default for most UI movement. */
  standard: Easing.bezier(0.2, 0, 0, 1),
  /** Things arriving on screen. */
  decelerate: Easing.bezier(0, 0, 0, 1),
  /** Things leaving the screen. */
  accelerate: Easing.bezier(0.3, 0, 1, 1),
  /** Slow-in/slow-out for expressive editorial moves (splash, hero). */
  editorial: Easing.bezier(0.65, 0, 0.35, 1),
  linear: Easing.linear,
} as const;

export const springs = {
  press: { damping: 18, stiffness: 320, mass: 0.6 },
  selection: { damping: 14, stiffness: 260, mass: 0.7 },
  gentle: { damping: 20, stiffness: 140, mass: 1 },
  sheet: { damping: 26, stiffness: 260, mass: 0.9 },
  splash: { damping: 11, stiffness: 90, mass: 1 },
} satisfies Record<string, WithSpringConfig>;

export const scales = {
  pressed: 0.96,
  selected: 1.08,
} as const;

/** Staggered card/section entrance used by lists and editorial sections. */
export function enterUp(index = 0, baseDelay = 0) {
  return FadeInDown.duration(durations.slow)
    .delay(baseDelay + index * durations.stagger)
    .easing(easings.decelerate)
    .withInitialValues({ transform: [{ translateY: 18 }] })
    .reduceMotion(ReduceMotion.System);
}

/** Horizontal entrance for carousel items and outfit cards. */
export function enterRight(index = 0, baseDelay = 0) {
  return FadeInRight.duration(durations.slow)
    .delay(baseDelay + index * durations.stagger)
    .easing(easings.decelerate)
    .reduceMotion(ReduceMotion.System);
}

export function fadeIn(delay = 0, duration: number = durations.base) {
  return FadeIn.duration(duration).delay(delay).reduceMotion(ReduceMotion.System);
}

export function fadeOut(duration: number = durations.quick) {
  return FadeOut.duration(duration).reduceMotion(ReduceMotion.System);
}

export const motion = { durations, easings, springs, scales, enterUp, enterRight, fadeIn, fadeOut };
