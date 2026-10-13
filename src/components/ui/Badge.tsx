import type { LucideIcon } from 'lucide-react-native';
import { Cloud, FlaskConical, Layers, Smartphone, Sparkles } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, palette } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

import { Text } from './Text';

type BadgeTone = 'neutral' | 'demo' | 'info' | 'success' | 'warning' | 'error' | 'inverse' | 'accent';

const TONES: Record<BadgeTone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: palette.sand, fg: palette.navy, border: palette.borderWarm },
  demo: { bg: palette.saffron, fg: palette.ink, border: palette.saffron },
  info: { bg: palette.mist, fg: palette.denim, border: palette.mist },
  success: { bg: colors.status.successSoft, fg: colors.status.success, border: colors.status.successSoft },
  warning: { bg: colors.status.warningSoft, fg: colors.status.warning, border: colors.status.warningSoft },
  error: { bg: colors.status.errorSoft, fg: colors.status.error, border: colors.status.errorSoft },
  inverse: { bg: 'rgba(247, 243, 236, 0.12)', fg: palette.cream, border: 'rgba(247, 243, 236, 0.3)' },
  accent: { bg: palette.coral, fg: palette.ink, border: palette.coral },
};

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, tone = 'neutral', icon: Icon, style }: BadgeProps) {
  const t = TONES[tone];
  return (
    <View style={[styles.base, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      {Icon ? <Icon size={12} color={t.fg} strokeWidth={2.4} /> : null}
      <Text variant="eyebrow" color={t.fg} style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export type Provenance = 'demo' | 'device' | 'remote' | 'drape' | 'ai';

const PROVENANCE: Record<Provenance, { label: string; tone: BadgeTone; icon: LucideIcon; a11y: string }> = {
  demo: {
    label: 'Demo · sample data',
    tone: 'demo',
    icon: FlaskConical,
    a11y: 'Demo content. These are sample results, not based on your photo.',
  },
  device: {
    label: 'On-device estimate',
    tone: 'info',
    icon: Smartphone,
    a11y: 'Estimated on this device from your photo. Not an AI diagnosis.',
  },
  remote: {
    label: 'Cloud analysis',
    tone: 'info',
    icon: Cloud,
    a11y: 'Analysed by the ColorTheory cloud service.',
  },
  drape: {
    label: 'Colour drape · not AI',
    tone: 'neutral',
    icon: Layers,
    a11y: 'Colour drape preview: your photo with a colour panel. This is not an AI-generated try-on.',
  },
  ai: {
    label: 'AI preview · approximation',
    tone: 'accent',
    icon: Sparkles,
    a11y: 'AI-generated preview. It is an approximation and may not perfectly preserve your appearance.',
  },
};

/**
 * Labels where a result came from. Every analysis result and outfit preview shows one so demo or
 * approximate content is never mistaken for a real AI result.
 */
export function ProvenanceBadge({ kind, inverse, style }: { kind: Provenance; inverse?: boolean; style?: StyleProp<ViewStyle> }) {
  const p = PROVENANCE[kind];
  return (
    <View accessible accessibilityLabel={p.a11y} style={style}>
      <Badge label={p.label} tone={inverse && p.tone !== 'demo' && p.tone !== 'accent' ? 'inverse' : p.tone} icon={p.icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  label: { letterSpacing: 1.2, fontSize: 10, lineHeight: 12 },
});
