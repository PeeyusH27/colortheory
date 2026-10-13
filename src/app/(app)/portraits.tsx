import { router } from 'expo-router';
import { Cloud, ImageOff, Smartphone, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EditorialHeader } from '@/components/layout/EditorialHeader';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { PortraitFrame } from '@/components/outfits/PortraitFrame';
import { Badge } from '@/components/ui/Badge';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { LoadingState } from '@/components/ui/LoadingState';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { useAnalyses, useDeletePortrait, usePortraitUri } from '@/features/data/queries';
import { spacing } from '@/theme/spacing';
import type { AnalysisSession } from '@/types/domain';
import { friendlyError } from '@/utils/errors';
import { formatDate } from '@/utils/format';

type Where = 'device' | 'elsewhere' | 'cloud' | 'deleted';

/** Where this portrait actually is, from this phone's point of view. */
function portraitWhere(session: AnalysisSession): Where {
  const { location, localUri, storagePath } = session.portrait;
  if (location === 'cloud' && storagePath) return 'cloud';
  if (location === 'device') return localUri ? 'device' : 'elsewhere';
  return 'deleted';
}

const LOCATION: Record<Where, { label: string; icon: typeof Cloud; tone: 'info' | 'accent' | 'neutral'; body: string }> = {
  device: { label: 'On this device', icon: Smartphone, tone: 'info', body: 'Stored in this app’s private folder on this phone. Never uploaded.' },
  elsewhere: {
    label: 'Not on this device',
    icon: ImageOff,
    tone: 'neutral',
    body: 'Kept only on the phone that took it (or this is a sample analysis without a photo). Nothing is stored in the cloud.',
  },
  cloud: { label: 'Private cloud', icon: Cloud, tone: 'accent', body: 'Stored in your private bucket. Only your account can read it.' },
  deleted: { label: 'Deleted', icon: ImageOff, tone: 'neutral', body: 'The image is gone; colour results are kept.' },
};

function PortraitRow({ session, onDelete }: { session: AnalysisSession; onDelete: () => void }) {
  const uri = usePortraitUri(session);
  const where = portraitWhere(session);
  const loc = LOCATION[where];
  return (
    <View style={styles.row}>
      <PortraitFrame uri={where === 'deleted' ? null : (uri ?? undefined)} width={84} shadow="offsetSmall" />
      <View style={styles.rowCopy}>
        <Text variant="label">{formatDate(session.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        <Badge label={loc.label} icon={loc.icon} tone={loc.tone} />
        <Text variant="caption" tone="secondary">
          {loc.body}
        </Text>
        {where === 'device' || where === 'cloud' ? (
          <SecondaryButton label="Delete portrait" icon={Trash2} iconPosition="leading" tone="destructive" size="sm" onPress={onDelete} />
        ) : null}
      </View>
    </View>
  );
}

export default function PortraitsScreen() {
  const analyses = useAnalyses();
  const deletePortrait = useDeletePortrait();
  const [target, setTarget] = useState<AnalysisSession | 'all' | null>(null);
  const withPortraits = analyses.data?.filter((a) => ['device', 'cloud'].includes(portraitWhere(a))) ?? [];
  const cloudCount = withPortraits.filter((a) => portraitWhere(a) === 'cloud').length;

  const confirm = async () => {
    try {
      if (target === 'all') {
        for (const a of withPortraits) await deletePortrait.mutateAsync(a.id);
        toast.show('All portraits deleted');
      } else if (target) {
        await deletePortrait.mutateAsync(target.id);
        toast.show('Portrait deleted');
      }
      setTarget(null);
    } catch (e) {
      toast.error(friendlyError(e).body);
    }
  };

  return (
    <ScreenContainer scroll>
      <EditorialHeader leading="back" eyebrow="Privacy" title="Your portraits" deck="See exactly where each photo lives — and remove it." />
      <InlineAlert
        tone="info"
        message={`${withPortraits.length} stored · ${cloudCount} in private cloud · ${withPortraits.length - cloudCount} on this device only. AI providers receive a portrait only when you request a cloud analysis or AI preview, via a link that expires in minutes.`}
      />
      {analyses.isLoading ? (
        <LoadingState label="Loading portraits" />
      ) : analyses.error ? (
        <ErrorState error={analyses.error} onRetry={() => void analyses.refetch()} />
      ) : !analyses.data?.length ? (
        <EmptyState title="No portraits stored" body="Portraits from your analyses will be listed here." actionLabel="Back" onAction={() => router.back()} />
      ) : (
        <View style={styles.list}>
          {analyses.data.map((s) => (
            <PortraitRow key={s.id} session={s} onDelete={() => setTarget(s)} />
          ))}
          {withPortraits.length > 1 ? (
            <SecondaryButton label="Delete all portraits" icon={Trash2} iconPosition="leading" tone="destructive" onPress={() => setTarget('all')} fullWidth />
          ) : null}
        </View>
      )}
      <ConfirmationModal
        visible={target !== null}
        title={target === 'all' ? 'Delete all portraits?' : 'Delete this portrait?'}
        message="The image is removed from this device and from cloud storage. Your colour results, palettes and saved outfits stay."
        confirmLabel="Delete"
        destructive
        loading={deletePortrait.isPending}
        onCancel={() => setTarget(null)}
        onConfirm={() => void confirm()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing[6], marginTop: spacing[6] },
  row: { flexDirection: 'row', gap: spacing[4] },
  rowCopy: { flex: 1, gap: spacing[2], alignItems: 'flex-start' },
});
