'use client';

/* eslint-disable @next/next/no-img-element -- portraits are blob: or short-lived signed URLs; next/image can't optimise either */
import { ImageOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { cx } from '../ui/cx';

interface PortraitFrameProps {
  /** `undefined` while loading/unknown, `null` when the portrait was deleted. */
  uri: string | null | undefined;
  /** Height / width. Portraits default to 4:5. */
  aspect?: number;
  caption?: string;
  shadow?: 'offset' | 'offset-coral' | 'offset-sky' | 'offset-sm' | 'none';
  /** Overlay content (badges, buttons) positioned by the caller. */
  children?: ReactNode;
  /** Rendered instead of the "unavailable" placeholder when there is no image (e.g. demo data). */
  placeholder?: ReactNode;
  alt?: string;
  className?: string;
}

const SHADOWS = {
  offset: 'shadow-offset',
  'offset-coral': 'shadow-offset-coral',
  'offset-sky': 'shadow-offset-sky',
  'offset-sm': 'shadow-offset-sm',
  none: '',
} as const;

/**
 * Editorial portrait frame: square corners, ink keyline and a hard offset shadow. Handles missing
 * or failed images with an explicit placeholder instead of an empty box.
 */
export function PortraitFrame({ uri, aspect = 1.25, caption, shadow = 'offset', children, placeholder, alt = 'Your portrait', className }: PortraitFrameProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showImage = Boolean(uri) && failedUri !== uri;

  return (
    <figure className={cx('flex flex-col', className)}>
      <div className={cx('editorial-frame relative w-full bg-sand', SHADOWS[shadow])} style={{ aspectRatio: `1 / ${aspect}` }}>
        {showImage ? (
          <img src={uri ?? undefined} alt={alt} className="absolute inset-0 size-full object-cover" onError={() => setFailedUri(uri ?? null)} />
        ) : placeholder ? (
          placeholder
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 text-center text-slate">
            <ImageOff aria-hidden size={24} />
            <span className="type-caption text-muted">{uri === null ? 'Portrait deleted' : 'Portrait unavailable'}</span>
          </div>
        )}
        {children}
      </div>
      {caption ? <figcaption className="type-eyebrow mt-3 text-muted">{caption}</figcaption> : null}
    </figure>
  );
}
