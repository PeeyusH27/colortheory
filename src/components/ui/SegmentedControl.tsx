'use client';

import { useId, useRef, type KeyboardEvent } from 'react';

import { cx } from './cx';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  tone?: 'ink' | 'cream';
  className?: string;
}

/**
 * Radio group rendered as segments. Arrow keys move the selection (WAI-ARIA radio pattern); only
 * the selected segment is in the tab order.
 */
export function SegmentedControl<T extends string>({ label, options, value, onChange, tone = 'ink', className }: SegmentedControlProps<T>) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + options.length) % options.length;
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={`${id}-label`}
      className={cx('inline-flex rounded-full p-1', tone === 'ink' ? 'bg-sand' : 'bg-cream/12', className)}>
      <span id={`${id}-label`} className="sr-only">
        {label}
      </span>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cx(
              'min-h-9 flex-1 rounded-full px-4 font-sans text-[0.8125rem] font-bold whitespace-nowrap transition-colors duration-150',
              tone === 'ink'
                ? selected
                  ? 'bg-navy text-cream'
                  : 'text-navy hover:bg-navy/6'
                : selected
                  ? 'bg-cream text-ink'
                  : 'text-cream hover:bg-cream/10',
            )}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
