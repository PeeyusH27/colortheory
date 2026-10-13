import { router } from 'expo-router';
import { ArrowRight, FlaskConical, Mail } from 'lucide-react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Blob } from '@/components/brand/Blob';
import { ColorTheoryLogo } from '@/components/brand/ColorTheoryLogo';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { DrapePreview } from '@/components/outfits/DrapePreview';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Text } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { config, isSupabaseConfigured } from '@/constants/config';
import { enterDemoMode } from '@/features/auth/authService';
import { useAuthStore } from '@/features/auth/authStore';
import { palette } from '@/theme/colors';
import { enterUp, fadeIn } from '@/theme/motion';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';

function HeroCollage({ width }: { width: number }) {
  const panel = width * 0.36;
  const tall = panel * 1.45;
  return (
    <View style={{ height: tall + spacing[10], width }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.abs, { left: width * 0.35, top: -30 }]}>
        <Blob seed={41} color={palette.coral} size={width * 0.62} />
      </View>
      <Animated.View entering={fadeIn(80)} style={[styles.abs, styles.panel, shadows.offsetSky, { left: 0, top: spacing[8], transform: [{ rotate: '-5deg' }] }]}>
        <DrapePreview hex={palette.denim} colorName="Denim Blue" width={panel * 0.9} height={tall * 0.9} background={palette.mist} />
      </Animated.View>
      <Animated.View entering={fadeIn(200)} style={[styles.abs, styles.panel, shadows.offsetCoral, { left: width * 0.62, top: spacing[10], transform: [{ rotate: '6deg' }] }]}>
        <DrapePreview hex={palette.petrol} colorName="Petrol Blue" width={panel * 0.86} height={tall * 0.86} background={palette.linen} />
      </Animated.View>
      <Animated.View entering={fadeIn(320)} style={[styles.abs, styles.panel, shadows.offsetInk, { left: width * 0.3, top: 0 }]}>
        <DrapePreview hex={palette.navy} colorName="Navy Blue" width={panel} height={tall} background={palette.sand} />
      </Animated.View>
    </View>
  );
}

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const sessionExpired = useAuthStore((s) => s.sessionExpired);
  const clearSessionExpired = useAuthStore((s) => s.clearSessionExpired);
  const contentWidth = Math.min(width, 560) - spacing[5] * 2;

  return (
    <ScreenContainer scroll contentContainerStyle={styles.content}>
      <View style={styles.top}>
        <ColorTheoryLogo size="sm" />
        <Text variant="eyebrow" tone="secondary">
          Personal colour studio
        </Text>
      </View>

      <HeroCollage width={contentWidth} />

      <Animated.View entering={enterUp(0, 250)} style={styles.headline}>
        <Text variant="displayL" accessibilityRole="header">
          Your colours,{' '}
          <Text variant="displayL" italic color={palette.denim}>
            decoded.
          </Text>
        </Text>
        <Text variant="bodyL" tone="secondary">
          A portrait, a palette and outfits that work with you — not against you.
        </Text>
      </Animated.View>

      {sessionExpired ? (
        <InlineAlert
          tone="warning"
          title="You were signed out"
          message="Your session expired. Sign in again to sync your colours."
          action={<TextButton label="Dismiss" onPress={clearSessionExpired} />}
        />
      ) : null}

      {!isSupabaseConfigured ? (
        <InlineAlert
          tone="info"
          title="Accounts aren’t set up in this build"
          message="Add your Supabase URL and publishable key to .env to enable sign-in. Meanwhile, demo mode has every feature with data kept on this device."
        />
      ) : null}

      <Animated.View entering={enterUp(1, 300)} style={styles.actions}>
        <PrimaryButton
          label="Continue with email"
          icon={Mail}
          iconPosition="leading"
          fullWidth
          disabled={!isSupabaseConfigured}
          onPress={() => router.push('/sign-up')}
          accessibilityHint="Create an account with your email address"
        />
        <SecondaryButton label="I have an account — Sign in" fullWidth disabled={!isSupabaseConfigured} onPress={() => router.push('/sign-in')} />
        {config.demoModeEnabled ? (
          <View style={styles.demo}>
            <TextButton label="Explore in demo mode" icon={ArrowRight} onPress={enterDemoMode} accessibilityHint="Uses the app without an account. Data stays on this device." />
            <View style={styles.demoNote}>
              <FlaskConical size={14} color={palette.slate} />
              <Text variant="caption" tone="secondary" style={styles.flex}>
                No account, nothing uploaded. Sample content is labelled “Demo”.
              </Text>
            </View>
          </View>
        ) : null}
      </Animated.View>

      <Text variant="caption" tone="secondary" align="center" style={styles.legal}>
        By continuing you agree to our{' '}
        <Text variant="caption" tone="accent" accessibilityRole="link" onPress={() => router.push('/legal/terms')} style={styles.underline}>
          Terms
        </Text>{' '}
        and{' '}
        <Text variant="caption" tone="accent" accessibilityRole="link" onPress={() => router.push('/legal/privacy')} style={styles.underline}>
          Privacy Policy
        </Text>
        .
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing[5], paddingBottom: spacing[6] },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing[3] },
  abs: { position: 'absolute' },
  panel: { borderWidth: 1.5, borderColor: palette.navy, backgroundColor: palette.paper },
  headline: { gap: spacing[3] },
  actions: { gap: spacing[3] },
  demo: { alignItems: 'center', gap: spacing[1] },
  demoNote: { flexDirection: 'row', gap: spacing[2], alignItems: 'center', paddingHorizontal: spacing[4] },
  flex: { flexShrink: 1 },
  legal: { marginTop: spacing[2] },
  underline: { textDecorationLine: 'underline' },
});
