import { Check } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { cx } from './cx';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** Native checkbox (keyboard + screen-reader semantics for free) with brand styling. */
export function Checkbox({ checked, onChange, label, description, disabled, className }: CheckboxProps) {
  const id = useId();
  return (
    <div className={cx('flex items-start gap-3', disabled && 'opacity-50', className)}>
      <span className="relative mt-0.5 flex size-6 shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-describedby={description ? `${id}-desc` : undefined}
          onChange={(e) => onChange(e.target.checked)}
          className="peer size-6 cursor-pointer appearance-none rounded-sm border-2 border-navy bg-paper transition-colors checked:bg-navy disabled:cursor-not-allowed"
        />
        <Check
          aria-hidden
          size={16}
          strokeWidth={3}
          className="pointer-events-none absolute top-1 left-1 text-cream opacity-0 transition-opacity peer-checked:opacity-100"
        />
      </span>
      <span className="flex flex-col gap-1">
        <label htmlFor={id} className="type-label cursor-pointer text-navy">
          {label}
        </label>
        {description ? (
          <span id={`${id}-desc`} className="type-body-s text-muted">
            {description}
          </span>
        ) : null}
      </span>
    </div>
  );
}
