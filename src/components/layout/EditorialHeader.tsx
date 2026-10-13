import { router } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { enterUp } from '@/theme/motion';
import { spacing } from '@/theme/spacing';

interface EditorialHeaderProps {
  eyebrow?: string;
  title?: string;
  /** Italic serif line under the title — the "deck" in magazine terms. */
  deck?: string;
  /** Back affordance. `close` is used on modal routes. */
  leading?: 'back' | 'close' | 'none';
  onLeadingPress?: () => void;
  trailing?: ReactNode;
  inverse?: boolean;
  size?: 'display' | 'h1' | 'h2';
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Magazine-style screen header: small uppercase eyebrow, oversized serif title, italic deck.
 * Screens use this instead of the native header so typography stays on-brand.
 */
export function EditorialHeader({
  eyebrow,
  title,
  deck,
  leading = 'none',
  onLeadingPress,
  trailing,
  inverse = false,
  size = 'h1',
  animated = true,
  style,
}: EditorialHeaderProps) {
  const handleLeading = () => {
    if (onLeadingPress) onLeadingPress();
    else if (router.canGoBack()) router.back();
  };

  const showBar = leading !== 'none' || trailing;
  return (
    <View style={[styles.container, style]}>
      {showBar ? (
        <View style={styles.bar}>
          {leading !== 'none' ? (
            <IconButton
              icon={leading === 'close' ? X : ArrowLeft}
              accessibilityLabel={leading === 'close' ? 'Close' : 'Go back'}
              onPress={handleLeading}
              variant={inverse ? 'glass' : 'outline'}
              size={40}
            />
          ) : (
            <View />
          )}
          <View style={styles.trailing}>{trailing}</View>
        </View>
      ) : null}
      {eyebrow || title || deck ? (
        <Animated.View entering={animated ? enterUp(0) : undefined} style={styles.copy}>
          {eyebrow ? (
            <Text variant="eyebrow" tone={inverse ? 'inverseSecondary' : 'secondary'}>
              {eyebrow}
            </Text>
          ) : null}
          {title ? (
            <Text
              variant={size === 'display' ? 'displayL' : size}
              tone={inverse ? 'inverse' : 'primary'}
              accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {deck ? (
            <Text variant="editorial" tone={inverse ? 'inverseSecondary' : 'secondary'} style={styles.deck}>
              {deck}
            </Text>
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[4] },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  copy: { gap: spacing[2] },
  deck: { fontSize: 18, lineHeight: 26 },
});
