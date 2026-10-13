import { usePreferencesStore } from '@/store/preferencesStore';

import {
  completeAuthFromUrl,
  deleteAccount,
  enterDemoMode,
  exitDemoMode,
  initializeAuth,
  signInWithEmail,
  signOut,
  signUpWithEmail,
} from '../authService';
import { useAuthStore } from '../authStore';

type Listener = (event: string, session: unknown) => void;
let listener: Listener = () => undefined;

const mockAuth = {
  getSession: jest.fn(),
  onAuthStateChange: jest.fn((cb: Listener) => {
    listener = cb;
    return { data: { subscription: { unsubscribe: jest.fn() } } };
  }),
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  resend: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  updateUser: jest.fn(),
  exchangeCodeForSession: jest.fn(),
  setSession: jest.fn(),
  signOut: jest.fn(),
};
const mockFunctionsInvoke = jest.fn();
const mockClient = { auth: mockAuth, functions: { invoke: mockFunctionsInvoke }, from: jest.fn() };

jest.mock('@/services/supabase/client', () => ({
  getSupabase: () => mockClient,
  getSupabaseOrNull: () => mockClient,
}));
jest.mock('expo-linking', () => ({
  createURL: (path: string, opts?: { queryParams?: Record<string, string> }) =>
    `colortheory://${path.replace(/^\//, '')}${opts?.queryParams ? `?${new URLSearchParams(opts.queryParams)}` : ''}`,
}));

const session = (id = 'user-1') => ({
  access_token: 'secret-access-token',
  refresh_token: 'secret-refresh-token',
  user: { id, email: 'alex@example.com', email_confirmed_at: '2026-01-01', user_metadata: { display_name: 'Alex' } },
});

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ status: 'initializing', user: null, recoveryPending: false, sessionExpired: false });
  usePreferencesStore.setState({ demoMode: false });
});

describe('session restoration', () => {
  it('restores a persisted session without exposing tokens in app state', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: session() } });
    await initializeAuth();
    const state = useAuthStore.getState();
    expect(state.status).toBe('signedIn');
    expect(state.user).toEqual({ id: 'user-1', email: 'alex@example.com', displayName: 'Alex', emailConfirmed: true });
    expect(JSON.stringify(state)).not.toContain('secret');
  });

  it('resumes demo mode when there is no session and the user chose demo', async () => {
    usePreferencesStore.setState({ demoMode: true });
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    await initializeAuth();
    expect(useAuthStore.getState().status).toBe('demo');
  });

  it('starts signed out if storage is unreadable', async () => {
    mockAuth.getSession.mockRejectedValue(new Error('corrupt'));
    await initializeAuth();
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('distinguishes an expired session from an intentional sign-out', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: session() } });
    await initializeAuth();
    listener('SIGNED_OUT', null);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedOut', sessionExpired: true });

    listener('SIGNED_IN', session());
    mockAuth.signOut.mockResolvedValue({ error: null });
    await signOut();
    expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    listener('SIGNED_OUT', null);
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedOut', sessionExpired: false });
  });

  it('flags password recovery so the router opens the reset screen', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    await initializeAuth();
    listener('PASSWORD_RECOVERY', session());
    expect(useAuthStore.getState()).toMatchObject({ status: 'signedIn', recoveryPending: true });
  });
});

describe('email/password', () => {
  it('maps invalid credentials to a friendly, non-revealing message', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: { name: 'AuthApiError', code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' } });
    await expect(signInWithEmail('a@b.co', 'x')).rejects.toMatchObject({ message: expect.stringMatching(/don’t match/) });
  });

  it('maps fetch failures to a retryable network error', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' } });
    await expect(signInWithEmail('a@b.co', 'x')).rejects.toMatchObject({ code: 'network', retryable: true });
  });

  it('reports when email verification is required and sets the deep-link redirect', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { user: { id: 'u' }, session: null }, error: null });
    await expect(signUpWithEmail({ email: 'a@b.co', password: 'colours42', displayName: 'Alex' })).resolves.toEqual({ needsVerification: true });
    expect(mockAuth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({ options: { data: { display_name: 'Alex' }, emailRedirectTo: 'colortheory://auth-callback' } }),
    );
  });
});

describe('email links', () => {
  it('exchanges a PKCE code', async () => {
    mockAuth.exchangeCodeForSession.mockResolvedValue({ error: null });
    await expect(completeAuthFromUrl('colortheory://auth-callback?code=abc')).resolves.toBe('signed-in');
    expect(mockAuth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
  });

  it('supports implicit-flow fragments and recovery links', async () => {
    mockAuth.setSession.mockResolvedValue({ error: null });
    await expect(completeAuthFromUrl('colortheory://auth-callback?type=recovery#access_token=t&refresh_token=r')).resolves.toBe('recovery');
    expect(mockAuth.setSession).toHaveBeenCalledWith({ access_token: 't', refresh_token: 'r' });
    expect(useAuthStore.getState().recoveryPending).toBe(true);
  });

  it('explains expired links', async () => {
    await expect(completeAuthFromUrl('colortheory://auth-callback?error_code=otp_expired&error_description=x')).rejects.toMatchObject({
      message: expect.stringMatching(/expired/),
    });
  });

  it('rejects incomplete links', async () => {
    await expect(completeAuthFromUrl('colortheory://auth-callback')).rejects.toMatchObject({ code: 'invalid_response' });
  });
});

describe('demo mode', () => {
  it('is explicit and reversible', () => {
    enterDemoMode();
    expect(useAuthStore.getState().status).toBe('demo');
    expect(usePreferencesStore.getState().demoMode).toBe(true);
    exitDemoMode();
    expect(useAuthStore.getState().status).toBe('signedOut');
    expect(usePreferencesStore.getState().demoMode).toBe(false);
  });

  it('a real sign-in always replaces demo mode', async () => {
    enterDemoMode();
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    await initializeAuth();
    listener('SIGNED_IN', session());
    expect(useAuthStore.getState().status).toBe('signedIn');
    expect(usePreferencesStore.getState().demoMode).toBe(false);
  });
});

describe('account deletion', () => {
  it('calls the server-side function (never the service key) and signs out locally', async () => {
    useAuthStore.setState({ status: 'signedIn' });
    mockFunctionsInvoke.mockResolvedValue({ data: { deleted: true }, error: null });
    mockAuth.signOut.mockResolvedValue({ error: null });
    await deleteAccount();
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('delete-account', { method: 'POST', body: { confirm: true } });
    expect(useAuthStore.getState().status).toBe('signedOut');
  });

  it('keeps the user signed in if deletion fails', async () => {
    useAuthStore.setState({ status: 'signedIn' });
    mockFunctionsInvoke.mockResolvedValue({ data: null, error: new Error('500') });
    await expect(deleteAccount()).rejects.toMatchObject({ code: 'unknown' });
    expect(useAuthStore.getState().status).toBe('signedIn');
  });
});
