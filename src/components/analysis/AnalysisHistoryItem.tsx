import { Trash2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { PaletteStrip } from '@/components/colors/PaletteStrip';
import { PortraitFrame } from '@/components/outfits/PortraitFrame';
import { Badge, ProvenanceBadge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { usePortraitUri } from '@/features/data/queries';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import type { AnalysisSession } from '@/types/domain';
import { formatDate } from '@/utils/format';

interface AnalysisHistoryItemProps {
  session: AnalysisSession;
  savedOutfitCount: number;
  onOpen: () => void;
  onDelete: () => void;
}

const LOCATION_LABEL = { device: 'Portrait on this device', cloud: 'Portrait in private cloud', deleted: 'Portrait deleted' } as const;

export function AnalysisHistoryItem({ session, savedOutfitCount, onOpen, onDelete }: AnalysisHistoryItemProps) {
  const portraitUri = usePortraitUri(session);
  const result = session.result;
  const kind = result?.isDemo ? 'demo' : session.provider === 'remote' ? 'remote' : 'device';

  return (
    <View style={styles.card}>
      <PressableScale
        onPress={onOpen}
        disabled={!result}
        pressedScale={0.98}
        accessibilityRole="button"
        accessibilityLabel={`Analysis from ${formatDate(session.createdAt)}. ${result?.headline ?? session.status}`}
        accessibilityHint="Reopens the results"
        style={styles.row}>
        <PortraitFrame uri={session.portrait.location === 'deleted' ? null : (portraitUri ?? undefined)} width={76} shadow="none" />
        <View style={styles.copy}>
          <Text variant="eyebrow" tone="secondary">
            {formatDate(session.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
          <Text variant="label" numberOfLines={2}>
            {result?.headline ?? (session.status === 'failed' ? 'Analysis failed' : 'Incomplete analysis')}
          </Text>
          {result ? <PaletteStrip colors={result.recommendedColors.slice(0, 6)} height={18} /> : null}
          <View style={styles.badges}>
            <ProvenanceBadge kind={kind} />
            {savedOutfitCount ? <Badge label={`${savedOutfitCount} saved`} /> : null}
          </View>
          <Text variant="caption" tone="secondary">
            {LOCATION_LABEL[session.portrait.location]}
          </Text>
        </View>
      </PressableScale>
      <IconButton icon={Trash2} accessibilityLabel={`Delete analysis from ${formatDate(session.createdAt)}`} onPress={onDelete} size={40} iconSize={18} style={styles.delete} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.paper, borderWidth: 1.5, borderColor: palette.navy },
  row: { flexDirection: 'row', gap: spacing[4], padding: spacing[3], paddingRight: spacing[12] },
  copy: { flex: 1, gap: spacing[2] },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  delete: { position: 'absolute', top: spacing[2], right: spacing[2] },
});
