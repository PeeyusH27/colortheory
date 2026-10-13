import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { PrimaryButton } from './PrimaryButton';
import { Text } from './Text';

/** Three fanned, empty swatch cards — an "unfilled palette" motif for first-run states. */
function EmptyPaletteArt({ accent = palette.coral }: { accent?: string }) {
  return (
    <Svg width={132} height={96} viewBox="0 0 132 96" accessibilityElementsHidden importantForAccessibility="no">
      <Rect x={18} y={14} width={46} height={68} fill={palette.sand} stroke={palette.navy} strokeWidth={1.5} transform="rotate(-10 41 48)" />
      <Rect x={68} y={14} width={46} height={68} fill={palette.mist} stroke={palette.navy} strokeWidth={1.5} transform="rotate(9 91 48)" />
      <Rect x={43} y={8} width={46} height={72} fill={palette.paper} stroke={palette.navy} strokeWidth={1.5} />
      <Rect x={43} y={8} width={46} height={44} fill={accent} opacity={0.9} />
      <Rect x={49} y={60} width={26} height={4} fill={palette.navy} />
      <Rect x={49} y={68} width={18} height={3} fill={palette.slate} />
    </Svg>
  );
}

interface EmptyStateProps {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  art?: ReactNode;
  accent?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ title, body, actionLabel, onAction, art, accent, compact, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, compact && styles.compact, style]}>
      {art ?? <EmptyPaletteArt accent={accent} />}
      <View style={styles.copy}>
        <Text variant={compact ? 'h3' : 'h2'} align="center" accessibilityRole="header">
          {title}
        </Text>
        {body ? (
          <Text variant="bodyM" tone="secondary" align="center">
            {body}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? <PrimaryButton label={actionLabel} onPress={onAction} size="md" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[5],
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[6],
  },
  compact: { paddingVertical: spacing[6], gap: spacing[4] },
  copy: { gap: spacing[2], maxWidth: 320 },
});
