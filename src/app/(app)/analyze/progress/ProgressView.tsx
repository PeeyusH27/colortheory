'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { AnalysisProgress } from '@/components/analysis/AnalysisProgress';
import { ImageQualityNotice } from '@/components/camera/ImageQualityNotice';
import { Button, LinkButton } from '@/components/ui/Button';
import { ProvenanceBadge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/States';
import { useAnalysisStore } from '@/features/analysis/analysisStore';
import { plannedStages, runAnalysis } from '@/features/analysis/runAnalysis';
import { usePacedStages } from '@/features/analysis/usePacedStages';
import { useAuthStore } from '@/features/auth/authStore';
import { usePortraitStore } from '@/features/camera/portraitStore';
import { routes } from '@/lib/routes';
import { durations } from '@/theme/motion';

export function ProgressView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const portrait = usePortraitStore((s) => s.portrait);
  const discardPortrait = usePortraitStore((s) => s.discard);
  const run = useAnalysisStore();
  const authReady = useAuthStore((s) => s.status === 'signedIn' || s.status === 'demo');
  const controller = useRef<AbortController | null>(null);

  const stages = run.request ? plannedStages(run.request) : [];
  const paced = usePacedStages(stages, run.completed, run.current);
  const isDemoRun = run.request?.method === 'demo';

  const start = (acceptLowQuality = false) => {
    // Read the latest request from the store (a retry may have switched the method).
    const request = useAnalysisStore.getState().request;
    const current = usePortraitStore.getState().portrait;
    if (!current || !request) return;
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    runAnalysis({ portrait: current, request, signal: ctrl.signal, acceptLowQuality })
      .then(() => queryClient.invalidateQueries({ queryKey: ['data'] }))
      .catch(() => {
        // State (error / quality gate) is already in the store; nothing else to do here.
      });
  };

  // Start once per visit, after auth is known (so results go to the right account). Deferred a
  // tick so a development double-mount doesn't start (and then cancel) a first run. Leaving the
  // page — nav link, back button — cancels and cleans up, so an analysis never keeps running
  // silently in the background.
  useEffect(() => {
    if (!authReady) return;
    const timer = setTimeout(() => start(), 0);
    return () => {
      clearTimeout(timer);
      controller.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start exactly once when auth is ready
  }, [authReady]);

  // When the real work is done and the paced reveal has caught up, hand over to the results.
  useEffect(() => {
    if (run.status !== 'done' || !run.analysisId || !paced.caughtUp) return;
    const id = run.analysisId;
    const timer = setTimeout(() => {
      // The working copy has been saved (or uploaded); drop the in-memory image.
      discardPortrait();
      router.replace(`${routes.results(id)}?fresh=1`);
    }, durations.slow);
    return () => clearTimeout(timer);
  }, [run.status, run.analysisId, paced.caughtUp, discardPortrait, router]);

  const cancel = () => {
    controller.current?.abort();
    useAnalysisStore.getState().reset();
    router.replace('/analyze/confirm');
  };

  const retake = () => {
    controller.current?.abort();
    useAnalysisStore.getState().reset();
    router.replace('/analyze');
  };

  if (!portrait || !run.request) {
    return (
      <div className="page py-10">
        <ErrorState
          title="Nothing to analyse"
          body="Your portrait wasn’t found — photos are kept in memory only, so a reload clears them. Take a new one to continue."
          secondary={<LinkButton href="/analyze">Open camera</LinkButton>}
        />
      </div>
    );
  }

  return (
    <div className="page pt-6 md:pt-10">
      <section aria-labelledby="progress-title" className="editorial-frame mx-auto flex max-w-2xl flex-col gap-8 bg-ink px-5 py-8 text-cream shadow-offset-coral sm:px-10 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="type-eyebrow text-sky">Step 3 of 3 · Analysis</p>
          {isDemoRun ? <ProvenanceBadge kind="demo" /> : <ProvenanceBadge kind={run.request.method === 'cloud' ? 'remote' : 'device'} inverse />}
        </div>

        {run.status === 'quality_gate' && run.quality ? (
          <div className="flex animate-fade-in flex-col gap-5" role="alert">
            <h1 id="progress-title" className="type-h1">
              This photo needs better light
            </h1>
            <p className="type-body-m text-cream/80">
              We’d rather ask for a retake than give you confident-looking results from a photo we can’t read well.
            </p>
            <ImageQualityNotice report={run.quality} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="accent" onClick={retake}>
                Retake photo
              </Button>
              <Button variant="secondary" tone="cream" onClick={cancel}>
                Back to confirmation
              </Button>
            </div>
            <Button variant="ghost" tone="cream" className="self-start text-sky" onClick={() => start(true)}>
              Continue anyway (low confidence)
            </Button>
          </div>
        ) : run.status === 'error' ? (
          <div className="animate-fade-in">
            <h1 id="progress-title" className="sr-only">
              Analysis failed
            </h1>
            <ErrorState
              inverse
              error={run.error}
              onRetry={() => start()}
              secondary={
                run.error?.code === 'not_configured' || run.request.method === 'cloud' ? (
                  <Button
                    variant="secondary"
                    tone="cream"
                    onClick={() => {
                      useAnalysisStore.getState().configure({ method: 'device', upload: false, keepInCloud: false, consentedAt: null });
                      setTimeout(() => start(), 0);
                    }}>
                    Analyse in this browser instead
                  </Button>
                ) : (
                  <Button variant="secondary" tone="cream" onClick={cancel}>
                    Back
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-8">
            <h1 id="progress-title" className="type-display-l text-center">
              Reading your <span className="font-normal text-coral italic">colours</span>
            </h1>
            <AnalysisProgress
              portraitUri={portrait.url}
              stages={stages}
              completed={paced.completed}
              current={paced.current}
              uploadProgress={run.uploadProgress}
              demo={isDemoRun}
            />
            {run.status === 'running' ? (
              <Button variant="secondary" tone="cream" onClick={cancel}>
                Cancel
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
