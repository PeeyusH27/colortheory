import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';

import type { ImageQualityReport } from '@/types/domain';

import { cx } from '../ui/cx';

const SEVERITY = {
  info: { icon: Info, label: 'Note', className: 'text-denim' },
  warning: { icon: TriangleAlert, label: 'Warning', className: 'text-warning' },
  blocking: { icon: CircleAlert, label: 'Problem', className: 'text-error' },
} as const;

/**
 * Plain-language photo quality feedback, measured in the browser before anything is uploaded.
 * We say when a photo isn't good enough instead of producing confident-looking results from it.
 */
export function ImageQualityNotice({ report, loading, className }: { report: ImageQualityReport | null; loading?: boolean; className?: string }) {
  if (loading || !report) {
    return (
      <div role="status" className={cx('rounded-md border-[1.5px] border-line-warm bg-paper p-4', className)}>
        <p className="type-label animate-pulse-soft text-navy">Checking photo quality in your browser…</p>
      </div>
    );
  }

  const score = Math.round(report.score * 100);
  const segments = 10;
  const filled = Math.round(report.score * segments);
  const meter = report.score >= 0.75 ? 'bg-sage' : report.score >= 0.45 ? 'bg-saffron' : 'bg-coral';

  return (
    <section aria-labelledby="quality-title" className={cx('flex flex-col gap-3 rounded-md border-[1.5px] border-navy bg-paper p-4', className)}>
      <div className="flex items-baseline justify-between">
        <h3 id="quality-title" className="type-eyebrow text-muted">
          Photo quality
        </h3>
        <p className="type-numeric text-navy">
          {score}
          <span className="text-muted">/100</span>
        </p>
      </div>
      <div
        role="meter"
        aria-label="Photo quality"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        className="flex gap-1">
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={cx('h-2 flex-1 rounded-xs', i < filled ? meter : 'bg-linen')} />
        ))}
      </div>
      <ul className="flex flex-col gap-2" aria-live="polite">
        {report.issues.length === 0 ? (
          <li className="type-body-s flex items-start gap-2 text-navy">
            <CircleCheck aria-hidden size={18} className="shrink-0 text-success" />
            Even light, clear face area, no strong colour cast. Good to go.
          </li>
        ) : (
          report.issues.map((issue) => {
            const s = SEVERITY[issue.severity];
            const Icon = s.icon;
            return (
              <li key={issue.code} className="type-body-s flex items-start gap-2 text-navy">
                <Icon aria-hidden size={18} className={cx('shrink-0', s.className)} />
                <span>
                  <span className="sr-only">{s.label}: </span>
                  {issue.message}
                </span>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
