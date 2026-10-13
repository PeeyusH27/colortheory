import { Ban, Glasses, Lightbulb, Palette, Sun, Wallpaper } from 'lucide-react';

import { cx } from '../ui/cx';

export const CAMERA_TIPS = [
  { icon: Sun, text: 'Use natural, even lighting.' },
  { icon: Lightbulb, text: 'Face a window or another soft light source.' },
  { icon: Ban, text: 'Avoid beauty filters and heavy edits.' },
  { icon: Glasses, text: 'Keep your face unobstructed — no sunglasses or hats.' },
  { icon: Palette, text: 'Avoid strong coloured lighting (LED strips, neon).' },
  { icon: Wallpaper, text: 'Prefer a plain, neutral background.' },
] as const;

/** Photo tips for an accurate reading. */
export function CameraTips({ className }: { className?: string }) {
  return (
    <section aria-labelledby="tips-title" className={cx('flex flex-col gap-4', className)}>
      <h2 id="tips-title" className="type-eyebrow text-muted">
        For an accurate reading
      </h2>
      <ul className="flex flex-col gap-3">
        {CAMERA_TIPS.map(({ icon: Icon, text }) => (
          <li key={text} className="type-body-m flex items-start gap-3 text-navy">
            <Icon aria-hidden size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-denim" />
            {text}
          </li>
        ))}
      </ul>
      <p className="type-caption text-muted">
        Lighting and camera processing change how colour is recorded. If your photo is too dark, bright, blurred or tinted, we’ll tell you
        instead of guessing.
      </p>
    </section>
  );
}
