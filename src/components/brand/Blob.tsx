import { useMemo } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { blobPath } from '@/utils/blob';
import { shiftLightness } from '@/utils/color';

interface BlobProps {
  seed: number;
  color: string;
  size: number;
  variance?: number;
  points?: number;
  /** Adds a soft lighter→darker gradient so overlapping blobs read as layered paint. */
  shaded?: boolean;
  opacity?: number;
}

/** A single organic colour shape. Static geometry — animate the wrapping view, not the path. */
export function Blob({ seed, color, size, variance = 0.24, points = 7, shaded = true, opacity = 1 }: BlobProps) {
  const d = useMemo(() => blobPath(seed, { variance, points }), [seed, variance, points]);
  const gradientId = `blob-${seed}`;
  const light = useMemo(() => (shaded ? shiftLightness(color, 8) : color), [color, shaded]);
  const dark = useMemo(() => (shaded ? shiftLightness(color, -8) : color), [color, shaded]);

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no">
      {shaded ? (
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={light} />
            <Stop offset="1" stopColor={dark} />
          </LinearGradient>
        </Defs>
      ) : null}
      <Path d={d} fill={shaded ? `url(#${gradientId})` : color} opacity={opacity} />
    </Svg>
  );
}
