import type { LucideIcon } from 'lucide-react-native';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { Text } from './Text';

type Tone = 'info' | 'success' | 'warning' | 'error';

const TONES: Record<Tone, { bg: string; fg: string; icon: LucideIcon }> = {
  info: { bg: colors.status.infoSoft, fg: colors.status.info, icon: Info },
  success: { bg: colors.status.successSoft, fg: colors.status.success, icon: CircleCheck },
  warning: { bg: colors.status.warningSoft, fg: colors.status.warning, icon: TriangleAlert },
  error: { bg: colors.status.errorSoft, fg: colors.status.error, icon: CircleAlert },
};

interface InlineAlertProps {
  tone?: Tone;
  title?: string;
  message: ReactNode;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** In-flow message (form errors, configuration notices, quality warnings). Announced politely. */
export function InlineAlert({ tone = 'info', title, message, action, style }: InlineAlertProps) {
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      style={[styles.box, { backgroundColor: t.bg, borderLeftColor: t.fg }, style]}>
      <Icon size={18} color={t.fg} strokeWidth={2.2} style={styles.icon} />
      <View style={styles.copy}>
        {title ? (
          <Text variant="label" color={palette.navy}>
            {title}
          </Text>
        ) : null}
        {typeof message === 'string' ? (
          <Text variant="bodyS" color={palette.navy}>
            {message}
          </Text>
        ) : (
          message
        )}
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: spacing[3], padding: spacing[3], borderLeftWidth: 4 },
  icon: { marginTop: 2 },
  copy: { flex: 1, gap: spacing[1] },
});
