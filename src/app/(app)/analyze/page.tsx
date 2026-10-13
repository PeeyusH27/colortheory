import type { Metadata } from 'next';

import { CameraView } from './CameraView';

export const metadata: Metadata = { title: 'Take your portrait' };

export default function AnalyzePage() {
  return <CameraView />;
}
