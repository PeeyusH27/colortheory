/* eslint-disable @next/next/no-img-element -- avatars are local data URLs, which next/image can't optimise */
import { initialsFrom } from '@/utils/format';

import { cx } from './cx';

interface AvatarProps {
  name: string | null | undefined;
  src?: string | null;
  size?: number;
  className?: string;
}

/** Profile picture (kept in this browser only) or initials on a brand colour. */
export function Avatar({ name, src, size = 56, className }: AvatarProps) {
  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-navy bg-denim text-cream', className)}
      style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden className="font-serif font-bold" style={{ fontSize: size * 0.38 }}>
          {initialsFrom(name)}
        </span>
      )}
    </span>
  );
}
