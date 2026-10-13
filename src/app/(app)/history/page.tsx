import type { Metadata } from 'next';

import { HistoryView } from './HistoryView';

export const metadata: Metadata = { title: 'Analysis history' };

export default function Page() {
  return <HistoryView />;
}
