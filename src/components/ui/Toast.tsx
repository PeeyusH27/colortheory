'use client';

import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useEffect } from 'react';
import { create } from 'zustand';

import { durations } from '@/theme/motion';

import { cx } from './cx';

type ToastTone = 'info' | 'success' | 'error';

interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastMessage[];
  push: (message: string, tone: ToastTone) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, tone) => set((s) => ({ toasts: [...s.toasts.slice(-2), { id: nextId++, message, tone }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Fire-and-forget confirmations ("Saved to your wardrobe"). Errors that need action use ErrorState. */
export const toast = {
  show: (message: string) => useToastStore.getState().push(message, 'info'),
  success: (message: string) => useToastStore.getState().push(message, 'success'),
  error: (message: string) => useToastStore.getState().push(message, 'error'),
};

const ICONS = { info: Info, success: CircleCheck, error: CircleAlert } as const;

function ToastItem({ toast: t }: { toast: ToastMessage }) {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    const timer = setTimeout(() => dismiss(t.id), t.tone === 'error' ? durations.toast * 1.6 : durations.toast);
    return () => clearTimeout(timer);
  }, [dismiss, t.id, t.tone]);
  const Icon = ICONS[t.tone];
  return (
    <div
      className={cx(
        'pointer-events-auto flex w-full max-w-md animate-enter-up items-center gap-3 rounded-md border-[1.5px] border-navy bg-paper py-2.5 pr-2 pl-4 shadow-offset-sm',
      )}>
      <Icon aria-hidden size={18} className={cx('shrink-0', t.tone === 'error' ? 'text-error' : t.tone === 'success' ? 'text-success' : 'text-denim')} />
      <p className="type-body-m flex-1 text-navy">{t.message}</p>
      <button
        type="button"
        onClick={() => dismiss(t.id)}
        aria-label="Dismiss"
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-sand">
        <X aria-hidden size={16} />
      </button>
    </div>
  );
}

/** Renders queued toasts above the bottom navigation, announced politely to screen readers. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom)+0.75rem)] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
