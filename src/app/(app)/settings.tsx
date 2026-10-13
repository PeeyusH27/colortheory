import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  BookOpen,
  Brush,
  Cloud,
  FileText,
  History,
  ImageIcon,
  LogOut,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  UserX,
  Wrench,
} from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EditorialHeader } from '@/components/layout/EditorialHeader';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { ListRow } from '@/components/ui/ListRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { config } from '@/constants/config';
import { deleteAccount, signOut } from '@/features/auth/authService';
import { selectIsDemo, useAuthStore } from '@/features/auth/authStore';
import { useAnalyses, useDeleteAllAnalyses } from '@/features/data/queries';
import { removeAvatar } from '@/features/profile/avatar';
import { useLocalDataStore, useLocalPortraitIndex } from '@/services/data/localDataStore';
import { cleanupOrphanedLocalPortraits, deleteAllLocalPortraits } from '@/services/storage/localFiles';
import { usePreferencesStore } from '@/store/preferencesStore';
import { palette } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { friendlyError } from '@/utils/errors';

type Confirm = 'history' | 'account' | 'demo' | 'signout' | null;

function FlowRow({ icon: Icon, title, body }: { icon: typeof Cloud; title: string; body: string }) {
  return (
    <View style={styles.flow}>
      <Icon size={18} color={palette.denim} />
      <View style={styles.flex}>
        <Text variant="label">{title}</Text>
        <Text variant="bodyS" tone="secondary">
          {body}
        </Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
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

  const wipeDeviceData = () => {
    deleteAllLocalPortraits();
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
        wipeDeviceData();
        await queryClient.invalidateQueries({ queryKey: ['data'] });
        toast.show('Demo data cleared');
      } else if (confirm === 'signout') {
        await signOut();
        queryClient.clear();
      } else if (confirm === 'account') {
        await deleteAccount();
        wipeDeviceData();
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

  const cleanup = () => {
    const referenced = new Set((analyses.data ?? []).map((a) => a.portrait.localUri).filter((u): u is string => Boolean(u)));
    const removed = cleanupOrphanedLocalPortraits(referenced);
    toast.show(removed ? `Removed ${removed} unused file${removed === 1 ? '' : 's'}` : 'No unused files found');
  };

  return (
    <ScreenContainer scroll>
      <EditorialHeader leading="back" eyebrow="Settings" title="Privacy & settings" />

      <View style={styles.section}>
        <SectionHeader title="Where your portrait goes" />
        <View style={styles.flows}>
          <FlowRow icon={Smartphone} title="On-device analysis (default)" body="Your photo is read on this phone. Nothing is uploaded." />
          <FlowRow icon={Cloud} title="Cloud storage (opt-in)" body="Private bucket, readable only by your account. Asked every time before upload." />
          <FlowRow icon={Sparkles} title="Cloud analysis & AI previews (opt-in)" body="Sent from our server to the AI provider via a link that expires in minutes. Results are approximations." />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Portrait storage" subtitle="Default for new analyses. You can still choose per photo." />
        <SegmentedControl
          accessibilityLabel="Default portrait storage"
          value={signedIn ? storage : 'device'}
          onChange={(v) => (signedIn ? setStorage(v) : toast.show('Cloud storage needs an account'))}
          options={[
            { value: 'device', label: 'This device' },
            { value: 'cloud', label: 'Private cloud' },
          ]}
        />
        <ListRow icon={ImageIcon} title="Manage portraits" subtitle="See and delete stored portraits" onPress={() => router.push('/portraits')} last />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Your data" />
        <ListRow icon={History} title="Delete analysis history" subtitle="All sessions, portraits and AI previews" destructive onPress={() => setConfirm('history')} />
        <ListRow icon={Brush} title="Clear recently viewed" onPress={() => {
            clearRecent();
            toast.show('Cleared');
          }} />
        <ListRow icon={Wrench} title="Clean up unused files" subtitle="Removes leftover portrait files on this device" onPress={cleanup} last={!isDemo} />
        {isDemo ? <ListRow icon={Trash2} title="Clear demo data" subtitle="Everything stored on this device" destructive onPress={() => setConfirm('demo')} last /> : null}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Legal" />
        <ListRow icon={ShieldCheck} title="Privacy policy" onPress={() => router.push('/legal/privacy')} />
        <ListRow icon={FileText} title="Terms of service" onPress={() => router.push('/legal/terms')} last />
      </View>

      <View style={styles.section}>
        <SectionHeader title="App" />
        <ListRow icon={BookOpen} title="Revisit the introduction" onPress={() => router.push({ pathname: '/onboarding', params: { revisit: '1' } })} />
        <ListRow title="Motion" subtitle="Animations follow your system Reduce Motion setting." />
        <ListRow title="Version" value={Constants.expoConfig?.version ?? '—'} last />
      </View>

      {__DEV__ ? (
        <View style={styles.section}>
          <SectionHeader title="Developer diagnostics" subtitle="Visible in development builds only." />
          <View style={styles.diag}>
            <Text variant="hex">Supabase: {config.supabase ? 'configured' : 'not configured'}</Text>
            <Text variant="hex">Analysis provider: {config.analysisProvider}</Text>
            <Text variant="hex">Outfit generation: {config.generationProvider}</Text>
            <Text variant="hex">Demo mode offered: {String(config.demoModeEnabled)}</Text>
          </View>
          {config.issues.length ? <InlineAlert tone="warning" title="Configuration issues" message={config.issues.join('\n')} /> : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Account" subtitle={user?.email ?? (isDemo ? 'Demo mode — no account' : undefined)} />
        <ListRow icon={LogOut} title={isDemo ? 'Leave demo mode' : 'Sign out'} onPress={() => setConfirm('signout')} last={!signedIn} />
        {signedIn ? <ListRow icon={UserX} title="Delete account" subtitle="Permanently removes your account and all data" destructive onPress={() => setConfirm('account')} last /> : null}
      </View>

      <ConfirmationModal
        visible={confirm === 'history'}
        title="Delete all history?"
        message="Every analysis is deleted, including portraits on this device and in the cloud, and AI previews. Saved palettes and favourite colours stay."
        confirmLabel="Delete all"
        destructive
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run()}
      />
      <ConfirmationModal
        visible={confirm === 'demo'}
        title="Clear demo data?"
        message="Removes demo analyses, palettes, outfits and portraits stored on this device."
        confirmLabel="Clear"
        destructive
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run()}
      />
      <ConfirmationModal
        visible={confirm === 'signout'}
        title={isDemo ? 'Leave demo mode?' : 'Sign out?'}
        message={isDemo ? 'Demo data stays on this device.' : 'Your data stays in your account.'}
        confirmLabel={isDemo ? 'Leave' : 'Sign out'}
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run()}
      />
      <ConfirmationModal
        visible={confirm === 'account'}
        title="Delete your account?"
        message="This is permanent and can’t be undone."
        details={['Your login and profile', 'All analyses and colour results', 'All portraits and AI previews in cloud storage', 'Saved palettes, favourite colours and outfits', 'Portraits stored on this device']}
        confirmationPhrase="DELETE"
        confirmLabel="Delete account"
        destructive
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing[8], gap: spacing[2] },
  flows: { gap: spacing[4], padding: spacing[4], backgroundColor: palette.paper, borderRadius: radii.md, borderWidth: 1, borderColor: palette.borderWarm },
  flow: { flexDirection: 'row', gap: spacing[3] },
  flex: { flex: 1 },
  diag: { gap: 4, padding: spacing[3], backgroundColor: palette.sand },
});
