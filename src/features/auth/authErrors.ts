import { AppError, toAppError } from '@/utils/errors';

/**
 * Maps Supabase Auth error codes to friendly copy. Raw server messages are never shown, and
 * sign-in failures stay deliberately vague so the UI doesn't reveal which emails have accounts.
 */
const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'That email and password don’t match. Try again or reset your password.',
  email_not_confirmed: 'Please confirm your email first — check your inbox for the link.',
  user_already_exists: 'An account with this email may already exist. Try signing in instead.',
  email_exists: 'An account with this email may already exist. Try signing in instead.',
  weak_password: 'Choose a stronger password: at least 8 characters with letters and numbers.',
  same_password: 'Your new password must be different from the old one.',
  over_email_send_rate_limit: 'Too many emails sent. Please wait a few minutes and try again.',
  over_request_rate_limit: 'Too many attempts. Please wait a moment and try again.',
  email_address_invalid: 'That email address can’t receive mail. Check it and try again.',
  signup_disabled: 'New sign-ups are currently closed.',
  session_not_found: 'Your session expired. Please sign in again.',
  refresh_token_not_found: 'Your session expired. Please sign in again.',
  flow_state_expired: 'That link has expired. Request a new one.',
  flow_state_not_found: 'That link was opened in a different browser or has already been used. Request a new one here.',
  otp_expired: 'That link has expired. Request a new one.',
  bad_code_verifier: 'That link was opened in a different browser. Open it in the browser you used to sign up, or request a new one here.',
};

interface SupabaseLikeError {
  name?: string;
  message?: string;
  code?: string;
  status?: number;
}

export function mapAuthError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const e = (error ?? {}) as SupabaseLikeError;
  if (e.name === 'AuthRetryableFetchError' || (e.status === 0 && e.name?.startsWith('Auth'))) {
    return new AppError('network', 'We couldn’t reach the server. Check your connection and try again.', { cause: error });
  }
  const message = e.code ? AUTH_MESSAGES[e.code] : undefined;
  if (message) {
    const code = e.code === 'session_not_found' || e.code === 'refresh_token_not_found' ? 'session_expired' : 'unauthorized';
    return new AppError(code, message, { cause: error, detail: e.message, retryable: e.code?.startsWith('over_') });
  }
  if (e.status === 429) {
    return new AppError('unauthorized', AUTH_MESSAGES.over_request_rate_limit as string, { cause: error, retryable: true });
  }
  const appError = toAppError(error);
  if (appError.code === 'network') return appError;
  return new AppError('unknown', 'Something went wrong. Please try again.', { cause: error, detail: e.message });
}
