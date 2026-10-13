'use client';

import { WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/** Shown while the browser reports no connection. Cached lists keep rendering underneath. */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div role="status" className="bg-ink text-cream">
      <p className="page type-body-s flex items-center gap-2 py-2">
        <WifiOff aria-hidden size={16} />
        You’re offline. Saved results still work; syncing resumes when you reconnect.
      </p>
    </div>
  );
}
