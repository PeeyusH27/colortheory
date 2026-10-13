/**
 * 4-point spacing scale. Keys are multiples of 4 (`spacing[4]` === 16) so the value is readable
 * from the token name, the same convention many design tools use.
 */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export type SpacingToken = keyof typeof spacing;

/** Layout-level spacing decisions built from the scale. */
export const layout = {
  /** Horizontal gutter for every screen. 20pt keeps 16pt+ text margins on 320pt-wide phones. */
  screenPaddingX: spacing[5],
  screenPaddingTop: spacing[4],
  /** Vertical rhythm between major sections on long editorial screens. */
  sectionGap: spacing[10],
  sectionGapCompact: spacing[8],
  cardGap: spacing[3],
  cardPadding: spacing[4],
  gridGap: spacing[3],
  stackGap: spacing[2],
  /** Height of the floating bottom tab bar (excluding the safe-area inset). */
  tabBarHeight: 64,
  /** Extra space reserved below scroll content so the floating tab bar never covers it. */
  tabBarClearance: 64 + spacing[6],
  /** Minimum touch target (Apple HIG 44pt, Material 48dp). */
  minTouchTarget: 44,
  maxContentWidth: 560,
} as const;
