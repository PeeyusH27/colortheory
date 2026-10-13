'use client';

import { useState } from 'react';

import { PaletteStrip } from '@/components/colors/PaletteStrip';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import type { AnalysisAdjustments, ColorAnalysisResult } from '@/types/domain';

import { adjustResult } from './adjustResult';

type Step = '-1' | '0' | '1';

interface AdjustSheetProps {
  open: boolean;
  result: ColorAnalysisResult;
  saving: boolean;
  onClose: () => void;
  onSave: (adjustments: AnalysisAdjustments) => void;
}

/**
 * "Disagree with the result" control. Users nudge temperature and depth; the palette preview
 * updates live from the deterministic engine before anything is saved.
 */
export function AdjustSheet({ open, result, saving, onClose, onSave }: AdjustSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Adjust your palette" description="Your eye has the final say">
      {/* Remount on open so the controls start from the saved adjustments. */}
      {open ? <AdjustBody result={result} saving={saving} onSave={onSave} /> : null}
    </Sheet>
  );
}

function AdjustBody({ result, saving, onSave }: Pick<AdjustSheetProps, 'result' | 'saving' | 'onSave'>) {
  const [warmth, setWarmth] = useState<Step>(String(Math.sign(result.adjustments.warmth)) as Step);
  const [depth, setDepth] = useState<Step>(String(Math.sign(result.adjustments.depth)) as Step);
  const adjustments = { warmth: Number(warmth), depth: Number(depth) };
  const preview = adjustResult(result, adjustments);

  return (
    <div className="flex flex-col gap-6">
      <p className="type-body-s text-muted">
        Photos shift colour. If the result feels off — say, you know cool pinks wash you out — nudge it here. Your original estimate is
        kept.
      </p>
      <div className="flex flex-col gap-2">
        <span className="type-eyebrow text-muted">Temperature</span>
        <SegmentedControl
          label="Temperature adjustment"
          value={warmth}
          onChange={setWarmth}
          options={[
            { value: '-1', label: 'Cooler' },
            { value: '0', label: 'As estimated' },
            { value: '1', label: 'Warmer' },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="type-eyebrow text-muted">Depth</span>
        <SegmentedControl
          label="Depth adjustment"
          value={depth}
          onChange={setDepth}
          options={[
            { value: '-1', label: 'Lighter' },
            { value: '0', label: 'As estimated' },
            { value: '1', label: 'Deeper' },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2" aria-live="polite">
        <span className="type-eyebrow text-muted">Preview</span>
        <p className="type-h3 text-navy">{preview.headline}</p>
        <PaletteStrip colors={preview.recommendedColors} height={48} />
      </div>
      <Button fullWidth size="lg" loading={saving} onClick={() => onSave(adjustments)}>
        Save adjustments
      </Button>
    </div>
  );
}
