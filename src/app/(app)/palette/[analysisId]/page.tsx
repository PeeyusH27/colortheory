import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoadingState } from '@/components/ui/States';

import { PaletteView } from './PaletteView';

export const metadata: Metadata = { title: 'Your palette' };

export default function PalettePage() {
  return (
    <Suspense fallback={<LoadingState label="Loading palette" className="min-h-[50dvh]" />}>
      <PaletteView />
    </Suspense>
  );
}
