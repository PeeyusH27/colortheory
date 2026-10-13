import {
  CameraOff,
  CircleAlert,
  CloudOff,
  ImageOff,
  KeyRound,
  SunDim,
  TimerOff,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { FRIENDLY_MESSAGES, friendlyError, type AppErrorCode } from '@/utils/errors';

import { Button } from './Button';
import { cx } from './cx';
import { Spinner } from './Spinner';

const ERROR_ICONS: Partial<Record<AppErrorCode, LucideIcon>> = {
  network: WifiOff,
  offline: WifiOff,
  timeout: TimerOff,
  invalid_image: ImageOff,
  low_quality: SunDim,
  not_configured: CloudOff,
  session_expired: KeyRound,
  upload_failed: CloudOff,
  generation_failed: ImageOff,
  permission_denied: CameraOff,
};

interface ErrorStateProps {
  /** Either pass an error (mapped to friendly copy) or explicit title/body. */
  error?: unknown;
  code?: AppErrorCode;
  title?: string;
  body?: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondary?: ReactNode;
  inverse?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Shared error presentation for API failures, upload/generation failures, expired sessions,
 * invalid images and offline mode. Retry is only offered for retryable errors.
 */
export function ErrorState({
  error,
  code,
  title,
  body,
  onRetry,
  retryLabel = 'Try again',
  secondary,
  inverse = false,
  compact = false,
  className,
}: ErrorStateProps) {
  const friendly = error !== undefined ? friendlyError(error) : null;
  const resolvedCode: AppErrorCode = code ?? friendly?.code ?? 'unknown';
  // An explicit `code` wins over the error's own classification.
  const copy = code ? FRIENDLY_MESSAGES[code] : (friendly ?? FRIENDLY_MESSAGES.unknown);
  const Icon = ERROR_ICONS[resolvedCode] ?? CircleAlert;
  const showRetry = onRetry && (friendly ? friendly.retryable : true);

  return (
    <div
      role="alert"
      className={cx('flex flex-col items-center justify-center text-center', compact ? 'gap-4 py-5' : 'gap-5 px-6 py-10', className)}>
      <div className={cx('flex size-16 items-center justify-center rounded-full', inverse ? 'bg-cream/10 text-cream' : 'bg-error-soft text-error')}>
        <Icon aria-hidden size={26} strokeWidth={1.8} />
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        <h2 className={cx(compact ? 'type-h3' : 'type-h2', inverse ? 'text-cream' : 'text-navy')}>{title ?? copy.title}</h2>
        <p className={cx('type-body-m', inverse ? 'text-inverse-muted' : 'text-muted')}>{body ?? copy.body}</p>
      </div>
      {showRetry || secondary ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {showRetry ? (
            <Button onClick={onRetry} tone={inverse ? 'cream' : 'ink'}>
              {retryLabel}
            </Button>
          ) : null}
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  body: string;
  icon?: LucideIcon;
  art?: ReactNode;
  action?: ReactNode;
  className?: string;
  headingLevel?: 'h2' | 'h3';
}

export function EmptyState({ title, body, icon: Icon, art, action, className, headingLevel: Heading = 'h2' }: EmptyStateProps) {
  return (
    <div className={cx('flex flex-col items-center gap-4 px-6 py-10 text-center', className)}>
      {art ?? (Icon ? (
        <div className="flex size-16 items-center justify-center rounded-full bg-mist text-denim">
          <Icon aria-hidden size={26} strokeWidth={1.8} />
        </div>
      ) : null)}
      <div className="flex max-w-sm flex-col gap-2">
        <Heading className="type-h2 text-navy">{title}</Heading>
        <p className="type-body-m text-muted">{body}</p>
      </div>
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  );
}

/** Loading region. Announces once to screen readers and shows a quiet spinner. */
export function LoadingState({ label = 'Loading', inverse, className }: { label?: string; inverse?: boolean; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx('flex flex-col items-center justify-center gap-3 py-16', inverse ? 'text-cream' : 'text-denim', className)}>
      <Spinner size={28} />
      <span className={cx('type-caption', inverse ? 'text-inverse-muted' : 'text-muted')}>{label}…</span>
    </div>
  );
}

/** Content-shaped placeholder while data loads. Decorative; pair with a LoadingState label. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('animate-pulse-soft bg-linen/70', className)} />;
}
