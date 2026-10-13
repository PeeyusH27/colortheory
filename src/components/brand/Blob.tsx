import type { CSSProperties } from 'react';

import { blobPath } from '@/utils/blob';
import { shiftLightness } from '@/utils/color';

interface BlobProps {
  seed: number;
  color: string;
  variance?: number;
  points?: number;
  /** Adds a soft lighter→darker gradient so overlapping blobs read as layered paint. */
  shaded?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** A single organic colour shape that fills its container. Animate the wrapper, not the path. */
export function Blob({ seed, color, variance = 0.24, points = 7, shaded = true, className, style }: BlobProps) {
  const d = blobPath(seed, { variance, points });
  const gradientId = `blob-${seed}-${color.replace('#', '')}`;
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={className} style={style}>
      {shaded ? (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={shiftLightness(color, 8)} />
            <stop offset="1" stopColor={shiftLightness(color, -8)} />
          </linearGradient>
        </defs>
      ) : null}
      <path d={d} fill={shaded ? `url(#${gradientId})` : color} />
    </svg>
  );
}
