import type { Metadata } from 'next';

import { LegalDocument } from '@/components/legal/LegalDocument';
import { TERMS_SECTIONS } from '@/constants/legal';

export const metadata: Metadata = { title: 'Terms' };

export default function TermsPage() {
  return <LegalDocument eyebrow="Terms" title="Terms of use" sections={TERMS_SECTIONS} />;
}
