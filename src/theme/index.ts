import { colors, palette } from './colors';
import { durations, easings, motion, scales, springs } from './motion';
import { borderWidths, radii, shapes } from './radii';
import { shadows } from './shadows';
import { layout, spacing } from './spacing';
import { fontFamilies, typography } from './typography';

export * from './colors';
export * from './motion';
export * from './radii';
export * from './shadows';
export * from './spacing';
export * from './typography';

/** Single object for places that want the whole system (e.g. docs, storybook-style previews). */
export const theme = {
  palette,
  colors,
  typography,
  fontFamilies,
  spacing,
  layout,
  radii,
  borderWidths,
  shapes,
  shadows,
  motion,
  durations,
  easings,
  springs,
  scales,
} as const;

export type Theme = typeof theme;
