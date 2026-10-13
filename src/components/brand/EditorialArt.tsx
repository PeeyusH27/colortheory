import { StyleSheet, View } from 'react-native';

import { DrapePreview } from '@/components/outfits/DrapePreview';
import { OutfitFlatLay } from '@/components/outfits/OutfitFlatLay';
import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { readableOn } from '@/utils/color';

import { Blob } from './Blob';

/**
 * Static editorial compositions for onboarding, welcome and empty heroes. Everything is drawn from
 * brand tokens and original SVG — no stock photography.
 */

const FAN = [
  { name: 'Navy', hex: palette.navy, rotate: -16, x: 0.02, y: 0.16 },
  { name: 'Denim', hex: palette.denim, rotate: -7, x: 0.18, y: 0.08 },
  { name: 'Petrol', hex: palette.petrol, rotate: 2, x: 0.36, y: 0.04 },
  { name: 'Sky', hex: palette.sky, rotate: 10, x: 0.53, y: 0.08 },
  { name: 'Coral', hex: palette.coral, rotate: 19, x: 0.68, y: 0.17 },
];

/** Page 1: a fanned deck of paint-chip cards over a colour blob. */
export function SwatchFan({ width, height }: { width: number; height: number }) {
  const cardW = width * 0.3;
  const cardH = cardW * 1.55;
  return (
    <View style={{ width, height }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.abs, { left: width * 0.12, top: height * 0.02 }]}>
        <Blob seed={5} color={palette.mist} size={width * 0.8} />
      </View>
      <View style={[styles.abs, { left: width * 0.62, top: height * 0.58 }]}>
        <Blob seed={9} color={palette.saffron} size={width * 0.28} />
      </View>
      {FAN.map((c) => (
        <View
          key={c.hex}
          style={[
            styles.abs,
            styles.chipCard,
            shadows.raised,
            { width: cardW, height: cardH, left: width * c.x, top: height * c.y + cardH * 0.12, transform: [{ rotate: `${c.rotate}deg` }] },
          ]}>
          <View style={[styles.chipColor, { backgroundColor: c.hex }]} />
          <View style={styles.chipLabel}>
            <Text variant="caption" numberOfLines={1} style={styles.chipName}>
              {c.name}
            </Text>
            <Text variant="hex" tone="secondary" style={styles.chipHex}>
              {c.hex}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const PANELS = [
  { name: 'Navy', hex: palette.navy, bg: palette.sand },
  { name: 'Denim', hex: palette.denim, bg: palette.mist },
  { name: 'Petrol', hex: palette.petrol, bg: palette.linen },
  { name: 'Coral', hex: palette.coral, bg: palette.sand },
];

/** Page 2: the reference layout's "same person, different colours" panels, as silhouettes. */
export function DrapePanels({ width, height }: { width: number; height: number }) {
  const gap = spacing[2];
  const panelW = (width - gap * (PANELS.length - 1)) / PANELS.length;
  const panelH = Math.min(height * 0.82, panelW * 2.1);
  return (
    <View style={[styles.panels, { width, height, gap }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {PANELS.map((p, i) => (
        <View key={p.hex} style={{ marginTop: i % 2 === 0 ? 0 : spacing[8] }}>
          <DrapePreview hex={p.hex} colorName={p.name} width={panelW} height={panelH} background={p.bg} showLabel={false} style={styles.panelFrame} />
          <View style={[styles.panelTag, { backgroundColor: p.hex }]}>
            <Text variant="eyebrow" color={readableOn(p.hex)} style={styles.panelTagText} numberOfLines={1}>
              {p.name}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Page 3: a saved palette card with an outfit flat-lay tucked behind it. */
export function PaletteStack({ width, height }: { width: number; height: number }) {
  const cardW = width * 0.56;
  const flat = width * 0.5;
  const colors = [palette.navy, palette.denim, palette.petrol, palette.sky, palette.camel];
  return (
    <View style={{ width, height }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.abs, { right: 0, top: height * 0.04, transform: [{ rotate: '6deg' }] }, shadows.offsetCoral]}>
        <OutfitFlatLay
          size={flat}
          pieces={[
            { garment: 'shirt', role: 'main', label: 'Shirt', colorName: 'Navy Blue', hex: palette.navy },
            { garment: 'trousers', role: 'secondary', label: 'Trousers', colorName: 'Beige', hex: '#D9C3A0' },
            { garment: 'shoes', role: 'shoes', label: 'Loafers', colorName: 'Cognac', hex: '#8A4B2A' },
          ]}
          background={palette.paper}
        />
      </View>
      <View style={[styles.abs, styles.paletteCard, shadows.offsetInk, { width: cardW, left: 0, top: height * 0.2, transform: [{ rotate: '-4deg' }] }]}>
        <View style={{ height: cardW * 0.62, backgroundColor: palette.navy }} />
        <View style={styles.paletteRow}>
          {colors.map((c) => (
            <View key={c} style={[styles.paletteBand, { backgroundColor: c }]} />
          ))}
        </View>
        <View style={styles.paletteMeta}>
          <Text variant="h3">My Blues</Text>
          <Text variant="caption" tone="secondary">
            5 colours · saved
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  chipCard: { backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.navy },
  chipColor: { flex: 1, margin: 6, marginBottom: 0 },
  chipLabel: { padding: 8, gap: 2 },
  chipName: { fontSize: 11 },
  chipHex: { fontSize: 10, lineHeight: 12 },
  panels: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  panelFrame: { borderWidth: 1.5, borderColor: palette.navy },
  panelTag: { paddingVertical: 4, paddingHorizontal: 6, borderWidth: 1.5, borderTopWidth: 0, borderColor: palette.navy },
  panelTagText: { fontSize: 9, letterSpacing: 1.4 },
  paletteCard: { backgroundColor: palette.paper, borderWidth: 1.5, borderColor: palette.navy },
  paletteRow: { flexDirection: 'row', height: 26, borderTopWidth: 1, borderColor: palette.navy },
  paletteBand: { flex: 1 },
  paletteMeta: { padding: spacing[3], gap: 2, borderTopWidth: 1.5, borderColor: palette.navy },
});
