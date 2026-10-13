import { Tabs } from 'expo-router/js-tabs';

import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { palette } from '@/theme/colors';

/**
 * JavaScript tabs with a fully custom tab bar (native tabs can't render the editorial capsule
 * and centre Analyze button). Tab switches cross-fade; the bar floats over content, so tab
 * screens reserve space with `ScreenContainer withTabBar`.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        sceneStyle: { backgroundColor: palette.cream },
      }}>
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="colors" options={{ title: 'My Colors' }} />
      <Tabs.Screen name="outfits" options={{ title: 'Outfits' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
