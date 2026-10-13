import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, ZoomIn } from 'react-native-reanimated';

import { colors, palette } from '@/theme/colors';
import { durations } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { shadows } from '@/theme/shadows';
import { layout, spacing } from '@/theme/spacing';
import { fontFamilies, resolveFontFamily } from '@/theme/typography';

import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { Text } from './Text';

export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  /** When set, the user must type this phrase to enable confirm (used for account deletion). */
  confirmationPhrase?: string;
  /** Optional detail list (e.g. what will be deleted). */
  details?: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  confirmationPhrase,
  details,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const [typed, setTyped] = useState('');
  const phraseOk = !confirmationPhrase || typed.trim().toUpperCase() === confirmationPhrase.toUpperCase();

  const close = () => {
    if (loading) return;
    setTyped('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Dismiss" accessibilityRole="button">
          <Animated.View entering={FadeIn.duration(durations.quick).reduceMotion(ReduceMotion.System)} style={[StyleSheet.absoluteFill, styles.scrim]} />
        </Pressable>
        <Animated.View
          entering={ZoomIn.duration(durations.base).reduceMotion(ReduceMotion.System)}
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[styles.card, destructive ? shadows.offsetCoral : shadows.offsetInk]}>
          <View style={[styles.stripe, { backgroundColor: destructive ? palette.coral : palette.denim }]} />
          <Text variant="h2">{title}</Text>
          <Text variant="bodyM" tone="secondary">
            {message}
          </Text>
          {details?.length ? (
            <View style={styles.details}>
              {details.map((d) => (
                <View key={d} style={styles.detailRow}>
                  <View style={styles.bullet} />
                  <Text variant="bodyS" style={styles.detailText}>
                    {d}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {confirmationPhrase ? (
            <View style={styles.phrase}>
              <Text variant="caption" tone="secondary">
                Type {confirmationPhrase} to confirm
              </Text>
              <TextInput
                value={typed}
                onChangeText={setTyped}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel={`Type ${confirmationPhrase} to confirm`}
                placeholder={confirmationPhrase}
                placeholderTextColor={colors.text.tertiary}
                style={[styles.input, resolveFontFamily(fontFamilies.monoMedium)]}
              />
            </View>
          ) : null}
          <View style={styles.actions}>
            <SecondaryButton label={cancelLabel} onPress={close} size="md" disabled={loading} style={styles.flex} />
            {destructive ? (
              <SecondaryButton
                label={confirmLabel}
                onPress={onConfirm}
                tone="destructive"
                size="md"
                loading={loading}
                disabled={!phraseOk}
                style={styles.flex}
              />
            ) : (
              <PrimaryButton label={confirmLabel} onPress={onConfirm} size="md" loading={loading} disabled={!phraseOk} style={styles.flex} />
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: layout.screenPaddingX },
  scrim: { backgroundColor: colors.surface.scrim },
  card: {
    backgroundColor: palette.cream,
    padding: spacing[6],
    paddingTop: spacing[8],
    gap: spacing[3],
    borderWidth: 1.5,
    borderColor: palette.navy,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  stripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 8 },
  details: { gap: spacing[2], marginTop: spacing[1] },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
  bullet: { width: 6, height: 6, marginTop: 7, backgroundColor: palette.navy },
  detailText: { flex: 1 },
  phrase: { gap: spacing[2], marginTop: spacing[2] },
  input: {
    minHeight: layout.minTouchTarget,
    borderWidth: 1.5,
    borderColor: palette.navy,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[3],
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: palette.paper,
  },
  actions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[3] },
  flex: { flex: 1 },
});
