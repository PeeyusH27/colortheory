import type { Metadata } from 'next';

import { ColorsView } from './ColorsView';

export const metadata: Metadata = { title: 'My Colors' };

export default function ColorsPage() {
  return <ColorsView />;
}
