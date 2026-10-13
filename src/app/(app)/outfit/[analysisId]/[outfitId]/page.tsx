import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoadingState } from '@/components/ui/States';

import { OutfitView } from './OutfitView';

export const metadata: Metadata = { title: 'Outfit' };

export default function OutfitPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading outfit" className="min-h-[50dvh]" />}>
      <OutfitView />
    </Suspense>
  );
}
