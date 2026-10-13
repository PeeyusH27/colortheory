'use client';

/* eslint-disable @next/next/no-img-element -- portraits are blob: or short-lived signed URLs; next/image can't optimise either */
import { useState } from 'react';

import { palette } from '@/theme/colors';
import { readableOn, shiftLightness } from '@/utils/color';

import { cx } from '../ui/cx';

/**
 * "Colour drape" preview — the digital version of a stylist holding fabric under your chin.
 *
 * Mode A (no AI): your unmodified photo with a colour panel across the shoulders. Your face is
 * never recoloured, stretched or replaced, and the label says what it is. Without a portrait an
 * abstract paper-cut silhouette is used instead of any stock model.
 */

function Drape({ hex }: { hex: string }) {
  const fold = shiftLightness(hex, 10);
  const deep = shiftLightness(hex, -12);
  return (
    <svg aria-hidden viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-0 size-full">
      <path d="M0 12 Q18 5 36 8 L50 24 L64 8 Q82 5 100 12 L100 40 L0 40 Z" fill={hex} />
      <path d="M36 8 L50 24 L64 8 L60 8 L50 19 L40 8 Z" fill={deep} opacity={0.6} />
      <path d="M14 40 Q20 24 26 14" stroke={fold} strokeWidth={1.4} fill="none" opacity={0.7} />
      <path d="M78 40 Q80 26 86 14" stroke={fold} strokeWidth={1.4} fill="none" opacity={0.7} />
      <path d="M44 40 Q47 32 50 26 Q53 32 56 40" stroke={deep} strokeWidth={1} fill="none" opacity={0.5} />
    </svg>
  );
}

/** Abstract mannequin-grey figure — deliberately not a skin tone, so no one's colouring is implied. */
const FIGURE = '#C3C8D0';

function Silhouette({ background }: { background: string }) {
  return (
    <svg aria-hidden viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
      <rect x={0} y={0} width={100} height={125} fill={background} />
      <rect x={43} y={58} width={14} height={18} fill={FIGURE} />
      <path d="M10 125 Q14 84 50 79 Q86 84 90 125 Z" fill={FIGURE} />
      <ellipse cx={50} cy={44} rx={16} ry={20} fill={FIGURE} />
      <path d="M33 47 Q30 21 50 20 Q71 20 68 46 Q66 33 57 30 Q45 27 36 37 Q34 41 33 47 Z" fill={palette.navy} opacity={0.88} />
    </svg>
  );
}

interface DrapePreviewProps {
  hex: string;
  colorName: string;
  portraitUri?: string | null;
  /** Panel colour behind the silhouette when there is no portrait. */
  background?: string;
  showLabel?: boolean;
  /** Height / width. */
  aspect?: number;
  className?: string;
}

export function DrapePreview({
  hex,
  colorName,
  portraitUri,
  background = palette.sand,
  showLabel = true,
  aspect = 1.25,
  className,
}: DrapePreviewProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const usePortrait = Boolean(portraitUri) && failedUri !== portraitUri;

  return (
    <div
      role="img"
      aria-label={`${colorName} colour drape${usePortrait ? ' over your portrait' : ' on an illustrated figure'}. Not an AI-generated try-on.`}
      className={cx('relative w-full overflow-hidden bg-sand', className)}
      style={{ aspectRatio: `1 / ${aspect}` }}>
      {usePortrait ? (
        <img
          src={portraitUri ?? undefined}
          alt=""
          className="absolute inset-0 size-full object-cover object-top"
          onError={() => setFailedUri(portraitUri ?? null)}
        />
      ) : (
        <Silhouette background={background} />
      )}
      <div className="absolute inset-x-0 bottom-0 h-[30%]">
        <Drape hex={hex} />
      </div>
      {showLabel ? (
        <span className="type-eyebrow absolute right-2 bottom-2 left-2 truncate text-[0.625rem] tracking-[0.16em]" style={{ color: readableOn(hex) }}>
          {colorName}
        </span>
      ) : null}
    </div>
  );
}
