import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { palette } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { initialsFrom } from '@/utils/format';

import { Text } from './Text';

interface AvatarProps {
  name?: string | null;
  uri?: string | null;
  size?: number;
  /** Ring colour; defaults to the brand coral so the avatar reads as an accent in headers. */
  ringColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ name, uri, size = 44, ringColor = palette.coral, style }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(uri) && !failed;
  const inner = size - 6;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name ? `${name}'s profile picture` : 'Profile picture'}
      style={[styles.ring, { width: size, height: size, borderColor: ringColor }, style]}>
      {showImage ? (
        <Image
          source={{ uri: uri ?? undefined }}
          style={{ width: inner, height: inner, borderRadius: inner / 2 }}
          contentFit="cover"
          transition={150}
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={[styles.fallback, { width: inner, height: inner, borderRadius: inner / 2 }]}>
          <Text variant="label" color={palette.cream} style={{ fontSize: Math.max(12, size * 0.34) }}>
            {initialsFrom(name)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    backgroundColor: palette.denim,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
