import { Cloud, FlaskConical, Layers, MonitorSmartphone, Sparkles, type LucideIcon } from 'lucide-react';

import { cx } from './cx';

type BadgeTone = 'neutral' | 'demo' | 'info' | 'success' | 'warning' | 'error' | 'inverse' | 'accent';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-sand text-navy border-line-warm',
  demo: 'bg-saffron text-ink border-saffron',
  info: 'bg-mist text-denim border-mist',
  success: 'bg-success-soft text-success border-success-soft',
  warning: 'bg-warning-soft text-warning border-warning-soft',
  error: 'bg-error-soft text-error border-error-soft',
  inverse: 'bg-cream/12 text-cream border-cream/30',
  accent: 'bg-coral text-ink border-coral',
};

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: LucideIcon;
  className?: string;
  title?: string;
}

export function Badge({ label, tone = 'neutral', icon: Icon, className, title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cx(
        'inline-flex max-w-full items-center gap-1 self-start rounded-full border px-2 py-[5px] font-sans text-[0.625rem] font-bold uppercase leading-3 tracking-[0.12em] whitespace-nowrap',
        TONES[tone],
        className,
      )}>
      {Icon ? <Icon aria-hidden size={12} strokeWidth={2.4} /> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

export type Provenance = 'demo' | 'device' | 'remote' | 'drape' | 'ai';

const PROVENANCE: Record<Provenance, { label: string; tone: BadgeTone; icon: LucideIcon; description: string }> = {
  demo: {
    label: 'Demo · sample data',
    tone: 'demo',
    icon: FlaskConical,
    description: 'Demo content. These are sample results, not based on your photo.',
  },
  device: {
    label: 'On-device estimate',
    tone: 'info',
    icon: MonitorSmartphone,
    description: 'Estimated in your browser from your photo. Not an AI diagnosis.',
  },
  remote: {
    label: 'Cloud analysis',
    tone: 'info',
    icon: Cloud,
    description: 'Analysed by the ColorTheory cloud service with an AI vision model.',
  },
  drape: {
    label: 'Colour drape · not AI',
    tone: 'neutral',
    icon: Layers,
    description: 'Colour drape preview: your photo with a colour panel. This is not an AI-generated try-on.',
  },
  ai: {
    label: 'AI preview · approximation',
    tone: 'accent',
    icon: Sparkles,
    description: 'AI-generated preview. It is an approximation and may not perfectly preserve your appearance.',
  },
};

/**
 * Labels where a result came from. Every analysis result and outfit preview shows one so demo or
 * approximate content is never mistaken for a real AI result. The full explanation is exposed to
 * assistive technology and as a tooltip.
 */
export function ProvenanceBadge({ kind, inverse, className }: { kind: Provenance; inverse?: boolean; className?: string }) {
  const p = PROVENANCE[kind];
  return (
    <span className={cx('inline-flex', className)} title={p.description}>
      <Badge label={p.label} tone={inverse && p.tone !== 'demo' && p.tone !== 'accent' ? 'inverse' : p.tone} icon={p.icon} />
      <span className="sr-only">{p.description}</span>
    </span>
  );
}
