import { memo } from 'react';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import type { GarmentCategory } from '@/types/domain';
import { hexToLab, shiftLightness } from '@/utils/color';

/**
 * Original flat-lay garment illustrations, drawn in the exact recommended colour.
 * These are ColorTheory's own artwork (no stock photos, no licensing questions) and are always
 * presented as "outfit references", never as photos of the user.
 */

interface GarmentProps {
  garment: GarmentCategory;
  color: string;
  width: number;
  /** Optional accessible label; illustrations inside cards are usually decorative. */
  accessibilityLabel?: string;
}

const VIEWBOX = '0 0 100 120';

function strokeFor(hex: string) {
  // Dark garments get a lighter keyline, light garments a darker one, so shapes read on paper.
  return hexToLab(hex).L < 28 ? shiftLightness(hex, 26) : shiftLightness(hex, -24);
}

function Shirt({ c, s, shade }: { c: string; s: string; shade: string }) {
  return (
    <G>
      <Path d="M30 12 L42 8 Q50 14 58 8 L70 12 L88 22 L96 72 L85 75 L78 38 L77 112 L23 112 L22 38 L15 75 L4 72 L12 22 Z" fill={c} stroke={s} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M77 40 L77 112 L64 112 Z" fill={shade} opacity={0.45} />
      <Path d="M42 8 L50 21 L58 8 L55 5 L50 13 L45 5 Z" fill={shiftLightness(c, 6)} stroke={s} strokeWidth={1} strokeLinejoin="round" />
      <Line x1={50} y1={21} x2={50} y2={112} stroke={s} strokeWidth={1} />
      {[32, 47, 62, 77, 92].map((y) => (
        <Circle key={y} cx={53} cy={y} r={1.3} fill={s} />
      ))}
      <Path d="M27 34 L38 34 L38 44 L27 44 Z" fill="none" stroke={s} strokeWidth={0.9} />
    </G>
  );
}

function Tee({ c, s, shade }: { c: string; s: string; shade: string }) {
  return (
    <G>
      <Path d="M33 10 Q50 22 67 10 L90 22 L82 44 L74 40 L74 112 L26 112 L26 40 L18 44 L10 22 Z" fill={c} stroke={s} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M74 42 L74 112 L62 112 Z" fill={shade} opacity={0.4} />
      <Path d="M36 11 Q50 21 64 11" fill="none" stroke={s} strokeWidth={1.4} />
    </G>
  );
}

function Knit({ c, s, shade }: { c: string; s: string; shade: string }) {
  const rib = shiftLightness(c, -6);
  return (
    <G>
      <Path d="M31 12 Q50 22 69 12 L88 22 L96 74 L84 77 L76 40 L76 104 L24 104 L24 40 L16 77 L4 74 L12 22 Z" fill={c} stroke={s} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M76 42 L76 104 L63 104 Z" fill={shade} opacity={0.45} />
      <Rect x={24} y={103} width={52} height={10} fill={rib} stroke={s} strokeWidth={1.1} />
      <Path d="M84 77 L96 74 L98 82 L86 85 Z M16 77 L4 74 L2 82 L14 85 Z" fill={rib} stroke={s} strokeWidth={1} strokeLinejoin="round" />
      <Path d="M33 12 Q50 24 67 12 Q50 18 33 12" fill={rib} stroke={s} strokeWidth={1.1} />
      {[30, 36, 42, 48, 54, 60, 66, 72].map((x) => (
        <Line key={x} x1={x} y1={104} x2={x} y2={112} stroke={s} strokeWidth={0.6} opacity={0.6} />
      ))}
    </G>
  );
}

function Jacket({ c, s, shade, long = false }: { c: string; s: string; shade: string; long?: boolean }) {
  const hem = long ? 118 : 104;
  return (
    <G>
      <Path
        d={`M30 10 L42 6 L50 30 L58 6 L70 10 L89 20 L97 ${long ? 80 : 74} L86 ${long ? 82 : 77} L78 38 L78 ${hem} L22 ${hem} L22 38 L14 ${long ? 82 : 77} L3 ${long ? 80 : 74} L11 20 Z`}
        fill={c}
        stroke={s}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <Path d={`M78 40 L78 ${hem} L64 ${hem} Z`} fill={shade} opacity={0.45} />
      <Path d="M42 6 L36 16 L44 22 L40 26 L50 52 Z" fill={shiftLightness(c, -5)} stroke={s} strokeWidth={1} strokeLinejoin="round" />
      <Path d="M58 6 L64 16 L56 22 L60 26 L50 52 Z" fill={shiftLightness(c, -5)} stroke={s} strokeWidth={1} strokeLinejoin="round" />
      <Line x1={50} y1={52} x2={50} y2={hem} stroke={s} strokeWidth={1} />
      <Circle cx={53} cy={62} r={1.6} fill={s} />
      <Circle cx={53} cy={76} r={1.6} fill={s} />
      <Line x1={28} y1={long ? 84 : 78} x2={42} y2={long ? 84 : 78} stroke={s} strokeWidth={1.1} />
      <Line x1={58} y1={long ? 84 : 78} x2={72} y2={long ? 84 : 78} stroke={s} strokeWidth={1.1} />
    </G>
  );
}

function Trousers({ c, s, shade, denim = false }: { c: string; s: string; shade: string; denim?: boolean }) {
  return (
    <G>
      <Path d="M27 6 L73 6 L78 116 L57 116 L50 42 L43 116 L22 116 Z" fill={c} stroke={s} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M57 116 L50 42 L53 116 Z" fill={shade} opacity={0.5} />
      <Rect x={27} y={6} width={46} height={7} fill={shiftLightness(c, -4)} stroke={s} strokeWidth={1} />
      {denim ? (
        <G>
          <Path d="M29 14 Q36 26 46 18" fill="none" stroke="#C99A2E" strokeWidth={0.9} />
          <Path d="M71 14 Q64 26 54 18" fill="none" stroke="#C99A2E" strokeWidth={0.9} />
          <Line x1={50} y1={13} x2={50} y2={34} stroke="#C99A2E" strokeWidth={0.8} />
        </G>
      ) : (
        <G>
          <Line x1={34} y1={14} x2={32} y2={114} stroke={s} strokeWidth={0.7} opacity={0.7} />
          <Line x1={66} y1={14} x2={68} y2={114} stroke={s} strokeWidth={0.7} opacity={0.7} />
        </G>
      )}
    </G>
  );
}

function Skirt({ c, s, shade }: { c: string; s: string; shade: string }) {
  return (
    <G>
      <Path d="M32 10 L68 10 L86 104 L14 104 Z" fill={c} stroke={s} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M68 12 L86 104 L70 104 Z" fill={shade} opacity={0.4} />
      <Rect x={32} y={8} width={36} height={7} fill={shiftLightness(c, -5)} stroke={s} strokeWidth={1} />
      {[38, 44, 50, 56, 62].map((x, i) => (
        <Line key={x} x1={x} y1={15} x2={x + (x - 50) * 0.9 + (i - 2) * 0.5} y2={104} stroke={s} strokeWidth={0.7} opacity={0.65} />
      ))}
    </G>
  );
}

function Dress({ c, s, shade }: { c: string; s: string; shade: string }) {
  return (
    <G>
      <Path d="M36 8 Q50 18 64 8 L74 12 L84 34 L74 38 L68 30 L64 44 L80 116 L20 116 L36 44 L32 30 L26 38 L16 34 L26 12 Z" fill={c} stroke={s} strokeWidth={1.2} strokeLinejoin="round" />
      <Path d="M64 46 L80 116 L66 116 Z" fill={shade} opacity={0.45} />
      <Path d="M36 44 Q50 48 64 44" fill="none" stroke={s} strokeWidth={1} />
      <Path d="M38 9 Q50 17 62 9" fill="none" stroke={s} strokeWidth={1.3} />
    </G>
  );
}

function Shoes({ c, s }: { c: string; s: string }) {
  return (
    <G>
      <Path d="M10 70 Q12 54 26 54 L36 56 Q46 60 48 76 Q48 84 40 84 L16 84 Q8 82 10 70 Z" fill={c} stroke={s} strokeWidth={1.2} />
      <Path d="M52 74 Q54 58 68 58 L78 60 Q88 64 90 80 Q90 88 82 88 L58 88 Q50 86 52 74 Z" fill={c} stroke={s} strokeWidth={1.2} />
      <Path d="M18 62 Q26 58 34 62" fill="none" stroke={s} strokeWidth={1} />
      <Path d="M60 66 Q68 62 76 66" fill="none" stroke={s} strokeWidth={1} />
    </G>
  );
}

function Accessory({ c, s }: { c: string; s: string }) {
  return (
    <G>
      <Path d="M34 40 Q34 22 50 22 Q66 22 66 40" fill="none" stroke={s} strokeWidth={2.4} />
      <Rect x={22} y={40} width={56} height={46} rx={6} fill={c} stroke={s} strokeWidth={1.2} />
      <Line x1={22} y1={54} x2={78} y2={54} stroke={s} strokeWidth={0.9} />
    </G>
  );
}

export const GarmentIllustration = memo(function GarmentIllustration({ garment, color, width, accessibilityLabel }: GarmentProps) {
  const s = strokeFor(color);
  const shade = shiftLightness(color, -14);
  const height = width * 1.2;

  let body;
  switch (garment) {
    case 'shirt':
      body = <Shirt c={color} s={s} shade={shade} />;
      break;
    case 'tee':
      body = <Tee c={color} s={s} shade={shade} />;
      break;
    case 'knit':
      body = <Knit c={color} s={s} shade={shade} />;
      break;
    case 'jacket':
      body = <Jacket c={color} s={s} shade={shade} />;
      break;
    case 'coat':
      body = <Jacket c={color} s={s} shade={shade} long />;
      break;
    case 'trousers':
      body = <Trousers c={color} s={s} shade={shade} />;
      break;
    case 'jeans':
      body = <Trousers c={color} s={s} shade={shade} denim />;
      break;
    case 'skirt':
      body = <Skirt c={color} s={s} shade={shade} />;
      break;
    case 'dress':
      body = <Dress c={color} s={s} shade={shade} />;
      break;
    case 'shoes':
      body = <Shoes c={color} s={s} />;
      break;
    default:
      body = <Accessory c={color} s={s} />;
  }

  return (
    <Svg
      width={width}
      height={height}
      viewBox={VIEWBOX}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      {body}
    </Svg>
  );
});
