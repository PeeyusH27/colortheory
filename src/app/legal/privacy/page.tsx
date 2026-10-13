import type { Metadata } from 'next';

import { LegalDocument } from '@/components/legal/LegalDocument';
import { PRIVACY_SECTIONS } from '@/constants/legal';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return <LegalDocument eyebrow="Privacy" title="How ColorTheory handles your data" sections={PRIVACY_SECTIONS} />;
}
