import { cx } from '../ui/cx';

interface PaletteStripProps {
  colors: { name: string; hex: string }[];
  /** Height in px. */
  height?: number;
  className?: string;
  label?: string;
}

/** Continuous band of colours (palette preview). One labelled image for assistive tech. */
export function PaletteStrip({ colors, height = 24, className, label }: PaletteStripProps) {
  if (colors.length === 0) return null;
  return (
    <div
      role="img"
      aria-label={label ?? `Palette: ${colors.map((c) => c.name).join(', ')}`}
      className={cx('flex w-full overflow-hidden border border-navy/20', className)}
      style={{ height }}>
      {colors.map((c, i) => (
        <span key={`${c.hex}-${i}`} className="h-full flex-1" style={{ backgroundColor: c.hex }} />
      ))}
    </div>
  );
}
