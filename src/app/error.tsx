'use client';

import { useEffect } from 'react';

import { LinkButton } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';

/** Route-level error boundary: friendly copy, never raw error messages. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Details go to the console for debugging; users see friendly copy only.
    console.error(error);
  }, [error]);

  return (
    <div className="page flex min-h-[70dvh] items-center justify-center">
      <ErrorState
        title="Something went wrong"
        body="This page hit an unexpected problem. Your saved colours are safe."
        onRetry={reset}
        secondary={
          <LinkButton href="/discover" variant="secondary">
            Go home
          </LinkButton>
        }
      />
    </div>
  );
}
