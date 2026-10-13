import { X } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, palette } from '@/theme/colors';
import { durations, easings, springs } from '@/theme/motion';
import { radii, shapes } from '@/theme/radii';
import { layout, spacing } from '@/theme/spacing';

import { IconButton } from './IconButton';
import { Text } from './Text';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  /** Max height as a fraction of the window. Content scrolls beyond it. */
  maxHeightRatio?: number;
  /** Optional footer pinned under the scroll area (e.g. primary action). */
  footer?: ReactNode;
  accessibilityLabel?: string;
}

/**
 * Modal bottom sheet with drag-to-dismiss. Built on RN `Modal` so it layers above navigation
 * without needing a portal provider. Gesture handling is wrapped in its own
 * `GestureHandlerRootView` because Android modals render outside the app's root view.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  eyebrow,
  children,
  maxHeightRatio = 0.86,
  footer,
  accessibilityLabel,
}: BottomSheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0); // 0 hidden → 1 shown
  const dragY = useSharedValue(0);

  // Mount immediately when opened; unmount only after the exit animation finishes.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      dragY.set(0);
      progress.set(withSpring(1, springs.sheet));
    } else if (mounted) {
      progress.set(
        withTiming(0, { duration: durations.quick, easing: easings.accelerate }, (finished) => {
          'worklet';
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, mounted, progress, dragY]);

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((event) => {
      dragY.set(Math.max(0, event.translationY));
    })
    .onEnd((event) => {
      if (event.translationY > 120 || event.velocityY > 900) {
        scheduleOnRN(onClose);
      } else {
        dragY.set(withSpring(0, springs.sheet));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.get(), [0, 1], [windowHeight, 0]) + dragY.get() }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel ?? title}
          style={[
            styles.sheet,
            { maxHeight: windowHeight * maxHeightRatio, paddingBottom: Math.max(insets.bottom, spacing[4]) },
            sheetStyle,
          ]}>
          <GestureDetector gesture={pan}>
            <View style={styles.handleArea}>
              <View style={styles.handle} />
              {title || eyebrow ? (
                <View style={styles.header}>
                  <View style={styles.headerText}>
                    {eyebrow ? (
                      <Text variant="eyebrow" tone="secondary">
                        {eyebrow}
                      </Text>
                    ) : null}
                    {title ? (
                      <Text variant="h2" accessibilityRole="header">
                        {title}
                      </Text>
                    ) : null}
                  </View>
                  <IconButton icon={X} accessibilityLabel="Close" onPress={onClose} variant="outline" size={40} />
                </View>
              ) : null}
            </View>
          </GestureDetector>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.surface.scrim },
  sheet: {
    ...shapes.sheet,
    backgroundColor: palette.cream,
    overflow: 'hidden',
  },
  handleArea: { paddingTop: spacing[2], paddingHorizontal: layout.screenPaddingX },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: palette.linen,
    marginBottom: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingBottom: spacing[3],
  },
  headerText: { flex: 1, gap: spacing[1] },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: layout.screenPaddingX, paddingBottom: spacing[4], gap: spacing[4] },
  footer: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.warm,
  },
});
