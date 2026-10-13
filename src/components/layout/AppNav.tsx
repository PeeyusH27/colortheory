'use client';

import { Camera, Compass, Palette, Shirt, UserRound, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

import { useAuthStore } from '@/features/auth/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';

import { Logo } from '../brand/Logo';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { cx } from '../ui/cx';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Other paths that belong to this section (e.g. results pages under Discover). */
  match: string[];
}

const ITEMS: NavItem[] = [
  { href: '/discover', label: 'Discover', icon: Compass, match: ['/discover', '/results', '/history', '/palette'] },
  { href: '/colors', label: 'My Colors', icon: Palette, match: ['/colors'] },
  { href: '/analyze', label: 'Analyze', icon: Camera, match: ['/analyze'] },
  { href: '/outfits', label: 'Outfits', icon: Shirt, match: ['/outfits', '/gallery', '/outfit'] },
  { href: '/profile', label: 'Profile', icon: UserRound, match: ['/profile', '/settings', '/portraits'] },
];

const isActive = (item: NavItem, pathname: string | null) =>
  Boolean(pathname && item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)));

function DesktopLinks({ pathname }: { pathname: string | null }) {
  return (
    <ul className="hidden items-center gap-1 md:flex">
      {ITEMS.map((item) => {
        const active = isActive(item, pathname);
        const analyze = item.href === '/analyze';
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-[0.875rem] font-bold transition-colors duration-150',
                analyze
                  ? 'bg-coral text-ink hover:bg-[#ff5a35]'
                  : active
                    ? 'bg-navy text-cream'
                    : 'text-navy hover:bg-navy/6',
              )}>
              <item.icon aria-hidden size={16} strokeWidth={2} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function MobileTabs({ pathname }: { pathname: string | null }) {
  return (
    <ul className="grid h-[var(--nav-height)] grid-cols-5 items-stretch">
      {ITEMS.map((item) => {
        const active = isActive(item, pathname);
        const analyze = item.href === '/analyze';
        return (
          <li key={item.href} className="flex">
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-bold tracking-[0.02em]">
              {analyze ? (
                <span className="-mt-5 flex size-13 items-center justify-center rounded-full border-[1.5px] border-navy bg-coral text-ink shadow-offset-sm">
                  <item.icon aria-hidden size={22} strokeWidth={2} />
                </span>
              ) : (
                <span
                  className={cx(
                    'flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150',
                    active ? 'bg-navy text-cream' : 'text-navy',
                  )}>
                  <item.icon aria-hidden size={20} strokeWidth={active ? 2.2 : 1.8} />
                </span>
              )}
              <span className={cx(active ? 'text-navy' : 'text-muted')}>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActiveDesktopLinks() {
  return <DesktopLinks pathname={usePathname()} />;
}

function ActiveMobileTabs() {
  return <MobileTabs pathname={usePathname()} />;
}

function AccountChip() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const avatarUri = usePreferencesStore((s) => s.avatarUri);
  if (status === 'initializing') return <span className="size-9" />;
  return (
    <Link href="/profile" className="flex items-center gap-2 rounded-full p-0.5 pr-0.5 hover:bg-navy/6" aria-label="Your profile">
      {status === 'demo' ? <Badge label="Demo" tone="demo" title="Demo mode: data stays in this browser" /> : null}
      <Avatar name={user?.displayName ?? user?.email ?? 'Guest'} src={avatarUri} size={36} />
    </Link>
  );
}

/**
 * Top bar on every screen; primary navigation sits in it on desktop and in a bottom tab bar on
 * phones. Active-link state reads the pathname, which is only known at request time on dynamic
 * routes, so it streams in behind Suspense with an inactive fallback.
 */
export function AppNav() {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-navy px-4 py-2 text-cream focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line-warm bg-cream/92 backdrop-blur-md supports-[backdrop-filter]:bg-cream/80">
        <nav aria-label="Main" className="page flex h-16 items-center justify-between gap-4">
          <Link href="/discover" aria-label="ColorTheory home" className="shrink-0">
            <Logo size="sm" />
          </Link>
          <Suspense fallback={<DesktopLinks pathname={null} />}>
            <ActiveDesktopLinks />
          </Suspense>
          <AccountChip />
        </nav>
      </header>
      <nav
        aria-label="Main tabs"
        className="fixed inset-x-0 bottom-0 z-30 border-t-[1.5px] border-navy bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <Suspense fallback={<MobileTabs pathname={null} />}>
          <ActiveMobileTabs />
        </Suspense>
      </nav>
    </>
  );
}
