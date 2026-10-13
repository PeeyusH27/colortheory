import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';

import { AppError } from '@/utils/errors';

import { getSupabase } from '../client';
import { invokeFunction } from '../functions';

jest.mock('../client', () => ({ getSupabase: jest.fn() }));

const invoke = jest.fn();
(getSupabase as jest.Mock).mockReturnValue({ functions: { invoke } });

const schema = z.object({ ok: z.literal(true) });

function httpError(status: number, body: unknown) {
  return new FunctionsHttpError(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

beforeEach(() => invoke.mockReset());

describe('invokeFunction', () => {
  it('returns schema-validated data', async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    await expect(invokeFunction('fn', { a: 1 }, schema)).resolves.toEqual({ ok: true });
    expect(invoke).toHaveBeenCalledWith('fn', expect.objectContaining({ body: { a: 1 }, method: 'POST', timeout: 45_000 }));
  });

  it('rejects malformed responses as invalid_response', async () => {
    invoke.mockResolvedValue({ data: { ok: 'yes' }, error: null });
    await expect(invokeFunction('fn', {}, schema)).rejects.toMatchObject({ code: 'invalid_response' });
  });

  it.each([
    [429, { error: { code: 'quota_exceeded', message: 'Daily limit reached.' } }, 'quota_exceeded'],
    [401, { error: { code: 'unauthorized', message: 'Expired' } }, 'session_expired'],
    [503, { error: { code: 'provider_not_configured', message: 'Not set up' } }, 'not_configured'],
    [504, { error: { code: 'provider_timeout', message: 'Slow' } }, 'timeout'],
    [502, { error: { code: 'invalid_provider_response', message: 'Bad' } }, 'invalid_response'],
    [500, 'not json', 'network'],
  ])('maps HTTP %i responses to app error codes', async (status, body, code) => {
    invoke.mockResolvedValue({ data: null, error: httpError(status, body) });
    const error = await invokeFunction('fn', {}, schema).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(code);
  });

  it('maps fetch failures to network errors', async () => {
    invoke.mockResolvedValue({ data: null, error: new FunctionsFetchError(new Error('Network request failed')) });
    await expect(invokeFunction('fn', {}, schema)).rejects.toMatchObject({ code: 'network', retryable: true });
  });

  it('reports cancellation when the signal was aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    invoke.mockResolvedValue({ data: null, error: new FunctionsFetchError(new Error('aborted')) });
    await expect(invokeFunction('fn', {}, schema, { signal: controller.signal })).rejects.toMatchObject({ code: 'cancelled' });
  });
});
