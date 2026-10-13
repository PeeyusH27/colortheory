'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

import { cx } from './cx';

interface Tab<T extends string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  label: string;
  tabs: readonly Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  children: ReactNode;
  className?: string;
}

/** WAI-ARIA tabs (arrow keys move between tabs; the panel is labelled by the active tab). */
export function Tabs<T extends string>({ label, tabs, value, onChange, children, className }: TabsProps<T>) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    let next = -1;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    event.preventDefault();
    const tab = tabs[next];
    if (!tab) return;
    onChange(tab.value);
    refs.current[next]?.focus();
  };

  return (
    <div className={cx('flex flex-col gap-6', className)}>
      <div role="tablist" aria-label={label} className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto border-b-[1.5px] border-navy px-1">
        {tabs.map((tab, index) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              ref={(el) => {
                refs.current[index] = el;
              }}
              id={`${id}-tab-${tab.value}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cx(
                'relative min-h-11 shrink-0 px-4 font-sans text-[0.9375rem] font-bold whitespace-nowrap transition-colors',
                selected ? 'text-navy after:absolute after:inset-x-2 after:-bottom-[1.5px] after:h-1 after:bg-coral' : 'text-muted hover:text-navy',
              )}>
              {tab.label}
            </button>
          );
        })}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${value}`} tabIndex={0} className="focus-visible:outline-offset-4">
        {children}
      </div>
    </div>
  );
}
