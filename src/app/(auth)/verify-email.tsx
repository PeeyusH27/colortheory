import { router, useLocalSearchParams } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { InlineAlert } from '@/components/ui/InlineAlert';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Text } from '@/components/ui/Text';
import { AuthScaffold } from '@/features/auth/AuthScaffold';
import { resendVerificationEmail } from '@/features/auth/authService';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { toAppError } from '@/utils/errors';

const RESEND_COOLDOWN_S = 60;

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
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
    <AuthScaffold eyebrow="One more step" title="Confirm your email" accent={palette.sage}>
      <View style={styles.hero}>
        <MailCheck size={40} color={palette.denim} strokeWidth={1.6} />
        <Text variant="bodyL">
          We sent a confirmation link to{' '}
          <Text variant="h3">{email ?? 'your email'}</Text>
          . Open it on this phone and you’ll be signed in automatically.
        </Text>
      </View>
      {message ? <InlineAlert tone={message.tone} message={message.text} /> : null}
      <PrimaryButton
        label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
        onPress={resend}
        loading={sending}
        disabled={!email || cooldown > 0}
        fullWidth
      />
      <SecondaryButton label="I’ve confirmed — sign in" onPress={() => router.replace('/sign-in')} fullWidth />
      <Text variant="caption" tone="secondary">
        Opened the link on another device? That’s fine — just sign in here with your password.
      </Text>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing[4] },
});
