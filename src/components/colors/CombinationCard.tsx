import { cx } from '../ui/cx';

interface CombinationCardProps {
  name: string;
  hexes: string[];
  note: string;
  tag?: string;
  className?: string;
}

/** Colour combination as overlapping blocks — proportions hint at how much of each to wear. */
export function CombinationCard({ name, hexes, note, tag, className }: CombinationCardProps) {
  const [a, b, c] = hexes;
  return (
    <article className={cx('editorial-frame flex flex-col bg-paper', className)} aria-label={`${name}. ${note}`}>
      <div aria-hidden className="flex h-32 gap-0">
        <span className="h-full flex-[3]" style={{ backgroundColor: a }} />
        <span className="flex flex-[2] flex-col">
          <span className="flex-[2]" style={{ backgroundColor: b }} />
          {c ? <span className="flex-1" style={{ backgroundColor: c }} /> : null}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 border-t-[1.5px] border-navy p-4">
        {tag ? <span className="type-eyebrow text-muted">{tag}</span> : null}
        <h3 className="type-h3 text-navy">{name}</h3>
        <p className="type-body-s line-clamp-3 text-muted">{note}</p>
      </div>
    </article>
  );
}
