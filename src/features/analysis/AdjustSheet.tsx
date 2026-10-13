import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PaletteStrip } from '@/components/colors/PaletteStrip';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/spacing';
import type { AnalysisAdjustments, ColorAnalysisResult } from '@/types/domain';

import { adjustResult } from './adjustResult';

type Step = '-1' | '0' | '1';

interface AdjustSheetProps {
  visible: boolean;
  result: ColorAnalysisResult;
  saving: boolean;
  onClose: () => void;
  onSave: (adjustments: AnalysisAdjustments) => void;
}

/**
 * "Disagree with the result" control. Users nudge temperature and depth; the palette preview
 * updates live from the deterministic engine before anything is saved.
 */
export function AdjustSheet({ visible, result, saving, onClose, onSave }: AdjustSheetProps) {
  const [warmth, setWarmth] = useState<Step>(String(Math.sign(result.adjustments.warmth)) as Step);
  const [depth, setDepth] = useState<Step>(String(Math.sign(result.adjustments.depth)) as Step);
  const adjustments = { warmth: Number(warmth), depth: Number(depth) };
  const preview = adjustResult(result, adjustments);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      eyebrow="Your eye has the final say"
      title="Adjust your palette"
      footer={<PrimaryButton label="Save adjustments" loading={saving} onPress={() => onSave(adjustments)} fullWidth />}>
      <Text variant="bodyS" tone="secondary">
        Photos shift colour. If the result feels off — say, you know cool pinks wash you out — nudge it here. Your original estimate is kept.
      </Text>
      <View style={styles.group}>
        <Text variant="eyebrow" tone="secondary">
          Temperature
        </Text>
        <SegmentedControl
          accessibilityLabel="Temperature adjustment"
          value={warmth}
          onChange={setWarmth}
          options={[
            { value: '-1', label: 'Cooler' },
            { value: '0', label: 'As estimated' },
            { value: '1', label: 'Warmer' },
          ]}
        />
      </View>
      <View style={styles.group}>
        <Text variant="eyebrow" tone="secondary">
          Depth
        </Text>
        <SegmentedControl
          accessibilityLabel="Depth adjustment"
          value={depth}
          onChange={setDepth}
          options={[
            { value: '-1', label: 'Lighter' },
            { value: '0', label: 'As estimated' },
            { value: '1', label: 'Deeper' },
          ]}
        />
      </View>
      <View style={styles.group}>
        <Text variant="eyebrow" tone="secondary">
          Preview
        </Text>
        <Text variant="h3">{preview.headline}</Text>
        <PaletteStrip colors={preview.recommendedColors} height={48} labeled />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing[2] },
});
