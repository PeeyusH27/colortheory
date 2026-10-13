import { CircleCheck, CircleAlert, Info, TriangleAlert } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, palette } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import type { ImageQualityReport } from '@/types/domain';

interface ImageQualityNoticeProps {
  report: ImageQualityReport | null;
  loading?: boolean;
  inverse?: boolean;
}

const SEVERITY = {
  blocking: { icon: CircleAlert, color: palette.coral, label: 'Needs a retake' },
  warning: { icon: TriangleAlert, color: palette.saffron, label: 'May affect accuracy' },
  info: { icon: Info, color: palette.sky, label: 'Note' },
} as const;

/**
 * Plain-language photo quality feedback, measured on the device before anything is uploaded.
 * We say when a photo isn't good enough instead of producing confident-looking results from it.
 */
export function ImageQualityNotice({ report, loading, inverse = true }: ImageQualityNoticeProps) {
  const fg = inverse ? palette.cream : palette.navy;
  const sub = inverse ? 'rgba(247,243,236,0.75)' : colors.text.secondary;

  if (loading || !report) {
    return (
      <View style={styles.box} accessibilityLiveRegion="polite">
        <Text variant="label" color={fg}>
          Checking photo quality on your device…
        </Text>
      </View>
    );
  }

  const score = Math.round(report.score * 100);
  const segments = 10;
  const filled = Math.round(report.score * segments);
  const meterColor = report.score >= 0.75 ? palette.sage : report.score >= 0.45 ? palette.saffron : palette.coral;

  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <View style={styles.header}>
        <Text variant="eyebrow" color={sub}>
          Photo quality
        </Text>
        <Text variant="numeric" color={fg} accessibilityLabel={`Photo quality ${score} out of 100`}>
          {score}/100
        </Text>
      </View>
      <View style={styles.meter} accessibilityElementsHidden>
        {Array.from({ length: segments }, (_, i) => (
          <View key={i} style={[styles.segment, { backgroundColor: i < filled ? meterColor : 'rgba(247,243,236,0.18)' }]} />
        ))}
      </View>
      {report.issues.length === 0 ? (
        <View style={styles.issue}>
          <CircleCheck size={18} color={palette.sage} />
          <Text variant="bodyS" color={fg} style={styles.flex}>
            Even light, clear face area, no strong colour cast. Good to go.
          </Text>
        </View>
      ) : (
        report.issues.map((issue) => {
          const s = SEVERITY[issue.severity];
          const Icon = s.icon;
          return (
            <View key={issue.code} style={styles.issue} accessible accessibilityLabel={`${s.label}: ${issue.message}`}>
              <Icon size={18} color={s.color} />
              <Text variant="bodyS" color={fg} style={styles.flex}>
                {issue.message}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing[3], padding: spacing[4], borderRadius: radii.md, backgroundColor: 'rgba(247,243,236,0.07)', borderWidth: 1, borderColor: 'rgba(247,243,236,0.14)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meter: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 6, borderRadius: 1 },
  issue: { flexDirection: 'row', gap: spacing[2], alignItems: 'flex-start' },
  flex: { flex: 1 },
});
