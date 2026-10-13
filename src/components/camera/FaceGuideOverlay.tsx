import { FACE_GUIDE_OVAL } from '@/features/analysis/faceRegion';
import { palette } from '@/theme/colors';

/**
 * Darkened frame with an oval window for the face, drawn in the same normalised coordinates the
 * on-device sampler uses (faceRegion.ts), over a 4:5 frame that matches the captured crop — so
 * "fill the oval" really means "fill the sampled region".
 */
export function FaceGuideOverlay({ active = true }: { active?: boolean }) {
  const W = 100;
  const H = 125;
  const cx = W * FACE_GUIDE_OVAL.cx;
  const cy = H * FACE_GUIDE_OVAL.cy;
  const rx = W * FACE_GUIDE_OVAL.rx;
  const ry = H * FACE_GUIDE_OVAL.ry;
  // Outer rectangle + inner ellipse with even-odd fill = scrim with an oval hole.
  const scrim = `M0 0 H${W} V${H} H0 Z M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;

  return (
    <svg aria-hidden viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full animate-fade-in">
      <path d={scrim} fill="rgb(13 22 38 / 0.58)" fillRule="evenodd" />
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        stroke={palette.cream}
        strokeDasharray="10 8"
        fill="none"
        vectorEffect="non-scaling-stroke"
        className={active ? 'animate-pulse-soft' : 'opacity-50'}
        style={{ strokeWidth: 2.5 }}
      />
      <ellipse cx={cx} cy={cy} rx={rx + 2.5} ry={ry + 2.5} stroke={palette.coral} fill="none" opacity={0.7} vectorEffect="non-scaling-stroke" style={{ strokeWidth: 1.2 }} />
    </svg>
  );
}
