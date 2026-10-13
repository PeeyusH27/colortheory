/**
 * ColorTheory color tokens.
 *
 * Two layers:
 *  1. `palette` — raw brand values. Never reference these from screens directly.
 *  2. `colors`  — semantic roles (background, text, surface, action…). Components use these.
 *
 * Contrast notes (WCAG 2.x, measured against `cream` #F7F3EC):
 *  - navy 13.0:1, denim 6.4:1, petrol 8.6:1, teal 5.7:1 → safe for any text size.
 *  - The brief's muted #727B87 measures 3.9:1 on cream, below AA for body copy, so it is kept as
 *    `slate` (icons, rules, decorative text) and `muted` is darkened to #5E6774 (5.2:1).
 *  - steel #4682B4 (3.7:1) and sky #A7C7E7 are decorative / large-display-only on light backgrounds.
 *  - coral #FF6B4A is an accent fill; `coralText` #C2410C (4.7:1) is used when coral must be text.
 */

export const palette = {
  // Blues from the "Shades of Blue" style guide.
  ink: '#0D1626', // Deepest navy. Splash, camera chrome, inverse sections.
  navy: '#172A46',
  indigo: '#2B2F77',
  denim: '#2E5B89',
  petrol: '#0F4C5C',
  teal: '#176B6B',
  steel: '#4682B4',
  sky: '#A7C7E7',
  mist: '#DCE8F4',

  // Neutrals.
  cream: '#F7F3EC',
  sand: '#EDE6DA',
  linen: '#E4DACB',
  paper: '#FFFFFF',
  charcoal: '#20232B',
  muted: '#5E6774',
  slate: '#727B87',
  border: '#D9DDE3',
  borderWarm: '#DDD4C6',

  // Maximalist accents (splash, discovery, decorative blocks).
  coral: '#FF6B4A',
  coralText: '#C2410C',
  violet: '#6B4BD8',
  lilac: '#B9A7F2',
  saffron: '#F2B33D',
  blush: '#F4B6A6',
  camel: '#C19A6B',
  sage: '#9DB5A0',

  // Status (all ≥ 4.5:1 on cream).
  success: '#1E7A4C',
  successSoft: '#DDF0E5',
  warning: '#9A5B00',
  warningSoft: '#FBEBCD',
  error: '#B42318',
  errorSoft: '#FBE1DD',

  transparent: 'transparent',
  black: '#000000',
  white: '#FFFFFF',
} as const;

export type PaletteColor = keyof typeof palette;

export const colors = {
  background: {
    primary: palette.cream,
    secondary: palette.sand,
    inverse: palette.ink,
    camera: palette.black,
  },
  text: {
    primary: palette.navy,
    secondary: palette.muted,
    tertiary: palette.slate,
    inverse: palette.cream,
    inverseSecondary: '#A9B4C4', // 8.6:1 on ink
    accent: palette.denim,
    emphasis: palette.coralText,
    onAction: palette.cream,
    success: palette.success,
    warning: palette.warning,
    error: palette.error,
  },
  surface: {
    primary: palette.paper,
    elevated: palette.paper,
    sunken: palette.sand,
    inverse: palette.navy,
    scrim: 'rgba(13, 22, 38, 0.56)',
    cameraChrome: 'rgba(13, 22, 38, 0.72)',
  },
  border: {
    subtle: palette.border,
    warm: palette.borderWarm,
    strong: palette.navy,
    inverse: 'rgba(247, 243, 236, 0.22)',
    focus: palette.denim,
  },
  action: {
    primary: palette.navy,
    primaryPressed: palette.ink,
    primaryDisabled: '#8A95A5',
    secondary: palette.transparent,
    secondaryBorder: palette.navy,
    accent: palette.coral,
    destructive: palette.error,
  },
  status: {
    success: palette.success,
    successSoft: palette.successSoft,
    warning: palette.warning,
    warningSoft: palette.warningSoft,
    error: palette.error,
    errorSoft: palette.errorSoft,
    info: palette.denim,
    infoSoft: palette.mist,
  },
  /** Decorative fills used by splash shapes, editorial blocks and onboarding art. */
  splash: [
    palette.denim,
    palette.petrol,
    palette.teal,
    palette.sky,
    palette.coral,
    palette.violet,
    palette.camel,
    palette.saffron,
  ],
} as const;

export type SemanticColors = typeof colors;
