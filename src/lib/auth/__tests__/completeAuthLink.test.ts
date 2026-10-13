import { completeAuthLink, safeNextPath, type AuthLinkClient } from '../completeAuthLink';

function client(overrides: Partial<AuthLinkClient> = {}): AuthLinkClient & { exchangeCodeForSession: ReturnType<typeof vi.fn>; verifyOtp: ReturnType<typeof vi.fn> } {
  return {
    exchangeCodeForSession: vi.fn(async () => ({ error: null })),
    verifyOtp: vi.fn(async () => ({ error: null })),
    ...overrides,
  } as never;
}

const params = (query: string) => new URLSearchParams(query);

describe('completeAuthLink', () => {
  it('exchanges a PKCE code and continues to the requested page', async () => {
    const auth = client();
    await expect(completeAuthLink(params('code=abc&next=/colors'), auth)).resolves.toEqual({ kind: 'signed-in', redirectTo: '/colors' });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
  });

  it('verifies token-hash links (cross-browser email template) and routes recovery to the reset page', async () => {
    const auth = client();
    await expect(completeAuthLink(params('token_hash=th&type=recovery'), auth)).resolves.toEqual({ kind: 'recovery', redirectTo: '/reset-password' });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'th' });
  });

  it('explains expired links without leaking provider messages', async () => {
    const outcome = await completeAuthLink(params('error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'), client());
    expect(outcome.kind).toBe('error');
    expect(outcome.redirectTo).toMatch(/^\/sign-in\?link_error=/);
    expect(decodeURIComponent(outcome.redirectTo)).toMatch(/expired/);
  });

  it('sends failed recovery links back to “forgot password”', async () => {
    const outcome = await completeAuthLink(params('type=recovery&error_code=otp_expired'), client());
    expect(outcome.redirectTo).toMatch(/^\/forgot-password\?/);
  });

  it('rejects incomplete links', async () => {
    const outcome = await completeAuthLink(params(''), client());
    expect(outcome).toMatchObject({ kind: 'error', message: expect.stringMatching(/incomplete/) });
  });

  it('tells people opening a sign-up link in another browser that their email is confirmed', async () => {
    const auth = client({ exchangeCodeForSession: vi.fn(async () => ({ error: { code: 'bad_code_verifier', message: 'x' } })) });
    const outcome = await completeAuthLink(params('code=abc'), auth);
    expect(outcome).toMatchObject({ kind: 'error', message: 'Your email is confirmed. Sign in with your password to continue.' });
  });
});

describe('safeNextPath', () => {
  it.each([
    ['/colors', '/colors'],
    ['/results/abc?tab=1', '/results/abc?tab=1'],
    ['https://evil.example', '/discover'],
    ['//evil.example/path', '/discover'],
    ['/\\evil.example', '/discover'],
    [null, '/discover'],
  ])('%s → %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
