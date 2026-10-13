import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { ToastHost } from '@/components/ui/Toast';
import { initializeAuth } from '@/features/auth/authService';
import { selectIsAuthenticated, useAuthStore } from '@/features/auth/authStore';
import { queryClient } from '@/lib/queryClient';
import { usePreferencesStore } from '@/store/preferencesStore';
import { palette } from '@/theme/colors';
import { FONT_LOAD_TIMEOUT_MS, fontAssets } from '@/theme/fonts';
import { setCustomFontsAvailable } from '@/theme/typography';

// Keep the native splash (ink background + colour-wheel mark) up until fonts, preferences and
// the persisted session are ready, so the first JS frame is the animated splash — never a blank
// screen or a flash of fallback fonts.
SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 250, fade: true });

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.cream,
    card: palette.cream,
    text: palette.navy,
    primary: palette.navy,
    border: palette.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [fontTimedOut, setFontTimedOut] = useState(false);
  const hydrated = usePreferencesStore((s) => s.hasHydrated);
  const authStatus = useAuthStore((s) => s.status);

  useEffect(() => {
    const timer = setTimeout(() => setFontTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated) void initializeAuth();
  }, [hydrated]);

  const fontsReady = fontsLoaded || Boolean(fontError) || fontTimedOut;
  // Fall back to platform fonts if loading failed or is still pending after the timeout.
  if (fontsReady) setCustomFontsAvailable(fontsLoaded);

  const ready = fontsReady && hydrated && authStatus !== 'initializing';

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={navigationTheme}>
            <RootNavigator />
            <OfflineBanner />
            <ToastHost />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Route groups are guarded declaratively. When auth state changes, Expo Router removes screens
 * whose guard became false and returns to the anchor (`index`), which redirects to the right
 * place — so sign-in/out never needs imperative navigation and cannot loop.
 */
function RootNavigator() {
  const authenticated = useAuthStore(selectIsAuthenticated);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.cream },
        animation: 'fade',
      }}>
      <Stack.Screen name="index" options={{ animation: 'none', contentStyle: { backgroundColor: palette.ink } }} />
      <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="auth-callback" options={{ animation: 'fade' }} />
      <Stack.Screen name="reset-password" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="legal/[doc]" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />

      <Stack.Protected guard={!authenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={authenticated}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
});
