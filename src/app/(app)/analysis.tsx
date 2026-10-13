import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnalysisProgress } from '@/components/analysis/AnalysisProgress';
import { ImageQualityNotice } from '@/components/camera/ImageQualityNotice';
import { ProvenanceBadge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Text } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { useAnalysisStore } from '@/features/analysis/analysisStore';
import { plannedStages, runAnalysis } from '@/features/analysis/runAnalysis';
import { usePacedStages } from '@/features/analysis/usePacedStages';
import { usePortraitStore } from '@/features/camera/portraitStore';
import { queryClient } from '@/lib/queryClient';
import { haptics } from '@/lib/haptics';
import { palette } from '@/theme/colors';
import { durations } from '@/theme/motion';
import { layout, spacing } from '@/theme/spacing';

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const portrait = usePortraitStore((s) => s.portrait);
  const discardPortrait = usePortraitStore((s) => s.discard);
  const run = useAnalysisStore();
  const controller = useRef<AbortController | null>(null);
  const started = useRef(false);

  const stages = run.request ? plannedStages(run.request) : [];
  const paced = usePacedStages(stages, run.completed, run.current);
  const isDemoRun = run.request?.method === 'demo';

  const start = (acceptLowQuality = false) => {
    // Read the latest request from the store (a retry may have switched the method).
    const request = useAnalysisStore.getState().request;
    const current = usePortraitStore.getState().portrait;
    if (!current || !request) return;
    controller.current?.abort();
    controller.current = new AbortController();
    runAnalysis({ portrait: current, request, signal: controller.current.signal, acceptLowQuality })
      .then(() => void queryClient.invalidateQueries({ queryKey: ['data'] }))
      .catch(() => {
        // State (error / quality gate) is already in the store; nothing else to do here.
      });
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start();
    return () => controller.current?.abort();
    // Start exactly once per visit.
  }, []);

  // When real work is done and the paced reveal has caught up, cross-fade into the results.
  useEffect(() => {
    if (run.status !== 'done' || !run.analysisId || !paced.caughtUp) return;
    haptics.success();
    const id = run.analysisId;
    const timer = setTimeout(() => {
      // The working copy has been persisted (or uploaded); drop the temporary file.
      discardPortrait();
      router.replace({ pathname: '/results/[analysisId]', params: { analysisId: id, fresh: '1' } });
    }, durations.slow);
    return () => clearTimeout(timer);
  }, [run.status, run.analysisId, paced.caughtUp, discardPortrait]);

  const cancel = () => {
    controller.current?.abort();
    useAnalysisStore.getState().reset();
    if (router.canGoBack()) router.back();
    else router.replace('/portrait-confirmation');
  };

  // Android hardware back = cancel (with cleanup), never a silent background run.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      cancel();
      return true;
    });
    return () => sub.remove();
  }, []);

  const retake = () => {
    controller.current?.abort();
    useAnalysisStore.getState().reset();
    router.dismissTo('/camera');
  };

  if (!portrait || !run.request) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <ErrorState
          inverse
          title="Nothing to analyse"
          body="Your portrait wasn’t found — it may have been cleared. Take a new one to continue."
          secondaryLabel="Open camera"
          onSecondary={() => router.replace('/camera')}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing[4], paddingBottom: insets.bottom + spacing[6] }]}>
        <View style={styles.header}>
          <Text variant="eyebrow" color={palette.sky}>
            Step 3 of 3 · Analysis
          </Text>
          {isDemoRun ? <ProvenanceBadge kind="demo" /> : <ProvenanceBadge kind={run.request.method === 'cloud' ? 'remote' : 'device'} inverse />}
        </View>

        {run.status === 'quality_gate' && run.quality ? (
          <Animated.View entering={FadeIn.duration(durations.base).reduceMotion(ReduceMotion.System)} style={styles.gate}>
            <Text variant="h1" color={palette.cream} accessibilityRole="header">
              This photo needs better light
            </Text>
            <Text variant="bodyM" color="rgba(247,243,236,0.8)">
              We’d rather ask for a retake than give you confident-looking results from a photo we can’t read well.
            </Text>
            <ImageQualityNotice report={run.quality} />
            <PrimaryButton label="Retake photo" tone="coral" fullWidth onPress={retake} />
            <SecondaryButton label="Back to confirmation" tone="cream" fullWidth onPress={cancel} />
            <TextButton label="Continue anyway (low confidence)" color={palette.sky} onPress={() => start(true)} style={styles.center} />
          </Animated.View>
        ) : run.status === 'error' ? (
          <Animated.View entering={FadeIn.duration(durations.base).reduceMotion(ReduceMotion.System)}>
            <ErrorState
              inverse
              error={run.error}
              onRetry={() => start()}
              secondaryLabel={run.error?.code === 'not_configured' || run.request.method === 'cloud' ? 'Analyse on this device instead' : 'Back'}
              onSecondary={() => {
                if (run.error?.code === 'not_configured' || run.request?.method === 'cloud') {
                  useAnalysisStore.getState().configure({ method: 'device', upload: false, keepInCloud: false, consentedAt: null });
                  setTimeout(() => start(), 0);
                } else {
                  cancel();
                }
              }}
            />
          </Animated.View>
        ) : (
          <Animated.View exiting={FadeOut.duration(durations.base)} style={styles.progress}>
            <Text variant="displayL" color={palette.cream} accessibilityRole="header">
              Reading your{' '}
              <Text variant="displayL" italic color={palette.coral}>
                colours
              </Text>
            </Text>
            <AnalysisProgress
              portraitUri={portrait.uri}
              stages={stages}
              completed={paced.completed}
              current={paced.current}
              uploadProgress={run.uploadProgress}
              demo={isDemoRun}
            />
            {run.status === 'running' ? <SecondaryButton label="Cancel" tone="cream" size="md" onPress={cancel} style={styles.center} /> : null}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  content: { paddingHorizontal: layout.screenPaddingX, gap: spacing[6], flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[3] },
  progress: { gap: spacing[6] },
  gate: { gap: spacing[4] },
  center: { alignSelf: 'center' },
});
