import { Stack } from 'expo-router';

import { palette } from '@/theme/colors';

/**
 * Authenticated stack. The native stack owns all screen-to-screen transitions (one animation
 * system); screens only animate their own content with Reanimated.
 */
export const unstable_settings = {
  anchor: '(tabs)',
};

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: palette.cream },
      }}>
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      {/* Capture flow: the camera rises from below; confirmation/analysis cross-fade so the
          captured photo appears to carry through. */}
      <Stack.Screen name="camera" options={{ animation: 'slide_from_bottom', contentStyle: { backgroundColor: palette.black }, gestureEnabled: true }} />
      <Stack.Screen name="portrait-confirmation" options={{ animation: 'fade', contentStyle: { backgroundColor: palette.ink } }} />
      <Stack.Screen name="analysis" options={{ animation: 'fade', gestureEnabled: false, contentStyle: { backgroundColor: palette.ink } }} />
      <Stack.Screen name="results/[analysisId]" options={{ animation: 'fade' }} />
      <Stack.Screen name="palette/[analysisId]" />
      <Stack.Screen name="gallery/[analysisId]" />
      <Stack.Screen name="outfit/[outfitId]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="history" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="portraits" />
    </Stack>
  );
}
