import { Redirect } from 'expo-router';

import { AnimatedSplash } from '@/features/splash/AnimatedSplash';
import { useLaunchDestination } from '@/features/splash/useLaunchDestination';
import { useSessionFlags } from '@/store/sessionFlagsStore';

/**
 * Anchor route. On cold start it plays the brand splash, then replaces itself with the right
 * destination. Afterwards (e.g. protected-route redirects on sign-in/out) it redirects instantly.
 */
export default function Index() {
  const destination = useLaunchDestination();
  const splashPlayed = useSessionFlags((s) => s.splashPlayed);
  const markSplashPlayed = useSessionFlags((s) => s.markSplashPlayed);

  if (splashPlayed) return <Redirect href={destination} />;

  // Marking the splash as played re-renders this route as a <Redirect> (a replace), so the
  // splash never stays in the back stack.
  return <AnimatedSplash onFinish={markSplashPlayed} />;
}
