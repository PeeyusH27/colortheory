'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useId, useState, type ComponentProps, type ReactNode } from 'react';

import { cx } from './cx';

interface FormFieldProps extends Omit<ComponentProps<'input'>, 'className'> {
  label: string;
  error?: string;
  hint?: ReactNode;
  /** Adds a show/hide toggle for password inputs. */
  revealable?: boolean;
  className?: string;
}

/**
 * Labelled text input. Errors are linked with `aria-describedby` and announced when they appear;
 * `ref` is forwarded (React 19 passes it as a prop) so react-hook-form's `register` works as-is.
 */
export function FormField({ label, error, hint, revealable, type = 'text', className, id: idProp, ...input }: FormFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [revealed, setRevealed] = useState(false);
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="type-label text-navy">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={revealable && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cx(
            'type-body-l min-h-12 w-full rounded-md border-[1.5px] bg-paper px-4 py-2.5 text-navy placeholder:text-slate',
            'transition-[border-color,box-shadow] duration-150 outline-none focus:border-denim focus:shadow-[0_0_0_3px_rgb(46_91_137_/_0.18)]',
            error ? 'border-error' : 'border-line',
            revealable && 'pr-12',
          )}
          {...input}
        />
        {revealable ? (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            className="absolute top-1/2 right-1.5 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-sand">
            {revealed ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
          </button>
        ) : null}
      </div>
      {hint && !error ? (
        <div id={`${id}-hint`} className="type-caption text-muted">
          {hint}
        </div>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="type-caption text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
