import { useNetworkState } from 'expo-network';
import { WifiOff } from 'lucide-react-native';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/colors';
import { durations } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

/**
 * Global offline indicator. `isConnected === false` is used (not `isInternetReachable`), because
 * reachability is often `undefined` briefly at startup and would flash the banner.
 */
export function OfflineBanner() {
  const network = useNetworkState();
  const insets = useSafeAreaInsets();
  const offline = Platform.OS !== 'web' && network.isConnected === false;
  if (!offline) return null;

  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + spacing[1] }]}>
      <Animated.View
        entering={FadeInUp.duration(durations.base).reduceMotion(ReduceMotion.System)}
        exiting={FadeOutUp.duration(durations.quick).reduceMotion(ReduceMotion.System)}
        accessibilityLiveRegion="polite"
        accessibilityLabel="You are offline. Items saved on this device are still available."
        style={styles.pill}>
        <WifiOff size={14} color={palette.ink} strokeWidth={2.4} />
        <Text variant="caption" color={palette.ink}>
          Offline — showing what’s on this device
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: palette.saffron,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2,
    borderRadius: radii.pill,
  },
});
