'use client';

import { Copy, Heart, Shirt } from 'lucide-react';

import { findLibraryColorByHex } from '@/features/colors/colorLibrary';
import { palette } from '@/theme/colors';
import type { ColorRecommendation, GarmentCategory } from '@/types/domain';
import { contrastRatio, darkVariant, lightVariant, readableOn } from '@/utils/color';

import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { toast } from '../ui/Toast';

const GARMENT_LABELS: Record<GarmentCategory, string> = {
  shirt: 'Shirts',
  tee: 'T-shirts',
  knit: 'Knitwear',
  jacket: 'Jackets',
  coat: 'Coats',
  trousers: 'Trousers',
  jeans: 'Jeans',
  skirt: 'Skirts',
  dress: 'Dresses',
  shoes: 'Shoes',
  accessory: 'Accessories',
};

const ROLE_LABELS: Record<ColorRecommendation['role'], string> = {
  core: 'Core colour',
  accent: 'Accent',
  neutral: 'Neutral',
  experimental: 'Try with care',
};

export interface ColorDetailSheetColor {
  name: string;
  hex: string;
  role?: ColorRecommendation['role'];
  reason?: string;
  garments?: GarmentCategory[];
  pairings?: string[];
}

interface ColorDetailSheetProps {
  color: ColorDetailSheetColor | null;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  favoritePending?: boolean;
  onShowOutfits?: () => void;
}

function MiniSwatch({ hex, label }: { hex: string; label: string }) {
  return (
    <div role="img" aria-label={`${label} ${hex}`} className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="h-12 w-full border border-navy/15" style={{ backgroundColor: hex }} />
      <span className="type-caption truncate text-navy">{label}</span>
      <span className="type-hex -mt-1 text-[0.6875rem] text-muted">{hex}</span>
    </div>
  );
}

export function ColorDetailSheet({ color, onClose, isFavorite, onToggleFavorite, favoritePending, onShowOutfits }: ColorDetailSheetProps) {
  const c = color ?? { name: 'Colour', hex: '#000000' };
  const garments = c.garments ?? findLibraryColorByHex(c.hex)?.garments ?? [];
  const onColor = readableOn(c.hex);

  const copyHex = async () => {
    try {
      await navigator.clipboard.writeText(c.hex);
      toast.success(`${c.hex} copied`);
    } catch {
      toast.error('Copying isn’t allowed here. Select the code and copy it manually.');
    }
  };

  return (
    <Sheet
      open={color !== null}
      onClose={onClose}
      title={c.name}
      description={c.role ? ROLE_LABELS[c.role] : 'Colour'}
      footer={
        onToggleFavorite || onShowOutfits ? (
          <div className="flex gap-3">
            {onToggleFavorite ? (
              <Button variant="secondary" icon={Heart} onClick={onToggleFavorite} loading={favoritePending} aria-pressed={isFavorite} className="flex-1">
                {isFavorite ? 'Favourited' : 'Favourite'}
              </Button>
            ) : null}
            {onShowOutfits ? (
              <Button icon={Shirt} onClick={onShowOutfits} className="flex-1">
                Outfits
              </Button>
            ) : null}
          </div>
        ) : null
      }>
      {color ? (
        <div className="flex flex-col gap-6">
          <div className="editorial-frame flex h-40 items-end justify-between gap-3 p-4" style={{ backgroundColor: c.hex, color: onColor }}>
            <span className="type-hex text-lg select-all">{c.hex}</span>
            <Button size="sm" variant="secondary" tone={onColor === palette.cream ? 'cream' : 'ink'} icon={Copy} onClick={() => void copyHex()}>
              Copy hex
            </Button>
          </div>
          {c.reason ? <p className="type-body-m text-muted">{c.reason}</p> : null}
          {garments.length ? (
            <section className="flex flex-col gap-2">
              <h3 className="type-eyebrow text-muted">Wear it as</h3>
              <div className="flex flex-wrap gap-2">
                {garments.map((g) => (
                  <Badge key={g} label={GARMENT_LABELS[g]} />
                ))}
              </div>
            </section>
          ) : null}
          <section className="flex flex-col gap-2">
            <h3 className="type-eyebrow text-muted">Light &amp; dark variants</h3>
            <div className="flex gap-3">
              <MiniSwatch hex={lightVariant(c.hex)} label="Lighter" />
              <MiniSwatch hex={c.hex} label="Base" />
              <MiniSwatch hex={darkVariant(c.hex)} label="Deeper" />
            </div>
          </section>
          {c.pairings?.length ? (
            <section className="flex flex-col gap-2">
              <h3 className="type-eyebrow text-muted">Pairs well with</h3>
              <div className="flex gap-3">
                {c.pairings.map((hex) => (
                  <MiniSwatch key={hex} hex={hex} label={findLibraryColorByHex(hex)?.name ?? 'Pairing'} />
                ))}
              </div>
            </section>
          ) : null}
          <p className="type-caption text-muted">
            Contrast with cream text: {contrastRatio(c.hex, palette.cream).toFixed(1)}:1 · On-screen colour varies by display and
            brightness.
          </p>
        </div>
      ) : null}
    </Sheet>
  );
}
