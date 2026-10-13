import type { TextStyle } from 'react-native';

/**
 * Typography tokens.
 *
 * Playfair Display (a high-contrast Didone-style serif) carries the fashion-editorial voice;
 * DM Sans handles UI and body copy; DM Mono is used for hexadecimal values and numerals so
 * colour codes align in columns.
 *
 * Font files are loaded at runtime with `expo-font` (see `src/theme/fonts.ts`). If loading fails,
 * `resolveFontFamily` swaps in platform fonts so text never disappears.
 */

export const fontFamilies = {
  serifRegular: 'PlayfairDisplay_400Regular',
  serifItalic: 'PlayfairDisplay_400Regular_Italic',
  serifSemiBold: 'PlayfairDisplay_600SemiBold',
  serifBold: 'PlayfairDisplay_700Bold',
  serifBoldItalic: 'PlayfairDisplay_700Bold_Italic',
  serifBlack: 'PlayfairDisplay_900Black',
  sansRegular: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansBold: 'DMSans_700Bold',
  monoRegular: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
} as const;

export type FontFamilyToken = (typeof fontFamilies)[keyof typeof fontFamilies];

type Variant = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'textTransform'
> & {
  fontFamily: FontFamilyToken;
  /** Cap for Dynamic Type / Android font scale so oversized display text cannot break layouts. */
  maxFontSizeMultiplier: number;
  /** Display sizes shrink a little on narrow phones and grow a little on large ones. */
  responsive?: boolean;
};

export const typography = {
  displayXL: {
    fontFamily: fontFamilies.serifBlack,
    fontSize: 64,
    lineHeight: 64,
    letterSpacing: -1.5,
    maxFontSizeMultiplier: 1.1,
    responsive: true,
  },
  displayL: {
    fontFamily: fontFamilies.serifBold,
    fontSize: 46,
    lineHeight: 50,
    letterSpacing: -1,
    maxFontSizeMultiplier: 1.15,
    responsive: true,
  },
  h1: {
    fontFamily: fontFamilies.serifBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
    maxFontSizeMultiplier: 1.25,
    responsive: true,
  },
  h2: {
    fontFamily: fontFamilies.serifSemiBold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.2,
    maxFontSizeMultiplier: 1.3,
  },
  h3: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.1,
    maxFontSizeMultiplier: 1.4,
  },
  editorial: {
    fontFamily: fontFamilies.serifItalic,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: 0,
    maxFontSizeMultiplier: 1.35,
  },
  bodyL: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 17,
    lineHeight: 26,
    letterSpacing: 0,
    maxFontSizeMultiplier: 1.6,
  },
  bodyM: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
    maxFontSizeMultiplier: 1.6,
  },
  bodyS: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0.1,
    maxFontSizeMultiplier: 1.6,
  },
  label: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.2,
    maxFontSizeMultiplier: 1.4,
  },
  caption: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    maxFontSizeMultiplier: 1.5,
  },
  eyebrow: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    maxFontSizeMultiplier: 1.4,
  },
  hex: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    maxFontSizeMultiplier: 1.4,
  },
  numeric: {
    fontFamily: fontFamilies.monoRegular,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.2,
    maxFontSizeMultiplier: 1.4,
  },
} satisfies Record<string, Variant>;

export type TypographyVariant = keyof typeof typography;

let fontsAvailable = true;

/** Called once by the root layout after font loading resolves (or fails). */
export function setCustomFontsAvailable(available: boolean) {
  fontsAvailable = available;
}

const FALLBACKS: Record<FontFamilyToken, Pick<TextStyle, 'fontFamily' | 'fontWeight' | 'fontStyle'>> = {
  PlayfairDisplay_400Regular: { fontFamily: 'serif', fontWeight: '400' },
  PlayfairDisplay_400Regular_Italic: { fontFamily: 'serif', fontWeight: '400', fontStyle: 'italic' },
  PlayfairDisplay_600SemiBold: { fontFamily: 'serif', fontWeight: '600' },
  PlayfairDisplay_700Bold: { fontFamily: 'serif', fontWeight: '700' },
  PlayfairDisplay_700Bold_Italic: { fontFamily: 'serif', fontWeight: '700', fontStyle: 'italic' },
  PlayfairDisplay_900Black: { fontFamily: 'serif', fontWeight: '900' },
  DMSans_400Regular: { fontFamily: undefined, fontWeight: '400' },
  DMSans_500Medium: { fontFamily: undefined, fontWeight: '500' },
  DMSans_700Bold: { fontFamily: undefined, fontWeight: '700' },
  DMMono_400Regular: { fontFamily: 'monospace', fontWeight: '400' },
  DMMono_500Medium: { fontFamily: 'monospace', fontWeight: '500' },
};

/**
 * Returns the style for a font token. Custom fonts encode weight/style in the family name,
 * so `fontWeight` must not be combined with them (Android would synthesize a faux bold).
 */
export function resolveFontFamily(
  family: FontFamilyToken,
): Pick<TextStyle, 'fontFamily' | 'fontWeight' | 'fontStyle'> {
  if (fontsAvailable) return { fontFamily: family };
  return FALLBACKS[family];
}

/** Scales display sizes relative to a 390pt-wide reference phone, clamped to ±15%. */
export function responsiveFontSize(size: number, windowWidth: number) {
  const factor = Math.min(1.15, Math.max(0.82, windowWidth / 390));
  return Math.round(size * factor);
}
