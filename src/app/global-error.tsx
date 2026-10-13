'use client';

/** Last-resort boundary when the root layout itself fails. Must render its own <html>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#F7F3EC', color: '#172A46', display: 'grid', placeItems: 'center', minHeight: '100dvh', margin: 0 }}>
        <main style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontFamily: 'Georgia, serif' }}>ColorTheory couldn’t load</h1>
          <p>Please try again. Your saved colours are safe.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, padding: '12px 24px', borderRadius: 999, border: 0, background: '#172A46', color: '#F7F3EC', fontWeight: 700 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
