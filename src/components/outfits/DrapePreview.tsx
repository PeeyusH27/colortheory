import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { readableOn, shiftLightness } from '@/utils/color';

/**
 * "Colour drape" preview — the digital version of a stylist holding fabric under your chin.
 *
 * Mode A (no AI): your unmodified photo with a colour panel across the shoulders. Your face is
 * never recoloured, stretched or replaced, and the label says what it is. Without a portrait an
 * abstract paper-cut silhouette is used instead of any stock model.
 */

function Drape({ hex, width, height }: { hex: string; width: number; height: number }) {
  const fold = shiftLightness(hex, 10);
  const deep = shiftLightness(hex, -12);
  return (
    <Svg width={width} height={height} viewBox="0 0 100 40" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      {/* V-neck cape silhouette with soft folds. */}
      <Path d="M0 12 Q18 5 36 8 L50 24 L64 8 Q82 5 100 12 L100 40 L0 40 Z" fill={hex} />
      <Path d="M36 8 L50 24 L64 8 L60 8 L50 19 L40 8 Z" fill={deep} opacity={0.6} />
      <Path d="M14 40 Q20 24 26 14" stroke={fold} strokeWidth={1.4} fill="none" opacity={0.7} />
      <Path d="M78 40 Q80 26 86 14" stroke={fold} strokeWidth={1.4} fill="none" opacity={0.7} />
      <Path d="M44 40 Q47 32 50 26 Q53 32 56 40" stroke={deep} strokeWidth={1} fill="none" opacity={0.5} />
    </Svg>
  );
}

/** Abstract mannequin-grey figure — deliberately not a skin tone, so no one's colouring is implied. */
const FIGURE = '#C3C8D0';

function Silhouette({ width, height, background }: { width: number; height: number; background: string }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice">
      <Rect x={0} y={0} width={100} height={125} fill={background} />
      <Rect x={43} y={58} width={14} height={18} fill={FIGURE} />
      <Path d="M10 125 Q14 84 50 79 Q86 84 90 125 Z" fill={FIGURE} />
      <Ellipse cx={50} cy={44} rx={16} ry={20} fill={FIGURE} />
      <Path d="M33 47 Q30 21 50 20 Q71 20 68 46 Q66 33 57 30 Q45 27 36 37 Q34 41 33 47 Z" fill={palette.navy} opacity={0.88} />
    </Svg>
  );
}

interface DrapePreviewProps {
  hex: string;
  colorName: string;
  portraitUri?: string | null;
  width: number;
  height: number;
  /** Panel colour behind the silhouette when there is no portrait. */
  background?: string;
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const DrapePreview = memo(function DrapePreview({
  hex,
  colorName,
  portraitUri,
  width,
  height,
  background = palette.sand,
  showLabel = true,
  style,
}: DrapePreviewProps) {
  const [failed, setFailed] = useState(false);
  const usePortrait = Boolean(portraitUri) && !failed;
  const drapeHeight = height * 0.3;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${colorName} colour drape${usePortrait ? ' over your portrait' : ' on an illustrated figure'}. Not an AI-generated try-on.`}
      style={[{ width, height }, styles.frame, style]}>
      {usePortrait ? (
        <Image
          source={{ uri: portraitUri ?? undefined }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition="top"
          transition={200}
          recyclingKey={portraitUri ?? undefined}
          onError={() => setFailed(true)}
        />
      ) : (
        <Silhouette width={width} height={height} background={background} />
      )}
      <View style={[styles.drape, { height: drapeHeight }]}>
        <Drape hex={hex} width={width} height={drapeHeight} />
      </View>
      {showLabel ? (
        <View style={styles.label}>
          <Text variant="eyebrow" color={readableOn(hex)} numberOfLines={1} style={styles.labelText}>
            {colorName}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: palette.sand },
  drape: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  label: { position: 'absolute', left: spacing[2], right: spacing[2], bottom: spacing[2] },
  labelText: { fontSize: 10, letterSpacing: 1.6 },
});
