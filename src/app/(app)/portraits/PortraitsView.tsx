'use client';

import { Cloud, ImageOff, MonitorSmartphone, Trash2, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { PortraitFrame } from '@/components/outfits/PortraitFrame';
import { Badge } from '@/components/ui/Badge';
import { Button, LinkButton } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { toast } from '@/components/ui/Toast';
import { useAnalyses, useDeletePortrait, usePortraitUri } from '@/features/data/queries';
import { isLocalPortraitRef } from '@/services/storage/localPortraits';
import type { AnalysisSession } from '@/types/domain';
import { friendlyError } from '@/utils/errors';
import { formatDate } from '@/utils/format';

type Where = 'browser' | 'elsewhere' | 'cloud' | 'deleted';

/** Where this portrait actually is, from this browser's point of view. */
function portraitWhere(session: AnalysisSession): Where {
  const { location, localUri, storagePath } = session.portrait;
  if (location === 'cloud' && storagePath) return 'cloud';
  if (location === 'device') return isLocalPortraitRef(localUri) ? 'browser' : 'elsewhere';
  return 'deleted';
}

const LOCATION: Record<Where, { label: string; icon: LucideIcon; tone: 'info' | 'accent' | 'neutral'; body: string }> = {
  browser: {
    label: 'In this browser',
    icon: MonitorSmartphone,
    tone: 'info',
    body: 'Stored privately in this browser’s site storage. Never uploaded.',
  },
  cloud: {
    label: 'Private cloud',
    icon: Cloud,
    tone: 'accent',
    body: 'In your private storage bucket, readable only by your account. Shown through links that expire in minutes.',
  },
  elsewhere: {
    label: 'Not in this browser',
    icon: ImageOff,
    tone: 'neutral',
    body: 'Kept only in the browser or phone that took it (or this is a sample analysis without a photo). Nothing is stored in the cloud.',
  },
  deleted: {
    label: 'Deleted',
    icon: Trash2,
    tone: 'neutral',
    body: 'The image was removed. Colour results are kept.',
  },
};

function PortraitRow({ session, onDelete }: { session: AnalysisSession; onDelete: () => void }) {
  const uri = usePortraitUri(session);
  const where = portraitWhere(session);
  const loc = LOCATION[where];
  return (
    <li className="flex gap-4 rounded-md border-[1.5px] border-line-warm bg-paper p-3">
      <PortraitFrame uri={where === 'deleted' ? null : (uri ?? undefined)} shadow="offset-sm" alt={`Portrait from ${formatDate(session.createdAt)}`} className="w-20 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <span className="type-label text-navy">{formatDate(session.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <Badge label={loc.label} icon={loc.icon} tone={loc.tone} />
        <p className="type-caption text-muted">{loc.body}</p>
        {where === 'browser' || where === 'cloud' ? (
          <Button variant="ghost" size="sm" icon={Trash2} className="text-error" onClick={onDelete}>
            Delete portrait
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function PortraitsView() {
  const analyses = useAnalyses();
  const deletePortrait = useDeletePortrait();
  const [target, setTarget] = useState<AnalysisSession | 'all' | null>(null);
  const withPortraits = analyses.data?.filter((a) => ['browser', 'cloud'].includes(portraitWhere(a))) ?? [];
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
    <div className="page flex flex-col gap-8">
      <PageHeader back={{ href: '/settings', label: 'Settings' }} eyebrow="Privacy" title="Your portraits" subtitle="See exactly where each photo lives — and remove it." />
      {analyses.data ? (
        <InlineAlert tone="info" role="status">
          {withPortraits.length} stored · {cloudCount} in private cloud · {withPortraits.length - cloudCount} in this browser only. AI providers
          receive a portrait only when you request a cloud analysis or AI preview, via a link that expires in minutes.
        </InlineAlert>
      ) : null}
      {analyses.isPending ? (
        <LoadingState label="Loading portraits" />
      ) : analyses.error ? (
        <ErrorState error={analyses.error} onRetry={() => void analyses.refetch()} />
      ) : !analyses.data.length ? (
        <EmptyState
          icon={ImageOff}
          title="No portraits stored"
          body="Portraits from your analyses will be listed here."
          action={
            <LinkButton href="/settings" variant="secondary">
              Back to settings
            </LinkButton>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          <ul className="grid gap-4 md:grid-cols-2">
            {analyses.data.map((s) => (
              <PortraitRow key={s.id} session={s} onDelete={() => setTarget(s)} />
            ))}
          </ul>
          {withPortraits.length > 1 ? (
            <Button variant="secondary" icon={Trash2} className="self-start text-error" onClick={() => setTarget('all')}>
              Delete all portraits
            </Button>
          ) : null}
        </div>
      )}
      <ConfirmDialog
        open={target !== null}
        title={target === 'all' ? 'Delete all portraits?' : 'Delete this portrait?'}
        body="The image is removed from this browser and from cloud storage. Your colour results, palettes and saved outfits stay."
        confirmLabel="Delete"
        destructive
        loading={deletePortrait.isPending}
        onCancel={() => setTarget(null)}
        onConfirm={() => void confirm()}
      />
    </div>
  );
}
