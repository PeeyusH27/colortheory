import { useEffect, useState } from 'react';

import type { AnalysisStage } from '@/services/color-analysis';
import { durations } from '@/theme/motion';

/**
 * On-device analysis can finish in ~200 ms, which would flash the stage list past unread.
 * This hook reveals *real* completed stages one at a time, at most one every
 * `durations.analysisStageMin` ms. It never shows a stage as done before it really is, and it
 * never invents stages — it only slows down the reveal.
 */
export function usePacedStages(stages: AnalysisStage[], realCompleted: AnalysisStage[], realCurrent: AnalysisStage | null) {
  const [shownCount, setShownCount] = useState(0);
  const realDone = realCompleted.length;
  // A retry restarts the real stages; restart the reveal with it.
  if (shownCount > realDone) setShownCount(realDone);

  useEffect(() => {
    if (shownCount >= realDone) return;
    const timer = setTimeout(() => setShownCount((n) => Math.min(n + 1, realDone)), durations.analysisStageMin);
    return () => clearTimeout(timer);
  }, [shownCount, realDone]);

  const completed = stages.slice(0, shownCount).filter((s) => realCompleted.includes(s));
  const current = shownCount < realDone ? (stages[shownCount] ?? null) : realCurrent;
  const caughtUp = shownCount >= stages.length || (shownCount >= realDone && realDone === stages.length);
  return { completed, current, caughtUp };
}
