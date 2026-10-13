import type { Metadata } from 'next';

import { ConfirmView } from './ConfirmView';

export const metadata: Metadata = { title: 'Confirm your portrait' };

export default function ConfirmPage() {
  return <ConfirmView />;
}
