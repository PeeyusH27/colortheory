import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GrainOverlay } from '@/components/ui/GrainOverlay';
import { palette } from '@/theme/colors';
import type { OutfitPiece } from '@/types/outfits';

import { GarmentIllustration } from './GarmentIllustration';

const TOPS = new Set(['shirt', 'tee', 'knit', 'jacket', 'coat']);
const BOTTOMS = new Set(['trousers', 'jeans', 'skirt']);

interface Placement {
  left: number;
  top: number;
  width: number;
  rotate: number;
  z: number;
}

/**
 * Lays an outfit out like a magazine flat-lay: tops upper-left, bottoms lower-right, layers
 * peeking from behind, shoes in the corner — each piece tilted slightly.
 */
function placementsFor(pieces: OutfitPiece[], size: number): Placement[] {
  const tops = pieces.filter((p) => TOPS.has(p.garment));
  const mainTop = tops.find((p) => p.role === 'main') ?? tops.find((p) => p.role !== 'layer') ?? tops[0];
  return pieces.map((piece) => {
    if (piece.garment === 'dress') return { left: 0.18, top: 0.04, width: 0.56, rotate: -3, z: 2 };
    if (piece.garment === 'shoes') return { left: 0.62, top: 0.72, width: 0.32, rotate: -8, z: 4 };
    if (piece.garment === 'accessory') return { left: 0.04, top: 0.7, width: 0.28, rotate: 6, z: 4 };
    if (BOTTOMS.has(piece.garment)) return { left: 0.46, top: 0.26, width: 0.46, rotate: 4, z: 1 };
    if (TOPS.has(piece.garment)) {
      if (piece === mainTop) return { left: 0.02, top: 0.04, width: 0.58, rotate: -5, z: 3 };
      return { left: 0.26, top: 0.0, width: 0.46, rotate: 6, z: 0 }; // layer peeking out behind
    }
    return { left: 0.3, top: 0.3, width: 0.4, rotate: 0, z: 1 };
  }).map((p) => ({ ...p, left: p.left * size, top: p.top * size, width: p.width * size }));
}

interface OutfitFlatLayProps {
  pieces: OutfitPiece[];
  size: number;
  background?: string;
  grain?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const OutfitFlatLay = memo(function OutfitFlatLay({ pieces, size, background = palette.paper, grain = true, style }: OutfitFlatLayProps) {
  const placements = placementsFor(pieces, size);
  const ordered = pieces.map((piece, i) => ({ piece, place: placements[i] as Placement })).sort((a, b) => a.place.z - b.place.z);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Outfit illustration: ${pieces.map((p) => `${p.colorName} ${p.label}`).join(', ')}`}
      style={[{ width: size, height: size * 1.12, backgroundColor: background }, styles.base, style]}>
      {ordered.map(({ piece, place }) => (
        <View
          key={`${piece.garment}-${piece.role}`}
          style={[styles.piece, { left: place.left, top: place.top, transform: [{ rotate: `${place.rotate}deg` }] }]}>
          <GarmentIllustration garment={piece.garment} color={piece.hex} width={place.width} />
        </View>
      ))}
      {grain ? <GrainOverlay opacity={0.25} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  piece: { position: 'absolute' },
});
