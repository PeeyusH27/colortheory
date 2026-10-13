'use client';

import { MailCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button, LinkButton } from '@/components/ui/Button';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { toAppError } from '@/utils/errors';

import { resendVerificationEmail } from '../authService';

const RESEND_COOLDOWN_S = 60;

export function VerifyEmailPanel() {
  const email = useSearchParams().get('email');
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resend = async () => {
    if (!email) return;
    setSending(true);
    setMessage(null);
    try {
      await resendVerificationEmail(email);
      setMessage({ tone: 'success', text: 'Sent. It can take a minute — check spam too.' });
      setCooldown(RESEND_COOLDOWN_S);
    } catch (error) {
      setMessage({ tone: 'error', text: toAppError(error).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-4 rounded-md border-[1.5px] border-navy bg-paper p-5">
        <MailCheck aria-hidden size={36} strokeWidth={1.6} className="shrink-0 text-denim" />
        <p className="type-body-l text-navy">
          We sent a confirmation link to <strong className="font-bold">{email ?? 'your email'}</strong>. Open it in this browser and
          you’ll be signed in automatically.
        </p>
      </div>
      {message ? (
        <InlineAlert tone={message.tone} role={message.tone === 'error' ? 'alert' : 'status'}>
          {message.text}
        </InlineAlert>
      ) : null}
      <Button size="lg" fullWidth onClick={() => void resend()} loading={sending} disabled={!email || cooldown > 0}>
        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
      </Button>
      <LinkButton href="/sign-in" variant="secondary" size="lg" fullWidth>
        I’ve confirmed — sign in
      </LinkButton>
      <p className="type-caption text-muted">Opened the link on another device? That’s fine — just sign in here with your password.</p>
    </div>
  );
}
