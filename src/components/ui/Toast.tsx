import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { palette } from '@/theme/colors';
import { durations } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { shadows } from '@/theme/shadows';
import { layout, spacing } from '@/theme/spacing';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type ToastTone = 'info' | 'success' | 'error';

interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  current: ToastMessage | null;
  show: (message: string, options?: { tone?: ToastTone; actionLabel?: string; onAction?: () => void }) => void;
  dismiss: () => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (message, options) =>
    set({ current: { id: nextId++, message, tone: options?.tone ?? 'info', actionLabel: options?.actionLabel, onAction: options?.onAction } }),
  dismiss: () => set({ current: null }),
}));

/** Imperative API usable from services and event handlers. */
export const toast = {
  show: (message: string, options?: { actionLabel?: string; onAction?: () => void }) =>
    useToastStore.getState().show(message, { tone: 'info', ...options }),
  success: (message: string, options?: { actionLabel?: string; onAction?: () => void }) =>
    useToastStore.getState().show(message, { tone: 'success', ...options }),
  error: (message: string, options?: { actionLabel?: string; onAction?: () => void }) =>
    useToastStore.getState().show(message, { tone: 'error', ...options }),
};

const ICONS = { info: Info, success: CircleCheck, error: CircleAlert } as const;
const ACCENTS = { info: palette.sky, success: palette.sage, error: palette.coral } as const;

/** Mounted once in the root layout. Shows one toast at a time; a new toast replaces the old. */
export function ToastHost() {
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(dismiss, durations.toast + (current.actionLabel ? 1800 : 0));
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  if (!current) return null;
  const Icon = ICONS[current.tone];

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing[2] }]}>
      <Animated.View
        key={current.id}
        entering={FadeInUp.duration(durations.base).reduceMotion(ReduceMotion.System)}
        exiting={FadeOutUp.duration(durations.quick).reduceMotion(ReduceMotion.System)}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.toast, shadows.floating]}>
        <View style={[styles.accent, { backgroundColor: ACCENTS[current.tone] }]} />
        <Icon size={18} color={ACCENTS[current.tone]} strokeWidth={2.2} />
        <Text variant="bodyS" tone="inverse" style={styles.message} numberOfLines={3}>
          {current.message}
        </Text>
        {current.actionLabel ? (
          <PressableScale
            onPress={() => {
              current.onAction?.();
              dismiss();
            }}
            accessibilityRole="button"
            accessibilityLabel={current.actionLabel}
            hitSlop={10}
            style={styles.action}>
            <Text variant="label" color={palette.sky}>
              {current.actionLabel}
            </Text>
          </PressableScale>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: layout.screenPaddingX, right: layout.screenPaddingX, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: palette.ink,
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingLeft: spacing[5],
    paddingRight: spacing[4],
    maxWidth: layout.maxContentWidth,
    width: '100%',
    overflow: 'hidden',
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  message: { flex: 1 },
  action: { minHeight: 32, justifyContent: 'center' },
});
