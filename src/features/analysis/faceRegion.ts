/**
 * Geometry shared by the camera face guide and the on-device sampler, so the region the user is
 * asked to fill is the region we sample. Values are fractions of the captured image.
 *
 * The camera preview is a "cover" crop of the photo, so the on-screen oval is drawn slightly wider
 * than this sampling ellipse; skin-colour filtering inside the ellipse removes background pixels.
 */
export const FACE_SAMPLE_ELLIPSE = { cx: 0.5, cy: 0.42, rx: 0.2, ry: 0.22 } as const;

/** Face guide drawn over the camera preview, as fractions of the preview size. */
export const FACE_GUIDE_OVAL = { cx: 0.5, cy: 0.42, rx: 0.31, ry: 0.23 } as const;

export function insideEllipse(x: number, y: number, e: { cx: number; cy: number; rx: number; ry: number }) {
  const dx = (x - e.cx) / e.rx;
  const dy = (y - e.cy) / e.ry;
  return dx * dx + dy * dy <= 1;
}
