'use client';

import { ArrowRight, FlaskConical } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { config } from '@/constants/config';

import { enterDemoMode } from './authService';

/** "Explore in demo mode": no account, nothing uploaded, data stays in this browser. */
export function DemoEntry({ className, tone = 'ink', align = 'start' }: { className?: string; tone?: 'ink' | 'cream'; align?: 'start' | 'center' }) {
  const router = useRouter();
  if (!config.demoModeEnabled) return null;
  return (
    <div className={cx('flex flex-col gap-1', align === 'center' ? 'items-center text-center' : 'items-start', className)}>
      <Button
        variant="ghost"
        tone={tone}
        iconRight={ArrowRight}
        onClick={() => {
          enterDemoMode();
          router.push('/discover');
        }}>
        Explore in demo mode
      </Button>
      <p className={cx('type-caption flex items-center gap-1.5', tone === 'ink' ? 'text-muted' : 'text-inverse-muted')}>
        <FlaskConical aria-hidden size={14} />
        No account, nothing uploaded. Sample content is labelled “Demo”.
      </p>
    </div>
  );
}
