/**
 * Normalised application errors. Services throw `AppError`; screens map `code` to a friendly
 * message and decide whether to offer "Try again".
 */
export type AppErrorCode =
  | 'network'
  | 'offline'
  | 'timeout'
  | 'cancelled'
  | 'invalid_image'
  | 'low_quality'
  | 'not_configured'
  | 'unauthorized'
  | 'session_expired'
  | 'upload_failed'
  | 'generation_failed'
  | 'quota_exceeded'
  | 'permission_denied'
  | 'not_found'
  | 'invalid_response'
  | 'unknown';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly retryable: boolean;
  /** Optional technical detail for logs. Never shown to users verbatim. */
  readonly detail?: string;

  constructor(code: AppErrorCode, message: string, options?: { retryable?: boolean; detail?: string; cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.retryable = options?.retryable ?? DEFAULT_RETRYABLE[code];
    this.detail = options?.detail;
  }
}

const DEFAULT_RETRYABLE: Record<AppErrorCode, boolean> = {
  network: true,
  offline: true,
  timeout: true,
  cancelled: false,
  invalid_image: false,
  low_quality: false,
  not_configured: false,
  unauthorized: false,
  session_expired: false,
  upload_failed: true,
  generation_failed: true,
  quota_exceeded: false,
  permission_denied: false,
  not_found: false,
  invalid_response: true,
  unknown: true,
};

export const FRIENDLY_MESSAGES: Record<AppErrorCode, { title: string; body: string }> = {
  network: {
    title: 'Connection hiccup',
    body: 'We couldn’t reach the server. Check your connection and try again.',
  },
  offline: {
    title: 'You’re offline',
    body: 'Reconnect to sync your colours. Anything on this device is still available.',
  },
  timeout: {
    title: 'That took too long',
    body: 'The service didn’t respond in time. It’s usually temporary — try again in a moment.',
  },
  cancelled: { title: 'Cancelled', body: 'Nothing was saved.' },
  invalid_image: {
    title: 'We can’t read that image',
    body: 'Try a JPEG or PNG portrait taken with your camera.',
  },
  low_quality: {
    title: 'The photo needs better light',
    body: 'Colour results depend on lighting. Retake facing a window, without filters.',
  },
  not_configured: {
    title: 'Not set up yet',
    body: 'This feature needs a backend configuration. You can keep exploring in demo mode.',
  },
  unauthorized: { title: 'Access denied', body: 'You don’t have permission to do that.' },
  session_expired: {
    title: 'Your session expired',
    body: 'Please sign in again to keep your colours in sync.',
  },
  upload_failed: {
    title: 'Upload didn’t finish',
    body: 'Your portrait wasn’t uploaded. Check your connection and try again.',
  },
  generation_failed: {
    title: 'Preview generation failed',
    body: 'The try-on service couldn’t create this preview. Try again, or use the colour drape.',
  },
  quota_exceeded: {
    title: 'Daily limit reached',
    body: 'You’ve used today’s AI previews. Colour drapes and recommendations still work.',
  },
  permission_denied: {
    title: 'Permission needed',
    body: 'Allow access in Settings to continue.',
  },
  not_found: { title: 'Not found', body: 'This item may have been deleted.' },
  invalid_response: {
    title: 'Unexpected response',
    body: 'The service returned something we couldn’t understand. Please try again.',
  },
  unknown: { title: 'Something went wrong', body: 'Please try again.' },
};

function looksLikeNetworkError(message: string) {
  return /network request failed|failed to fetch|network error|ENOTFOUND|ECONNREFUSED|internet connection appears to be offline/i.test(
    message,
  );
}

/** Converts anything thrown into an `AppError` without leaking raw server messages to the UI. */
export function toAppError(error: unknown, fallback: AppErrorCode = 'unknown'): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    if (error.name === 'AbortError') return new AppError('cancelled', 'Cancelled', { cause: error });
    if (looksLikeNetworkError(error.message)) {
      return new AppError('network', FRIENDLY_MESSAGES.network.body, { cause: error, detail: error.message });
    }
    return new AppError(fallback, FRIENDLY_MESSAGES[fallback].body, { cause: error, detail: error.message });
  }
  return new AppError(fallback, FRIENDLY_MESSAGES[fallback].body, { detail: String(error) });
}

export function friendlyError(error: unknown) {
  const appError = toAppError(error);
  return { ...FRIENDLY_MESSAGES[appError.code], code: appError.code, retryable: appError.retryable };
}
