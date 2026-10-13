import { palette } from '@/theme/colors';
import { readableOn } from '@/utils/color';

import { DrapePreview } from '../outfits/DrapePreview';
import { OutfitFlatLay } from '../outfits/OutfitFlatLay';
import { cx } from '../ui/cx';

import { Blob } from './Blob';

/**
 * Static editorial compositions for the landing page and empty heroes. Everything is drawn from
 * brand tokens and original SVG — no stock photography. All decorative (aria-hidden).
 */

const FAN = [
  { name: 'Navy', hex: palette.navy, rotate: -16, x: 0.02, y: 0.16 },
  { name: 'Denim', hex: palette.denim, rotate: -7, x: 0.16, y: 0.08 },
  { name: 'Petrol', hex: palette.petrol, rotate: 2, x: 0.32, y: 0.04 },
  { name: 'Sky', hex: palette.sky, rotate: 10, x: 0.47, y: 0.08 },
  { name: 'Coral', hex: palette.coral, rotate: 19, x: 0.6, y: 0.17 },
];

/** A fanned deck of paint-chip cards over a colour blob. */
export function SwatchFan({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cx('relative aspect-[1/0.9] w-full', className)}>
      <Blob seed={5} color={palette.mist} className="absolute top-[2%] left-[12%] w-[80%]" />
      <Blob seed={9} color={palette.saffron} className="absolute top-[62%] left-[62%] w-[28%]" />
      {FAN.map((c, i) => (
        <div
          key={c.hex}
          className="absolute flex aspect-[1/1.55] w-[30%] animate-enter-up flex-col border border-navy bg-paper shadow-raised"
          style={{ left: `${c.x * 100}%`, top: `${c.y * 100 + 6}%`, rotate: `${c.rotate}deg`, animationDelay: `${i * 70}ms` }}>
          <span className="m-1.5 mb-0 flex-1" style={{ backgroundColor: c.hex }} />
          <span className="flex flex-col gap-0.5 p-2">
            <span className="type-caption truncate text-[0.6875rem] text-navy">{c.name}</span>
            <span className="type-hex text-[0.5625rem] leading-3 text-muted">{c.hex}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

const PANELS = [
  { name: 'Navy', hex: palette.navy, bg: palette.sand },
  { name: 'Denim', hex: palette.denim, bg: palette.mist },
  { name: 'Petrol', hex: palette.petrol, bg: palette.linen },
  { name: 'Coral', hex: palette.coral, bg: palette.sand },
];

/** "Same person, different colours" panels, drawn as silhouettes. */
export function DrapePanels({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cx('flex w-full items-start justify-center gap-2', className)}>
      {PANELS.map((p, i) => (
        <div key={p.hex} className={cx('min-w-0 flex-1 animate-enter-up', i % 2 === 1 && 'mt-8')} style={{ animationDelay: `${i * 80}ms` }}>
          <DrapePreview hex={p.hex} colorName={p.name} background={p.bg} showLabel={false} aspect={2} className="editorial-frame" />
          <div className="border-[1.5px] border-t-0 border-navy px-1.5 py-1" style={{ backgroundColor: p.hex }}>
            <span className="type-eyebrow block truncate text-[0.5625rem] tracking-[0.14em]" style={{ color: readableOn(p.hex) }}>
              {p.name}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** A saved palette card with an outfit flat-lay tucked behind it. */
export function PaletteStack({ className }: { className?: string }) {
  const colors = [palette.navy, palette.denim, palette.petrol, palette.sky, palette.camel];
  return (
    <div aria-hidden className={cx('relative aspect-[1/0.95] w-full', className)}>
      <div className="absolute top-[4%] right-0 w-1/2 rotate-6 shadow-offset-coral">
        <OutfitFlatLay
          className="editorial-frame"
          pieces={[
            { garment: 'shirt', role: 'main', label: 'Shirt', colorName: 'Navy Blue', hex: palette.navy },
            { garment: 'trousers', role: 'secondary', label: 'Trousers', colorName: 'Beige', hex: '#D9C3A0' },
            { garment: 'shoes', role: 'shoes', label: 'Loafers', colorName: 'Cognac', hex: '#8A4B2A' },
          ]}
        />
      </div>
      <div className="editorial-frame absolute top-[22%] left-0 w-[56%] -rotate-4 bg-paper shadow-offset">
        <div className="aspect-[1/0.62] bg-navy" />
        <div className="flex h-6 border-t border-navy">
          {colors.map((c) => (
            <span key={c} className="flex-1" style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="flex flex-col gap-0.5 border-t-[1.5px] border-navy p-3">
          <span className="type-h3 text-navy">My Blues</span>
          <span className="type-caption text-muted">5 colours · saved</span>
        </div>
      </div>
    </div>
  );
}
