interface CharacteristicScaleProps {
  label: string;
  /** 0 … 1 position on the track. */
  value: number;
  estimate: string;
  left: string;
  right: string;
  gradient: string[];
}

/** A labelled gradient track with a marker — shows an *estimate*, not a measurement. */
export function CharacteristicScale({ label, value, estimate, left, right, gradient }: CharacteristicScaleProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div role="group" aria-label={`${label}: estimated ${estimate}, on a scale from ${left} to ${right}`} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="type-eyebrow text-muted">{label}</span>
        <span className="type-label text-navy capitalize">{estimate}</span>
      </div>
      <div aria-hidden className="relative h-3">
        <div className="h-full rounded-full border border-navy/20" style={{ background: `linear-gradient(90deg, ${gradient.join(', ')})` }} />
        <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border-[2.5px] border-navy bg-cream" style={{ left: `${pct}%` }} />
      </div>
      <div aria-hidden className="type-caption flex justify-between text-muted">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}
