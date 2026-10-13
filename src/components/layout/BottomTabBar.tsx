import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { LucideIcon } from 'lucide-react-native';
import { Camera, Compass, Palette, Shirt, UserRound } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/colors';
import { durations, springs } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { shadows } from '@/theme/shadows';
import { layout, spacing } from '@/theme/spacing';

const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  discover: { icon: Compass, label: 'Discover' },
  colors: { icon: Palette, label: 'My Colors' },
  outfits: { icon: Shirt, label: 'Outfits' },
  profile: { icon: UserRound, label: 'Profile' },
};

function TabItem({ focused, name, onPress, onLongPress }: { focused: boolean; name: string; onPress: () => void; onLongPress: () => void }) {
  const meta = ICONS[name] ?? { icon: Compass, label: name };
  const Icon = meta.icon;
  const pill = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0, { duration: durations.quick }),
    transform: [{ scale: withSpring(focused ? 1 : 0.6, springs.selection) }],
  }));

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      haptic="selection"
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
      style={styles.item}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.pill, pill]} />
      <Icon size={20} color={focused ? palette.navy : palette.cream} strokeWidth={focused ? 2.4 : 1.8} />
      <Text variant="caption" color={focused ? palette.navy : 'rgba(247,243,236,0.72)'} style={styles.label} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {meta.label}
      </Text>
    </PressableScale>
  );
}

/**
 * Floating editorial tab bar: an ink capsule with a cream pill for the active tab and a coral
 * "Analyze" button in the centre, so the core camera flow is one tap from every tab.
 */
export function BottomTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const routes = state.routes;
  const half = Math.ceil(routes.length / 2);

  const renderTab = (route: (typeof routes)[number], index: number) => {
    const focused = state.index === index;
    return (
      <TabItem
        key={route.key}
        name={route.name}
        focused={focused}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
      />
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.host, { paddingBottom: Math.max(insets.bottom, spacing[3]) }]}>
      <View style={[styles.bar, shadows.floating]} accessibilityRole="tablist">
        {routes.slice(0, half).map((r, i) => renderTab(r, i))}
        <PressableScale
          onPress={() => router.push('/camera')}
          accessibilityRole="button"
          accessibilityLabel="Analyze my look"
          accessibilityHint="Opens the camera to take a portrait"
          pressedScale={0.92}
          style={styles.fab}>
          <Camera size={22} color={palette.ink} strokeWidth={2.2} />
        </PressableScale>
        {routes.slice(half).map((r, i) => renderTab(r, i + half))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: spacing[3] },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.ink,
    borderRadius: radii.pill,
    height: layout.tabBarHeight,
    paddingHorizontal: spacing[2],
    gap: 2,
    width: '100%',
    maxWidth: 480,
  },
  item: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radii.pill },
  pill: { backgroundColor: palette.cream, borderRadius: radii.pill },
  label: { fontSize: 10, lineHeight: 12 },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    borderWidth: 2,
    borderColor: palette.cream,
  },
});
