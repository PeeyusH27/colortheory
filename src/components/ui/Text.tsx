import { Text as RNText, useWindowDimensions, type TextProps as RNTextProps } from 'react-native';

import { colors } from '@/theme/colors';
import {
  fontFamilies,
  resolveFontFamily,
  responsiveFontSize,
  typography,
  type FontFamilyToken,
  type TypographyVariant,
} from '@/theme/typography';

/** Italic counterparts of the loaded serif cuts (fontStyle alone doesn't select a custom file). */
const ITALIC_OF: Partial<Record<FontFamilyToken, FontFamilyToken>> = {
  [fontFamilies.serifRegular]: fontFamilies.serifItalic,
  [fontFamilies.serifSemiBold]: fontFamilies.serifBoldItalic,
  [fontFamilies.serifBold]: fontFamilies.serifBoldItalic,
  [fontFamilies.serifBlack]: fontFamilies.serifBoldItalic,
};

type Tone = keyof typeof colors.text;

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  /** Semantic text colour. Use `color` only for content-driven colours (e.g. text on a swatch). */
  tone?: Tone;
  color?: string;
  align?: 'left' | 'center' | 'right';
  /** Switches serif variants to their italic cut — the editorial accent. */
  italic?: boolean;
}

/**
 * The only text primitive screens should use. It applies the typography scale, caps font scaling
 * per variant (Dynamic Type stays on, but display headlines cannot overflow the layout), and falls
 * back to system fonts if custom fonts failed to load.
 */
export function Text({
  variant = 'bodyM',
  tone = 'primary',
  color,
  align,
  italic = false,
  style,
  maxFontSizeMultiplier,
  ...rest
}: TextProps) {
  const { width } = useWindowDimensions();
  const token = typography[variant];
  const responsive = 'responsive' in token && token.responsive;
  const fontSize = responsive ? responsiveFontSize(token.fontSize, width) : token.fontSize;
  const lineHeight = responsive
    ? Math.round(token.lineHeight * (fontSize / token.fontSize))
    : token.lineHeight;

  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? token.maxFontSizeMultiplier}
      style={[
        {
          ...resolveFontFamily(italic ? (ITALIC_OF[token.fontFamily] ?? token.fontFamily) : token.fontFamily),
          fontSize,
          lineHeight,
          letterSpacing: token.letterSpacing,
          textTransform: 'textTransform' in token ? token.textTransform : undefined,
          color: color ?? colors.text[tone],
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    />
  );
}
