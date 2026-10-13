import type { Metadata } from 'next';

import { PortraitsView } from './PortraitsView';

export const metadata: Metadata = { title: 'Your portraits' };

export default function Page() {
  return <PortraitsView />;
}
