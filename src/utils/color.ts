/**
 * Colour math used by the palette engine, outfit matching and UI (readable text on swatches).
 * Pure functions, no React Native imports — covered by unit tests.
 */

export interface RGB {
  r: number; // 0–255
  g: number;
  b: number;
}

export interface Lab {
  L: number; // 0–100
  a: number;
  b: number;
}

export interface LCh {
  L: number;
  C: number;
  h: number; // degrees 0–360
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
  return HEX_RE.test(value.trim());
}

/** Normalises `abc`, `#abc`, `#AABBCC` → `#AABBCC`. Throws on invalid input. */
export function normalizeHex(value: string): string {
  const match = HEX_RE.exec(value.trim());
  if (!match?.[1]) throw new Error(`Invalid hex colour: ${value}`);
  let hex = match[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  return `#${hex.toUpperCase()}`;
}

export function hexToRgb(hex: string): RGB {
  const n = normalizeHex(hex);
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

function srgbToLinear(c: number) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(v: number) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return clamp(c * 255, 0, 255);
}

// D65 reference white.
const XN = 0.95047;
const YN = 1.0;
const ZN = 1.08883;

export function rgbToLab({ r, g, b }: RGB): Lab {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / XN;
  const Y = (R * 0.2126729 + G * 0.7151522 + B * 0.072175) / YN;
  const Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / ZN;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function labToRgb({ L, a, b }: Lab): RGB {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const inv = (t: number) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
  const X = inv(fx) * XN;
  const Y = inv(fy) * YN;
  const Z = inv(fz) * ZN;
  const R = X * 3.2404542 + Y * -1.5371385 + Z * -0.4985314;
  const G = X * -0.969266 + Y * 1.8760108 + Z * 0.041556;
  const B = X * 0.0556434 + Y * -0.2040259 + Z * 1.0572252;
  return { r: linearToSrgb(R), g: linearToSrgb(G), b: linearToSrgb(B) };
}

export const hexToLab = (hex: string) => rgbToLab(hexToRgb(hex));
export const labToHex = (lab: Lab) => rgbToHex(labToRgb(lab));

export function labToLch({ L, a, b }: Lab): LCh {
  const C = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

export function lchToLab({ L, C, h }: LCh): Lab {
  const rad = (h * Math.PI) / 180;
  return { L, a: C * Math.cos(rad), b: C * Math.sin(rad) };
}

/** CIEDE2000 colour difference. ~1 is a just-noticeable difference; <10 reads as "the same family". */
export function deltaE2000(lab1: Lab, lab2: Lab): number {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;
  const rad = Math.PI / 180;
  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const hp = (a: number, b: number) => {
    if (a === 0 && b === 0) return 0;
    const h = Math.atan2(b, a) / rad;
    return h >= 0 ? h : h + 360;
  };
  const h1p = hp(a1p, b1);
  const h2p = hp(a2p, b2);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hbarp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
    else hbarp = (h1p + h2p) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hbarp - 30) * rad) +
    0.24 * Math.cos(2 * hbarp * rad) +
    0.32 * Math.cos((3 * hbarp + 6) * rad) -
    0.2 * Math.cos((4 * hbarp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbarp ** 7 / (Cbarp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt(
    (dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh),
  );
}

export function deltaEHex(hex1: string, hex2: string) {
  return deltaE2000(hexToLab(hex1), hexToLab(hex2));
}

export function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG 2.x contrast ratio between two colours (1–21). */
export function contrastRatio(hex1: string, hex2: string) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Picks whichever of `dark`/`light` reads better on `background`. */
export function readableOn(background: string, dark = '#172A46', light = '#F7F3EC') {
  return contrastRatio(background, dark) >= contrastRatio(background, light) ? dark : light;
}

/** Perceptual tint/shade: moves Lab lightness, keeps hue, softens chroma near the extremes. */
export function shiftLightness(hex: string, deltaL: number) {
  const lch = labToLch(hexToLab(hex));
  const L = clamp(lch.L + deltaL, 2, 98);
  const extremity = Math.abs(L - 50) / 50;
  const C = lch.C * (1 - 0.35 * extremity * Math.sign(Math.abs(deltaL)));
  return labToHex(lchToLab({ L, C, h: lch.h }));
}

export function lightVariant(hex: string) {
  return shiftLightness(hex, 22);
}

export function darkVariant(hex: string) {
  return shiftLightness(hex, -18);
}

/** Linear blend in Lab space (perceptually smoother than RGB). */
export function mixHex(hex1: string, hex2: string, t: number) {
  const a = hexToLab(hex1);
  const b = hexToLab(hex2);
  return labToHex({ L: a.L + (b.L - a.L) * t, a: a.a + (b.a - a.a) * t, b: a.b + (b.b - a.b) * t });
}

export function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

/**
 * Individual Typology Angle (ITA°), a dermatology metric derived from L* and b*.
 * Used only as a coarse *visible lightness* descriptor of the sampled region — it is not a
 * diagnosis and it is sensitive to lighting and camera processing.
 */
export function individualTypologyAngle({ L, b }: Lab) {
  return (Math.atan2(L - 50, b) * 180) / Math.PI;
}
