import type { ViewStyle } from 'react-native';

import { palette } from './colors';

/**
 * Elevation tokens use the cross-platform `boxShadow` style (New Architecture), so iOS and Android
 * render the same shadow instead of iOS shadow* props vs Android `elevation`.
 *
 * `offset*` tokens are hard, blur-free "print" shadows — a solid block offset behind a card, which
 * reads as editorial layering rather than a floating SaaS card.
 */
export const shadows = {
  none: { boxShadow: 'none' },
  subtle: { boxShadow: '0px 1px 2px rgba(23, 42, 70, 0.06), 0px 4px 12px rgba(23, 42, 70, 0.06)' },
  raised: { boxShadow: '0px 2px 6px rgba(23, 42, 70, 0.08), 0px 12px 28px rgba(23, 42, 70, 0.12)' },
  floating: { boxShadow: '0px 8px 20px rgba(13, 22, 38, 0.18), 0px 24px 48px rgba(13, 22, 38, 0.18)' },
  offsetInk: { boxShadow: `6px 6px 0px ${palette.navy}` },
  offsetCoral: { boxShadow: `6px 6px 0px ${palette.coral}` },
  offsetSky: { boxShadow: `6px 6px 0px ${palette.sky}` },
  offsetSmall: { boxShadow: `3px 3px 0px ${palette.navy}` },
} satisfies Record<string, Pick<ViewStyle, 'boxShadow'>>;

export type ShadowToken = keyof typeof shadows;
