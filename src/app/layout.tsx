import type { Metadata, Viewport } from 'next';
import { DM_Mono, DM_Sans, Playfair_Display } from 'next/font/google';

import { AppProviders } from '@/components/layout/AppProviders';

import './globals.css';

// Self-hosted by next/font: no requests go to Google from the visitor's browser.
const playfair = Playfair_Display({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--font-playfair', display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' });
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-dm-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'ColorTheory — discover the colours that are yours', template: '%s · ColorTheory' },
  description:
    'Personal colour analysis that stays private by default: estimate your undertone, depth and contrast from a portrait, then explore palettes and outfits.',
  applicationName: 'ColorTheory',
  icons: { icon: '/favicon.png' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#F7F3EC',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body className="min-h-dvh">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
