import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cx } from './cx';

type Tone = 'info' | 'warning' | 'error' | 'success' | 'demo';

const TONES: Record<Tone, { box: string; icon: LucideIcon }> = {
  info: { box: 'bg-mist text-navy border-denim/25', icon: Info },
  warning: { box: 'bg-warning-soft text-[#5c3700] border-warning/30', icon: TriangleAlert },
  error: { box: 'bg-error-soft text-[#7a1810] border-error/30', icon: CircleAlert },
  success: { box: 'bg-success-soft text-[#124a2e] border-success/30', icon: CircleCheck },
  demo: { box: 'bg-saffron/25 text-ink border-saffron', icon: Info },
};

interface InlineAlertProps {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** `alert` interrupts screen readers; use only for new errors the user must notice now. */
  role?: 'alert' | 'status' | 'note';
}

export function InlineAlert({ tone = 'info', title, children, action, className, role = 'note' }: InlineAlertProps) {
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <div role={role} className={cx('flex gap-3 rounded-md border px-4 py-3', t.box, className)}>
      <Icon aria-hidden size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? <p className="type-label">{title}</p> : null}
        {children ? <div className="type-body-s">{children}</div> : null}
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
    </div>
  );
}
