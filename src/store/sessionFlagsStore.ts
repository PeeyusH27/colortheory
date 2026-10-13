import { create } from 'zustand';

/**
 * In-memory flags for the current app process only (reset on cold start).
 * `splashPlayed` lets the index route act as a silent redirect after the first launch animation,
 * e.g. when protected routes send the user back to the anchor on sign-in/sign-out.
 */
interface SessionFlagsState {
  splashPlayed: boolean;
  markSplashPlayed: () => void;
}

export const useSessionFlags = create<SessionFlagsState>((set) => ({
  splashPlayed: false,
  markSplashPlayed: () => set({ splashPlayed: true }),
}));
