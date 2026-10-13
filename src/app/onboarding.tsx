import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, ShieldCheck } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type FlatList } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { DrapePanels, PaletteStack, SwatchFan } from '@/components/brand/EditorialArt';
import { GrainOverlay } from '@/components/ui/GrainOverlay';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Text } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { selectIsAuthenticated, useAuthStore } from '@/features/auth/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { palette } from '@/theme/colors';
import { enterUp } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { layout, spacing } from '@/theme/spacing';

interface Page {
  key: string;
  eyebrow: string;
  title: string;
  accent: string;
  body: string;
  background: string;
  Art: (props: { width: number; height: number }) => React.ReactElement;
}

const PAGES: Page[] = [
  {
    key: 'discover',
    eyebrow: '01 — Discover',
    title: 'Discover your',
    accent: 'colours.',
    body: 'Take a portrait and see which shades work with your visible colouring — explained in plain language, not jargon.',
    background: palette.cream,
    Art: SwatchFan,
  },
  {
    key: 'styles',
    eyebrow: '02 — Preview',
    title: 'See yourself in',
    accent: 'new styles.',
    body: 'Hold each colour up to your own photo with a digital drape, then explore outfit combinations built around it.',
    background: palette.sand,
    Art: DrapePanels,
  },
  {
    key: 'palette',
    eyebrow: '03 — Collect',
    title: 'Build your personal',
    accent: 'palette.',
    body: 'Save palettes, favourite colours and outfits. Revisit any analysis and adjust it when your style evolves.',
    background: palette.mist,
    Art: PaletteStack,
  },
];

const AnimatedFlatList = Animated.FlatList<Page>;

function PageView({ page, index, active, scrollX, width, artHeight }: { page: Page; index: number; active: boolean; scrollX: SharedValue<number>; width: number; artHeight: number }) {
  const artStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      transform: [
        { translateX: interpolate(scrollX.get(), input, [width * 0.35, 0, -width * 0.35], Extrapolation.CLAMP) },
        { scale: interpolate(scrollX.get(), input, [0.88, 1, 0.88], Extrapolation.CLAMP) },
      ],
      opacity: interpolate(scrollX.get(), input, [0.2, 1, 0.2], Extrapolation.CLAMP),
    };
  });
  const artWidth = width - layout.screenPaddingX * 2;

  return (
    <View style={{ width }} accessible={false}>
      <Animated.View style={[styles.art, { height: artHeight }, artStyle]}>
        <page.Art width={artWidth} height={artHeight} />
      </Animated.View>
      {/* Keyed by `active` so the staggered copy entrance replays each time the page is shown. */}
      <View key={active ? 'active' : 'inactive'} style={styles.copy}>
        <Animated.View entering={active ? enterUp(0, 80) : undefined}>
          <Text variant="eyebrow" tone="secondary">
            {page.eyebrow}
          </Text>
        </Animated.View>
        <Animated.View entering={active ? enterUp(1, 80) : undefined}>
          <Text variant="displayL" accessibilityRole="header">
            {page.title}{' '}
            <Text variant="displayL" color={palette.denim} italic>
              {page.accent}
            </Text>
          </Text>
        </Animated.View>
        <Animated.View entering={active ? enterUp(2, 80) : undefined}>
          <Text variant="bodyL" tone="secondary">
            {page.body}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

function Dot({ index, scrollX, width }: { index: number; scrollX: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      width: interpolate(scrollX.get(), input, [8, 28, 8], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.get(), input, [0.35, 1, 0.35], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { revisit } = useLocalSearchParams<{ revisit?: string }>();
  const authenticated = useAuthStore(selectIsAuthenticated);
  const completeOnboarding = usePreferencesStore((s) => s.completeOnboarding);
  const listRef = useRef<FlatList<Page>>(null);
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.set(e.contentOffset.x);
  });

  const backgroundStyle = useAnimatedStyle(() => {
    const p = scrollX.get() / width;
    // Step between page backgrounds as the user swipes.
    const i = Math.min(PAGES.length - 1, Math.max(0, Math.round(p)));
    return { backgroundColor: PAGES[i]?.background ?? palette.cream };
  });

  const finish = () => {
    completeOnboarding();
    if (revisit && router.canGoBack()) router.back();
    else router.replace(authenticated ? '/discover' : '/welcome');
  };

  const next = () => {
    if (index >= PAGES.length - 1) finish();
    else listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const last = index === PAGES.length - 1;
  const artHeight = Math.min(height * 0.42, 380);

  return (
    <Animated.View style={[styles.root, backgroundStyle]}>
      <StatusBar style="dark" />
      <GrainOverlay />
      <View style={[styles.topBar, { paddingTop: insets.top + spacing[2] }]}>
        <Text variant="eyebrow" tone="secondary">
          ColorTheory
        </Text>
        {!last ? <TextButton label="Skip" onPress={finish} accessibilityHint="Skips the introduction" /> : <View style={styles.skipSpacer} />}
      </View>

      <AnimatedFlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={(p) => p.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) => <PageView page={item} index={i} active={i === index} scrollX={scrollX} width={width} artHeight={artHeight} />}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
        {last ? (
          <View style={styles.privacy} accessible accessibilityRole="text">
            <ShieldCheck size={18} color={palette.success} />
            <Text variant="bodyS" tone="secondary" style={styles.privacyText}>
              Your portrait is analysed on this device by default. Nothing is uploaded unless you choose cloud analysis, and you can delete it at any time.{' '}
              <Text variant="bodyS" tone="accent" onPress={() => router.push('/legal/privacy')} accessibilityRole="link" style={styles.link}>
                Privacy
              </Text>
            </Text>
          </View>
        ) : null}
        <View style={styles.footerRow}>
          <View style={styles.dots} accessible accessibilityLabel={`Page ${index + 1} of ${PAGES.length}`}>
            {PAGES.map((p, i) => (
              <Dot key={p.key} index={i} scrollX={scrollX} width={width} />
            ))}
          </View>
          <PrimaryButton
            label={last ? 'Get started' : 'Continue'}
            icon={ArrowRight}
            onPress={next}
            tone={last ? 'coral' : 'ink'}
            accessibilityHint={last ? 'Finishes the introduction' : 'Shows the next page'}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingX,
  },
  skipSpacer: { height: layout.minTouchTarget },
  art: { marginHorizontal: layout.screenPaddingX, marginTop: spacing[4], justifyContent: 'center' },
  copy: { paddingHorizontal: layout.screenPaddingX, gap: spacing[3], marginTop: spacing[6] },
  footer: { paddingHorizontal: layout.screenPaddingX, gap: spacing[4] },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[4] },
  dots: { flexDirection: 'row', gap: spacing[2], alignItems: 'center' },
  dot: { height: 8, borderRadius: radii.pill, backgroundColor: palette.navy },
  privacy: { flexDirection: 'row', gap: spacing[2], alignItems: 'flex-start' },
  privacyText: { flex: 1 },
  link: { textDecorationLine: 'underline' },
});
