import { router } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { ArrowRight, Cloud, FlaskConical, ImagePlus, RotateCcw, Smartphone, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ImageQualityNotice } from '@/components/camera/ImageQualityNotice';
import { PortraitFrame } from '@/components/outfits/PortraitFrame';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Text } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { useAnalysisStore } from '@/features/analysis/analysisStore';
import { useQualityPreview } from '@/features/analysis/useQualityPreview';
import { selectIsDemo, useAuthStore } from '@/features/auth/authStore';
import { pickPortraitFromLibrary } from '@/features/camera/pickPortrait';
import { usePortraitStore } from '@/features/camera/portraitStore';
import { availableAnalysisMethods, defaultAnalysisMethod, type AnalysisMethod } from '@/services/color-analysis';
import { usePreferencesStore } from '@/store/preferencesStore';
import { palette } from '@/theme/colors';
import { enterUp } from '@/theme/motion';
import { radii } from '@/theme/radii';
import { layout, spacing } from '@/theme/spacing';

const METHOD_COPY: Record<AnalysisMethod, { icon: LucideIcon; title: string; body: string }> = {
  device: {
    icon: Smartphone,
    title: 'On this device',
    body: 'Private and offline. A heuristic estimate from the pixels in your face guide — nothing is uploaded.',
  },
  cloud: {
    icon: Cloud,
    title: 'Cloud analysis',
    body: 'Uploads the portrait to your private storage and asks an AI vision model for a second opinion.',
  },
  demo: {
    icon: FlaskConical,
    title: 'Demo results',
    body: 'Sample palette for exploring the app. Your photo is not analysed.',
  },
};

function MethodOption({ method, selected, onSelect }: { method: AnalysisMethod; selected: boolean; onSelect: () => void }) {
  const copy = METHOD_COPY[method];
  const Icon = copy.icon;
  return (
    <PressableScale
      onPress={onSelect}
      haptic="selection"
      pressedScale={0.98}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${copy.title}. ${copy.body}`}
      style={[styles.option, selected && styles.optionSelected]}>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.optionCopy}>
        <View style={styles.optionTitle}>
          <Icon size={16} color={palette.cream} />
          <Text variant="label" color={palette.cream}>
            {copy.title}
          </Text>
        </View>
        <Text variant="bodyS" color="rgba(247,243,236,0.75)">
          {copy.body}
        </Text>
      </View>
    </PressableScale>
  );
}

export default function PortraitConfirmationScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const portrait = usePortraitStore((s) => s.portrait);
  const discard = usePortraitStore((s) => s.discard);
  const configure = useAnalysisStore((s) => s.configure);
  const status = useAuthStore((s) => s.status);
  const isDemo = useAuthStore(selectIsDemo);
  const storagePreference = usePreferencesStore((s) => s.portraitStorage);
  const signedIn = status === 'signedIn';
  const methods = availableAnalysisMethods({ signedIn });
  const [method, setMethod] = useState<AnalysisMethod>(isDemo ? 'device' : defaultAnalysisMethod({ signedIn }));
  const [keepInCloud, setKeepInCloud] = useState(signedIn && storagePreference === 'cloud');
  const [consent, setConsent] = useState(false);
  const quality = useQualityPreview(portrait);

  const upload = method === 'cloud' || keepInCloud;
  const blocking = quality.data?.issues.some((i) => i.severity === 'blocking') ?? false;
  const canContinue = Boolean(portrait) && (!upload || consent);

  const close = () => {
    discard();
    router.dismissTo('/discover');
  };

  const retake = () => {
    if (portrait?.source === 'camera' && router.canGoBack()) router.back();
    else router.replace('/camera');
  };

  const chooseAnother = async () => {
    if (await pickPortraitFromLibrary()) setConsent(false);
  };

  const proceed = () => {
    configure({ method, upload, keepInCloud: keepInCloud && signedIn, consentedAt: upload && consent ? new Date().toISOString() : null });
    router.push('/analysis');
  };

  if (!portrait) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <EmptyState title="No portrait selected" body="Take a new portrait or choose one from your photos." actionLabel="Open camera" onAction={() => router.replace('/camera')} />
      </View>
    );
  }

  const frameWidth = Math.min(width - layout.screenPaddingX * 2 - 24, 320);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing[2], paddingBottom: insets.bottom + spacing[6] }]}>
        <View style={styles.topBar}>
          <IconButton icon={X} accessibilityLabel="Cancel and delete this photo" onPress={close} variant="glass" />
          <Text variant="eyebrow" color={palette.sky}>
            Step 2 of 3 · Confirm
          </Text>
          <View style={styles.spacer} />
        </View>

        <Animated.View entering={enterUp(0)} style={styles.portraitWrap}>
          <PortraitFrame uri={portrait.uri} width={frameWidth} shadow="offsetCoral" accessibilityLabel="Your captured portrait" />
        </Animated.View>

        <Animated.View entering={enterUp(1)} style={styles.section}>
          <Text variant="h2" color={palette.cream} accessibilityRole="header">
            Happy with this photo?
          </Text>
          <Text variant="bodyS" color="rgba(247,243,236,0.75)">
            Lighting and camera processing (white balance, beauty modes, HDR) change how colour is recorded, which affects your recommendations. A daylight photo facing a window works best.
          </Text>
          <ImageQualityNotice report={quality.data ?? null} loading={quality.isLoading} />
          {quality.error ? (
            <Text variant="bodyS" color={palette.coral}>
              We couldn’t read this image. Try another photo.
            </Text>
          ) : null}
        </Animated.View>

        <View style={styles.row}>
          <SecondaryButton label="Retake" icon={RotateCcw} iconPosition="leading" tone="cream" size="md" onPress={retake} style={styles.flex} />
          <SecondaryButton label="Choose another" icon={ImagePlus} iconPosition="leading" tone="cream" size="md" onPress={() => void chooseAnother()} style={styles.flex} />
        </View>

        <View style={styles.section} accessibilityRole="radiogroup">
          <Text variant="eyebrow" color={palette.sky}>
            How should we analyse it?
          </Text>
          {methods.map((m) => (
            <MethodOption key={m} method={m} selected={method === m} onSelect={() => setMethod(m)} />
          ))}
          {!signedIn ? (
            <Text variant="caption" color="rgba(247,243,236,0.65)">
              Cloud analysis and cloud storage need an account. In demo mode everything stays on this phone.
            </Text>
          ) : null}
        </View>

        {signedIn ? (
          <View style={styles.section}>
            <Text variant="eyebrow" color={palette.sky}>
              Where should the portrait live?
            </Text>
            <Checkbox
              inverse
              checked={keepInCloud}
              onChange={setKeepInCloud}
              label="Keep it in my private cloud storage"
              description="Needed for AI outfit previews and viewing on other devices. Otherwise it stays on this phone only."
            />
          </View>
        ) : null}

        {upload ? (
          <View style={[styles.section, styles.consent]}>
            <Checkbox
              inverse
              checked={consent}
              onChange={setConsent}
              label="I consent to uploading this portrait"
              description={
                method === 'cloud'
                  ? 'It goes to your private storage (only your account can read it) and is sent to our AI provider via a link that expires in minutes. You can delete it any time.'
                  : 'It goes to your private storage; only your account can read it. You can delete it any time.'
              }
            />
            <TextButton label="How we handle portraits" color={palette.sky} onPress={() => router.push('/legal/privacy')} />
          </View>
        ) : null}

        <PrimaryButton
          label={blocking ? 'Continue to analysis anyway' : 'Continue to analysis'}
          icon={ArrowRight}
          tone="coral"
          fullWidth
          disabled={!canContinue}
          onPress={proceed}
          accessibilityHint={upload && !consent ? 'Tick the consent box to continue' : undefined}
        />
        <TextButton label="Delete photo and cancel" icon={Trash2} color={palette.coral} onPress={close} style={styles.center} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  content: { paddingHorizontal: layout.screenPaddingX, gap: spacing[6] },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spacer: { width: 44 },
  portraitWrap: { alignItems: 'center', paddingRight: 6 },
  section: { gap: spacing[3] },
  row: { flexDirection: 'row', gap: spacing[3] },
  flex: { flex: 1 },
  option: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'rgba(247,243,236,0.2)',
  },
  optionSelected: { borderColor: palette.coral, backgroundColor: 'rgba(255,107,74,0.08)' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(247,243,236,0.6)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioSelected: { borderColor: palette.coral },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.coral },
  optionCopy: { flex: 1, gap: 4 },
  optionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  consent: { padding: spacing[4], borderRadius: radii.md, backgroundColor: 'rgba(167,199,231,0.1)' },
  center: { alignSelf: 'center' },
});
