'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

import { cx } from './cx';
import { IconButton } from './IconButton';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Visually hide the title (it is still the dialog's accessible name). */
  hideTitle?: boolean;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const WIDTHS = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' } as const;

/**
 * Modal sheet built on the native <dialog>: focus is trapped and restored by the browser, Escape
 * closes it and the page behind becomes inert. Slides up from the bottom on phones and appears
 * centred on wider screens.
 */
export function Sheet({ open, onClose, title, hideTitle, description, children, footer, size = 'md', className }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // Older engines (and jsdom) lack showModal; fall back to a plain open dialog.
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      className={cx(
        'm-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-xl bg-cream p-0 text-navy shadow-floating',
        'open:animate-sheet-up sm:m-auto sm:rounded-xl',
        WIDTHS[size],
        className,
      )}>
      {open ? (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 sm:px-6">
            <div className="flex flex-col gap-1">
              <h2 id={titleId} className={cx('type-h2', hideTitle && 'sr-only')}>
                {title}
              </h2>
              {description ? (
                <p id={descId} className="type-body-s text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <IconButton icon={X} label="Close" onClick={onClose} className="-mt-1 -mr-2" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">{children}</div>
          {footer ? <div className="border-t border-line-warm bg-cream px-5 py-4 sm:px-6">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}
