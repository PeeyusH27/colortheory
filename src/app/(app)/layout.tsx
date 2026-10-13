import { AppGate } from '@/components/layout/AppGate';
import { AppNav } from '@/components/layout/AppNav';
import { OfflineBanner } from '@/components/layout/OfflineBanner';

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <AppNav />
      <OfflineBanner />
      <main id="main" className="pb-[calc(var(--nav-height)+env(safe-area-inset-bottom)+2rem)] md:pb-16">
        <AppGate>{children}</AppGate>
      </main>
    </>
  );
}
