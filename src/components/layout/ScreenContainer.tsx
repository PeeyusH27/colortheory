import { StatusBar } from 'expo-status-bar';
import type { ReactElement, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GrainOverlay } from '@/components/ui/GrainOverlay';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/spacing';

type Background = 'primary' | 'secondary' | 'inverse' | 'camera';

export interface ScreenContainerProps {
  children: ReactNode;
  background?: Background;
  /** Wrap content in a ScrollView. Long editorial screens scroll; camera/analysis do not. */
  scroll?: boolean;
  /** Apply the standard horizontal gutter. */
  padded?: boolean;
  /** Which safe-area edges this screen handles itself. */
  edges?: ('top' | 'bottom')[];
  /** Reserve space for the floating tab bar on tab screens. */
  withTabBar?: boolean;
  grain?: boolean;
  /** Non-scrolling header pinned above the content. */
  header?: ReactNode;
  /** Non-scrolling footer pinned below the content (e.g. a sticky CTA). */
  footer?: ReactNode;
  keyboardAware?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'refreshControl'>;
}

/**
 * Every screen's outer shell: background token, safe areas, optional scroll + keyboard handling,
 * status-bar style matched to the background, and the paper-grain texture.
 */
export function ScreenContainer({
  children,
  background = 'primary',
  scroll = false,
  padded = true,
  edges = ['top', 'bottom'],
  withTabBar = false,
  grain = background === 'primary' || background === 'secondary',
  header,
  footer,
  keyboardAware = false,
  refreshControl,
  contentContainerStyle,
  style,
  scrollProps,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const bg = colors.background[background];
  const dark = background === 'inverse' || background === 'camera';
  const paddingTop = edges.includes('top') ? insets.top : 0;
  const bottomInset = edges.includes('bottom') ? insets.bottom : 0;
  const paddingBottom = withTabBar ? bottomInset + layout.tabBarClearance : bottomInset;
  const gutter = padded ? { paddingHorizontal: layout.screenPaddingX } : null;

  const body = scroll ? (
    <ScrollView
      {...scrollProps}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[gutter, { paddingBottom: footer ? 0 : paddingBottom }, contentContainerStyle]}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, gutter, { paddingBottom: footer ? 0 : paddingBottom }, contentContainerStyle]}>
      {children}
    </View>
  );

  const inner = (
    <>
      {header}
      {body}
      {footer ? <View style={[gutter, { paddingBottom: Math.max(paddingBottom, 12) }]}>{footer}</View> : null}
    </>
  );

  return (
    <View style={[styles.flex, { backgroundColor: bg, paddingTop }, style]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {grain ? <GrainOverlay /> : null}
      {keyboardAware ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
