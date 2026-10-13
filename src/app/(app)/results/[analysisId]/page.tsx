import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoadingState } from '@/components/ui/States';

import { ResultsView } from './ResultsView';

export const metadata: Metadata = { title: 'Your colour story' };

export default function ResultsPage() {
  return (
    <Suspense fallback={<LoadingState label="Opening your colour story" className="min-h-[60dvh]" />}>
      <ResultsView />
    </Suspense>
  );
}
