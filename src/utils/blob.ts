/**
 * Procedural organic shapes ("paint blobs") for the splash and editorial art.
 * Deterministic for a given seed so shapes are stable across renders and platforms.
 */

/** Small, fast seeded PRNG (mulberry32). Returns floats in [0, 1). */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface BlobOptions {
  /** Number of control points around the circle. 6–9 looks organic; more looks wobbly. */
  points?: number;
  /** 0 = perfect circle, 0.4 = very irregular. */
  variance?: number;
  /** Size of the square viewBox the path is drawn in. */
  size?: number;
}

/**
 * Builds a closed, smooth SVG path by placing jittered points around a circle and joining them
 * with a Catmull-Rom spline converted to cubic Béziers.
 */
export function blobPath(seed: number, { points = 7, variance = 0.22, size = 100 }: BlobOptions = {}) {
  const rand = seededRandom(seed);
  const c = size / 2;
  const base = size * 0.42;
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2 + (rand() - 0.5) * 0.35;
    const r = base * (1 - variance + rand() * variance * 2);
    pts.push([c + Math.cos(angle) * r, c + Math.sin(angle) * r]);
  }

  const at = (i: number) => pts[(i + points) % points] as [number, number];
  const f = (n: number) => n.toFixed(2);
  let d = `M${f(at(0)[0])},${f(at(0)[1])}`;
  for (let i = 0; i < points; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${f(cp1x)},${f(cp1y)} ${f(cp2x)},${f(cp2y)} ${f(p2[0])},${f(p2[1])}`;
  }
  return `${d} Z`;
}

/** SVG path for one segment of a donut (used by the colour-wheel logo and progress rings). */
export function donutSegmentPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
) {
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const p = (r: number, deg: number) => `${(cx + r * Math.cos(rad(deg))).toFixed(2)},${(cy + r * Math.sin(rad(deg))).toFixed(2)}`;
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M${p(outerR, startDeg)}`,
    `A${outerR},${outerR} 0 ${large} 1 ${p(outerR, endDeg)}`,
    `L${p(innerR, endDeg)}`,
    `A${innerR},${innerR} 0 ${large} 0 ${p(innerR, startDeg)}`,
    'Z',
  ].join(' ');
}
