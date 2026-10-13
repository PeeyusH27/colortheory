import type { LucideIcon } from 'lucide-react-native';
import {
  CameraOff,
  CircleAlert,
  CloudOff,
  ImageOff,
  KeyRound,
  SunDim,
  TimerOff,
  WifiOff,
} from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, palette } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { FRIENDLY_MESSAGES, friendlyError, type AppErrorCode } from '@/utils/errors';

import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { Text } from './Text';

const ICONS: Partial<Record<AppErrorCode, LucideIcon>> = {
  network: WifiOff,
  offline: WifiOff,
  timeout: TimerOff,
  invalid_image: ImageOff,
  low_quality: SunDim,
  not_configured: CloudOff,
  session_expired: KeyRound,
  upload_failed: CloudOff,
  generation_failed: ImageOff,
  permission_denied: CameraOff,
};

interface ErrorStateProps {
  /** Either pass an error (mapped to friendly copy) or explicit title/body. */
  error?: unknown;
  code?: AppErrorCode;
  title?: string;
  body?: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  inverse?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shared error presentation for API failures, upload/generation failures, expired sessions,
 * invalid images and offline mode. Retry is only offered for retryable errors.
 */
export function ErrorState({
  error,
  code,
  title,
  body,
  onRetry,
  retryLabel = 'Try again',
  secondaryLabel,
  onSecondary,
  inverse = false,
  compact = false,
  style,
}: ErrorStateProps) {
  const friendly = error !== undefined ? friendlyError(error) : null;
  const resolvedCode: AppErrorCode = code ?? friendly?.code ?? 'unknown';
  // An explicit `code` wins over the error's own classification (e.g. show "offline" copy for a
  // generic network failure when the device is known to be offline).
  const copy = code ? FRIENDLY_MESSAGES[code] : (friendly ?? FRIENDLY_MESSAGES.unknown);
  const Icon = ICONS[resolvedCode] ?? CircleAlert;
  const showRetry = onRetry && (friendly ? friendly.retryable : true);

  return (
    <View accessibilityRole="alert" style={[styles.container, compact && styles.compact, style]}>
      <View style={[styles.iconWrap, inverse && styles.iconWrapInverse]}>
        <Icon size={26} color={inverse ? palette.cream : colors.status.error} strokeWidth={1.8} />
      </View>
      <View style={styles.copy}>
        <Text variant={compact ? 'h3' : 'h2'} tone={inverse ? 'inverse' : 'primary'} align="center">
          {title ?? copy.title}
        </Text>
        <Text variant="bodyM" tone={inverse ? 'inverseSecondary' : 'secondary'} align="center">
          {body ?? copy.body}
        </Text>
      </View>
      <View style={styles.actions}>
        {showRetry ? (
          <PrimaryButton label={retryLabel} onPress={onRetry} tone={inverse ? 'cream' : 'ink'} size="md" />
        ) : null}
        {secondaryLabel && onSecondary ? (
          <SecondaryButton label={secondaryLabel} onPress={onSecondary} tone={inverse ? 'cream' : 'ink'} size="md" />
        ) : null}
      </View>
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
  compact: { paddingVertical: spacing[5], gap: spacing[4] },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.status.errorSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapInverse: { backgroundColor: 'rgba(247,243,236,0.1)' },
  copy: { gap: spacing[2], maxWidth: 340 },
  actions: { gap: spacing[3], alignItems: 'center' },
});
