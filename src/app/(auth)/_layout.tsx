import { Stack } from 'expo-router';

import { palette } from '@/theme/colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: palette.cream },
      }}>
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
    </Stack>
  );
}
