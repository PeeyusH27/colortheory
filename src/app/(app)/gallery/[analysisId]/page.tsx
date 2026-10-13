import type { Metadata } from 'next';
import { Suspense } from 'react';

import { LoadingState } from '@/components/ui/States';

import { GalleryView } from './GalleryView';

export const metadata: Metadata = { title: 'Outfit gallery' };

export default function GalleryPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading outfits" />}>
      <GalleryView />
    </Suspense>
  );
}
