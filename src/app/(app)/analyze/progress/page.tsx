import type { Metadata } from 'next';

import { ProgressView } from './ProgressView';

export const metadata: Metadata = { title: 'Analysing' };

export default function ProgressPage() {
  return <ProgressView />;
}
