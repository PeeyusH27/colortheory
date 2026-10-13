import { create } from 'zustand';

/**
 * Authentication state for routing and UI.
 *
 * Deliberately holds only a *summary* of the user — never access/refresh tokens. The Supabase
 * client owns the session (persisted in SecureStore); services ask it for a token when needed.
 */
export type AuthStatus = 'initializing' | 'signedOut' | 'signedIn' | 'demo';

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  emailConfirmed: boolean;
}

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /** A password-recovery link was opened; route to the reset-password screen. */
  recoveryPending: boolean;
  /** The session ended without the user signing out (refresh failed / revoked). */
  sessionExpired: boolean;
  setSignedIn: (user: AuthUser) => void;
  setSignedOut: (options?: { expired?: boolean }) => void;
  setDemo: () => void;
  setRecoveryPending: (pending: boolean) => void;
  clearSessionExpired: () => void;
}

export const DEMO_USER: AuthUser = {
  id: 'demo-user',
  email: null,
  displayName: 'Guest',
  emailConfirmed: false,
};

export const useAuthStore = create<AuthState>((set) => ({
  status: 'initializing',
  user: null,
  recoveryPending: false,
  sessionExpired: false,
  setSignedIn: (user) => set({ status: 'signedIn', user, sessionExpired: false }),
  setSignedOut: (options) =>
    set({ status: 'signedOut', user: null, recoveryPending: false, sessionExpired: options?.expired ?? false }),
  setDemo: () => set({ status: 'demo', user: DEMO_USER, sessionExpired: false }),
  setRecoveryPending: (pending) => set({ recoveryPending: pending }),
  clearSessionExpired: () => set({ sessionExpired: false }),
}));

export const selectIsAuthenticated = (s: AuthState) => s.status === 'signedIn' || s.status === 'demo';
export const selectIsDemo = (s: AuthState) => s.status === 'demo';
