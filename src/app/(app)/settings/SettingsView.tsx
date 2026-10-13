'use client';

import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, Brush, Cloud, FileText, History, ImageIcon, LogOut, MonitorSmartphone, ShieldCheck, Sparkles, Trash2, UserX, Wrench, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

import { PageHeader, SectionHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { toast } from '@/components/ui/Toast';
import { config } from '@/constants/config';
import { deleteAccount, signOut } from '@/features/auth/authService';
import { selectIsDemo, useAuthStore } from '@/features/auth/authStore';
import { useAnalyses, useDeleteAllAnalyses } from '@/features/data/queries';
import { removeAvatar } from '@/features/profile/avatar';
import { useLocalDataStore, useLocalPortraitIndex } from '@/services/data/localDataStore';
import { cleanupOrphanedLocalPortraits, deleteAllLocalPortraits, isLocalPortraitRef } from '@/services/storage/localPortraits';
import { usePreferencesStore } from '@/store/preferencesStore';
import { friendlyError } from '@/utils/errors';

type Confirm = 'history' | 'account' | 'demo' | 'signout' | null;

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';

function FlowRow({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <Icon aria-hidden size={18} className="mt-0.5 shrink-0 text-denim" />
      <span className="flex flex-col gap-0.5">
        <span className="type-label text-navy">{title}</span>
        <span className="type-body-s text-muted">{body}</span>
      </span>
    </li>
  );
}

export function SettingsView() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const isDemo = useAuthStore(selectIsDemo);
  const signedIn = status === 'signedIn';
  const storage = usePreferencesStore((s) => s.portraitStorage);
  const setStorage = usePreferencesStore((s) => s.setPortraitStorage);
  const clearRecent = usePreferencesStore((s) => s.clearRecentlyViewed);
  const analyses = useAnalyses();
  const deleteAll = useDeleteAllAnalyses();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);

  const wipeBrowserData = async () => {
    await deleteAllLocalPortraits();
    useLocalPortraitIndex.getState().clear();
    removeAvatar();
    clearRecent();
  };

  const run = async () => {
    setBusy(true);
    try {
      if (confirm === 'history') {
        await deleteAll.mutateAsync();
        toast.show('Analysis history deleted');
      } else if (confirm === 'demo') {
        useLocalDataStore.getState().reset();
        await wipeBrowserData();
        await queryClient.invalidateQueries({ queryKey: ['data'] });
        toast.show('Demo data cleared');
      } else if (confirm === 'signout') {
        await signOut();
        queryClient.clear();
      } else if (confirm === 'account') {
        await deleteAccount();
        await wipeBrowserData();
        queryClient.clear();
        toast.show('Your account and data were deleted.');
      }
      setConfirm(null);
    } catch (e) {
      toast.error(friendlyError(e).body);
    } finally {
      setBusy(false);
    }
  };

  const cleanup = async () => {
    const referenced = new Set<string>();
    for (const a of analyses.data ?? []) if (isLocalPortraitRef(a.portrait.localUri)) referenced.add(a.portrait.localUri);
    // Signed-in users can keep portraits locally too; those are referenced through the index.
    for (const uri of Object.values(useLocalPortraitIndex.getState().uris)) referenced.add(uri);
    const removed = await cleanupOrphanedLocalPortraits(referenced);
    toast.show(removed ? `Removed ${removed} unused image${removed === 1 ? '' : 's'}` : 'No unused images found');
  };

  return (
    <div className="page flex flex-col gap-10">
      <PageHeader back={{ href: '/profile', label: 'Profile' }} eyebrow="Settings" title="Privacy & settings" />

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-10">
          <section aria-labelledby="flow-title" className="flex flex-col gap-4">
            <SectionHeader id="flow-title" title="Where your portrait goes" />
            <ul className="flex flex-col gap-4 rounded-md border-[1.5px] border-navy bg-paper p-5">
              <FlowRow icon={MonitorSmartphone} title="In-browser analysis (default)" body="Your photo is read in this browser. Nothing is uploaded." />
              <FlowRow icon={Cloud} title="Cloud storage (opt-in)" body="Private bucket, readable only by your account. Asked every time before upload." />
              <FlowRow
                icon={Sparkles}
                title="Cloud analysis & AI previews (opt-in)"
                body="Sent from our server to the AI provider via a link that expires in minutes. Results are approximations."
              />
            </ul>
          </section>

          <section aria-labelledby="storage-title" className="flex flex-col gap-4">
            <SectionHeader id="storage-title" title="Portrait storage" description="Default for new analyses. You can still choose per photo." />
            <SegmentedControl
              label="Default portrait storage"
              className="self-start"
              value={signedIn ? storage : 'device'}
              onChange={(v) => (signedIn ? setStorage(v) : toast.show('Cloud storage needs an account'))}
              options={[
                { value: 'device', label: 'This browser' },
                { value: 'cloud', label: 'Private cloud' },
              ]}
            />
            <ListGroup>
              <ListRow icon={ImageIcon} title="Manage portraits" description="See and delete stored portraits" href="/portraits" />
            </ListGroup>
          </section>

          <ListGroup label="Your data">
            <ListRow icon={History} title="Delete analysis history" description="All sessions, portraits and AI previews" destructive onClick={() => setConfirm('history')} />
            <ListRow
              icon={Brush}
              title="Clear recently viewed"
              onClick={() => {
                clearRecent();
                toast.show('Cleared');
              }}
            />
            <ListRow icon={Wrench} title="Clean up unused images" description="Removes leftover portraits stored in this browser" onClick={() => void cleanup()} />
            {isDemo ? <ListRow icon={Trash2} title="Clear demo data" description="Everything stored in this browser" destructive onClick={() => setConfirm('demo')} /> : null}
          </ListGroup>
        </div>

        <div className="flex flex-col gap-10">
          <ListGroup label="Legal">
            <ListRow icon={ShieldCheck} title="Privacy" href={config.legal.privacyUrl ?? '/legal/privacy'} external={Boolean(config.legal.privacyUrl)} />
            <ListRow icon={FileText} title="Terms of service" href={config.legal.termsUrl ?? '/legal/terms'} external={Boolean(config.legal.termsUrl)} />
          </ListGroup>

          <ListGroup label="App">
            <ListRow icon={BookOpen} title="Revisit the introduction" href="/?intro=1" />
            <ListRow title="Motion" description="Animations follow your system “reduce motion” setting." />
            <ListRow title="Version" trailing={<span className="type-numeric text-muted">{APP_VERSION}</span>} />
          </ListGroup>

          {process.env.NODE_ENV !== 'production' ? (
            <section aria-labelledby="diag-title" className="flex flex-col gap-3">
              <SectionHeader id="diag-title" title="Developer diagnostics" description="Visible in development only." />
              <dl className="type-hex grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border-[1.5px] border-line-warm bg-paper p-4 text-[0.75rem] normal-case">
                <dt className="text-muted">Supabase</dt>
                <dd>{config.supabase ? 'configured' : 'not configured'}</dd>
                <dt className="text-muted">Analysis</dt>
                <dd>{config.analysisProvider}</dd>
                <dt className="text-muted">Outfit previews</dt>
                <dd>{config.generationProvider}</dd>
                <dt className="text-muted">Demo offered</dt>
                <dd>{String(config.demoModeEnabled)}</dd>
              </dl>
              {config.issues.length ? (
                <InlineAlert tone="warning" title="Configuration issues">
                  <ul className="list-disc pl-4">
                    {config.issues.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </InlineAlert>
              ) : null}
            </section>
          ) : null}

          <section aria-labelledby="account-title" className="flex flex-col gap-3">
            <SectionHeader id="account-title" title="Account" description={user?.email ?? (isDemo ? 'Demo mode — no account' : undefined)} />
            <ListGroup>
              <ListRow icon={LogOut} title={isDemo ? 'Leave demo mode' : 'Sign out'} onClick={() => setConfirm('signout')} />
              {signedIn ? (
                <ListRow icon={UserX} title="Delete account" description="Permanently removes your account and all data" destructive onClick={() => setConfirm('account')} />
              ) : null}
            </ListGroup>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === 'history'}
        title="Delete all history?"
        body="Every analysis is deleted, including portraits in this browser and in the cloud, and AI previews. Saved palettes and favourite colours stay."
        confirmLabel="Delete all"
        destructive
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run()}
      />
      <ConfirmDialog
        open={confirm === 'demo'}
        title="Clear demo data?"
        body="Removes demo analyses, palettes, outfits and portraits stored in this browser."
        confirmLabel="Clear"
        destructive
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run()}
      />
      <ConfirmDialog
        open={confirm === 'signout'}
        title={isDemo ? 'Leave demo mode?' : 'Sign out?'}
        body={isDemo ? 'Demo data stays in this browser.' : 'Your data stays in your account.'}
        confirmLabel={isDemo ? 'Leave' : 'Sign out'}
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run()}
      />
      <ConfirmDialog
        open={confirm === 'account'}
        title="Delete your account?"
        body="This is permanent and can’t be undone."
        details={[
          'Your login and profile',
          'All analyses and colour results',
          'All portraits and AI previews in cloud storage',
          'Saved palettes, favourite colours and outfits',
          'Portraits stored in this browser',
        ]}
        confirmationPhrase="DELETE"
        confirmLabel="Delete account"
        destructive
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run()}
      />
    </div>
  );
}
