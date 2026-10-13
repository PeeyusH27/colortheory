import { Image } from 'expo-image';
import { ImageOff } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/colors';
import { shadows, type ShadowToken } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

interface PortraitFrameProps {
  uri: string | null | undefined;
  width: number;
  /** Height / width. Portraits default to 4:5. */
  aspectRatio?: number;
  caption?: string;
  shadow?: ShadowToken;
  /** Overlay content (badges, buttons) positioned by the caller. */
  children?: ReactNode;
  /** Rendered instead of the "unavailable" placeholder when there is no image (e.g. demo data). */
  placeholder?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Editorial portrait frame: square corners, ink keyline and a hard offset shadow. Handles missing
 * or failed images with an explicit placeholder instead of an empty box.
 */
export function PortraitFrame({
  uri,
  width,
  aspectRatio = 1.25,
  caption,
  shadow = 'offsetInk',
  children,
  placeholder,
  accessibilityLabel = 'Your portrait',
  style,
}: PortraitFrameProps) {
  const [failed, setFailed] = useState(false);
  const height = Math.round(width * aspectRatio);
  const showImage = Boolean(uri) && !failed;

  return (
    <View style={style}>
      <View style={[styles.frame, { width, height }, shadows[shadow]]}>
        {showImage ? (
          <Image
            source={{ uri: uri ?? undefined }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
            accessibilityLabel={accessibilityLabel}
            onError={() => setFailed(true)}
          />
        ) : placeholder ? (
          placeholder
        ) : (
          <View style={styles.placeholder} accessible accessibilityLabel="Portrait unavailable">
            <ImageOff size={28} color={palette.slate} />
            <Text variant="caption" tone="secondary" align="center">
              {uri === null ? 'Portrait deleted' : 'Portrait unavailable'}
            </Text>
          </View>
        )}
        {children}
      </View>
      {caption ? (
        <Text variant="eyebrow" tone="secondary" style={styles.caption}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: 1.5, borderColor: palette.navy, backgroundColor: palette.sand, overflow: 'visible' },
  placeholder: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
  caption: { marginTop: spacing[3] },
});
