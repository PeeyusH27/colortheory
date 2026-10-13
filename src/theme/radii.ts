import { StyleSheet } from 'react-native';

/**
 * Radius tokens. Editorial elements (portrait frames, colour blocks, magazine panels) stay
 * square-cornered; functional controls (buttons, inputs, chips, sheets) are rounded. Mixing the
 * two is deliberate — it separates "content" from "controls" at a glance.
 */
export const radii = {
  none: 0,
  xs: 2,
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const borderWidths = {
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  emphasis: 2,
  heavy: 3,
} as const;

/** Composite shape tokens for recurring editorial objects. */
export const shapes = {
  /** Portrait and outfit imagery: square corners with a thin ink keyline. */
  editorialFrame: { borderRadius: radii.none, borderWidth: borderWidths.thin },
  /** Swatch chips in palettes. */
  swatch: { borderRadius: radii.xs },
  /** Functional cards (settings rows, list items). */
  card: { borderRadius: radii.md },
  /** Bottom sheets: rounded top corners only. */
  sheet: { borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl },
  button: { borderRadius: radii.pill },
  input: { borderRadius: radii.md },
} as const;
