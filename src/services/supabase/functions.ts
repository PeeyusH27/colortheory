import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import type { z } from 'zod';

import { AppError, type AppErrorCode } from '@/utils/errors';

import { getSupabase } from './client';

/**
 * Calls a Supabase Edge Function and validates its response.
 *
 * All ColorTheory functions return `{ error: { code, message } }` with a non-2xx status on
 * failure. Codes are mapped to AppError codes so screens show consistent, friendly states.
 */

const SERVER_CODES: Record<string, AppErrorCode> = {
  unauthorized: 'session_expired',
  forbidden: 'unauthorized',
  not_found: 'not_found',
  invalid_input: 'invalid_image',
  low_quality: 'low_quality',
  quota_exceeded: 'quota_exceeded',
  provider_not_configured: 'not_configured',
  provider_timeout: 'timeout',
  provider_error: 'generation_failed',
  invalid_provider_response: 'invalid_response',
};

async function readServerError(error: FunctionsHttpError): Promise<AppError> {
  const response = error.context as Response | undefined;
  const status = response?.status ?? 0;
  let code: AppErrorCode = status === 401 ? 'session_expired' : status === 429 ? 'quota_exceeded' : status >= 500 ? 'network' : 'unknown';
  let message = 'The service returned an error.';
  try {
    const body = (await response?.json()) as { error?: { code?: string; message?: string } } | undefined;
    if (body?.error?.code && SERVER_CODES[body.error.code]) code = SERVER_CODES[body.error.code] as AppErrorCode;
    if (body?.error?.message) message = body.error.message;
  } catch {
    // Non-JSON error body; keep defaults.
  }
  return new AppError(code, message, { cause: error, detail: `HTTP ${status}` });
}

export async function invokeFunction<S extends z.ZodType>(
  name: string,
  body: Record<string, unknown>,
  schema: S,
  options: { signal?: AbortSignal; timeoutMs?: number; method?: 'POST' | 'GET' } = {},
): Promise<z.infer<S>> {
  const { data, error } = await getSupabase().functions.invoke(name, {
    body,
    method: options.method ?? 'POST',
    signal: options.signal,
    timeout: options.timeoutMs ?? 45_000,
  });

  if (error) {
    if (options.signal?.aborted) throw new AppError('cancelled', 'Cancelled');
    if (error instanceof FunctionsHttpError) throw await readServerError(error);
    if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      const timedOut = /timeout|timed out|abort/i.test(String((error as Error).message));
      throw new AppError(timedOut ? 'timeout' : 'network', 'We couldn’t reach the server.', { cause: error });
    }
    throw new AppError('unknown', 'Something went wrong.', { cause: error });
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new AppError('invalid_response', 'The service returned an unexpected response.', {
      detail: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    });
  }
  return parsed.data;
}
