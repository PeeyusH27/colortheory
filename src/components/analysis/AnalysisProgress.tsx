/* eslint-disable @next/next/no-img-element -- the working portrait is an in-memory blob: URL */
import { Check } from 'lucide-react';

import { STAGE_COPY } from '@/features/analysis/analysisStore';
import type { AnalysisStage } from '@/services/color-analysis';
import { palette } from '@/theme/colors';
import { donutSegmentPath } from '@/utils/blob';

import { cx } from '../ui/cx';

const RINGS = [
  { r: 1, inner: 0.84, colors: [palette.navy, palette.denim, palette.petrol, palette.teal, palette.steel, palette.sky, palette.indigo, palette.mist], spin: 'animate-[spin_16s_linear_infinite]' },
  { r: 0.8, inner: 0.66, colors: [palette.coral, palette.saffron, palette.camel, palette.blush, palette.violet, palette.lilac], spin: 'animate-[spin_11s_linear_infinite_reverse]' },
  { r: 0.62, inner: 0.52, colors: [palette.sage, palette.sky, palette.coral, palette.denim], spin: 'animate-[spin_8s_linear_infinite]' },
];

const MARQUEE = [palette.navy, palette.coral, palette.sky, palette.petrol, palette.saffron, palette.denim, palette.blush, palette.teal, palette.violet, palette.camel];

interface AnalysisProgressProps {
  portraitUri: string | null;
  stages: AnalysisStage[];
  completed: AnalysisStage[];
  current: AnalysisStage | null;
  uploadProgress?: number;
  demo?: boolean;
}

/**
 * Progress for one analysis run: spinning colour wheels around the portrait (decorative) and the
 * list of stages that will really run, each marked waiting / in progress / done.
 */
export function AnalysisProgress({ portraitUri, stages, completed, current, uploadProgress = 0, demo = false }: AnalysisProgressProps) {
  const done = completed.length;
  return (
    <div className="flex flex-col items-center gap-8">
      <div
        role="progressbar"
        aria-label="Analysis progress"
        aria-valuemin={0}
        aria-valuemax={stages.length}
        aria-valuenow={done}
        aria-valuetext={`Step ${Math.min(done + 1, stages.length)} of ${stages.length}`}
        className="relative size-56">
        {RINGS.map((ring) => {
          const step = 360 / ring.colors.length;
          return (
            <svg key={ring.spin} aria-hidden viewBox="0 0 100 100" className={cx('absolute inset-0 size-full', ring.spin)}>
              {ring.colors.map((color, i) => (
                <path key={`${color}-${i}`} d={donutSegmentPath(50, 50, 50 * ring.r, 50 * ring.inner, i * step + 1.5, (i + 1) * step - 1.5)} fill={color} />
              ))}
            </svg>
          );
        })}
        <div className="absolute inset-[26%] overflow-hidden rounded-full border-2 border-cream/80 bg-navy">
          {portraitUri ? <img src={portraitUri} alt="" className="size-full object-cover" /> : null}
        </div>
      </div>

      <div aria-hidden className="w-full max-w-xs overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_15%,#000_85%,transparent)]">
        <div className="flex w-max animate-marquee gap-2">
          {[...MARQUEE, ...MARQUEE].map((c, i) => (
            <span key={i} className="size-6 shrink-0 rounded-xs" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      <ol className="flex w-full max-w-sm flex-col gap-4">
        {stages.map((stage) => {
          const isDone = completed.includes(stage);
          const isCurrent = current === stage && !isDone;
          const copy = STAGE_COPY[stage];
          return (
            <li key={stage} className={cx('flex gap-3 transition-opacity duration-300', !isDone && !isCurrent && 'opacity-45')} aria-current={isCurrent ? 'step' : undefined}>
              <span
                aria-hidden
                className={cx(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                  isDone ? 'border-sage bg-sage text-ink' : isCurrent ? 'animate-pulse-soft border-coral' : 'border-cream/60',
                )}>
                {isDone ? <Check size={12} strokeWidth={3} /> : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="type-label text-cream">
                  {demo ? `Demo · ${copy.title}` : copy.title}
                  <span className="sr-only">{isDone ? ' — done' : isCurrent ? ' — in progress' : ' — waiting'}</span>
                </span>
                {isCurrent ? (
                  <span className="type-caption text-cream/70">{demo ? 'Simulated step — sample results, your photo is not analysed.' : copy.detail}</span>
                ) : null}
                {isCurrent && stage === 'uploading' ? (
                  <span
                    role="progressbar"
                    aria-label="Upload progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(uploadProgress * 100)}
                    className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream/15">
                    <span className="block h-full bg-coral transition-[width] duration-200" style={{ width: `${Math.round(uploadProgress * 100)}%` }} />
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
