import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BookOpen, Camera, History, ImageIcon, LogOut, Pencil, Settings, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Blob } from '@/components/brand/Blob';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { FormField } from '@/components/ui/FormField';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { ListRow } from '@/components/ui/ListRow';
import { PressableScale } from '@/components/ui/PressableScale';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { signOut, updateDisplayName } from '@/features/auth/authService';
import { selectIsDemo, useAuthStore } from '@/features/auth/authStore';
import { displayNameSchema } from '@/features/auth/schemas';
import { useProfile, useStats } from '@/features/data/queries';
import { pickAvatar, removeAvatar } from '@/features/profile/avatar';
import { usePreferencesStore } from '@/store/preferencesStore';
import { palette } from '@/theme/colors';
import { enterUp } from '@/theme/motion';
import { shadows } from '@/theme/shadows';
import { spacing } from '@/theme/spacing';
import { friendlyError } from '@/utils/errors';
import { pluralize } from '@/utils/format';

function Stat({ value, label }: { value: number | undefined; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value ?? 0} ${label}`}>
      <Text variant="displayL" style={styles.statValue}>
        {value ?? '—'}
      </Text>
      <Text variant="eyebrow" tone="secondary">
        {label}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isDemo = useAuthStore(selectIsDemo);
  const avatarUri = usePreferencesStore((s) => s.avatarUri);
  const profile = useProfile();
  const stats = useStats();
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | undefined>();
  const [savingName, setSavingName] = useState(false);
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const displayName = profile.data?.displayName ?? user?.displayName ?? 'Guest';

  const saveName = async () => {
    const parsed = displayNameSchema.safeParse({ displayName: editingName ?? '' });
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message);
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(parsed.data.displayName);
      await queryClient.invalidateQueries({ queryKey: ['data'] });
      toast.success('Name updated');
      setEditingName(null);
    } catch (e) {
      setNameError(friendlyError(e).body);
    } finally {
      setSavingName(false);
    }
  };

  const doSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      queryClient.clear(); // never leave one account's cached rows around for the next
    } catch (e) {
      toast.error(friendlyError(e).body);
      setSigningOut(false);
      setConfirmSignOut(false);
    }
  };

  return (
    <ScreenContainer scroll withTabBar>
      <View style={styles.blob} pointerEvents="none">
        <Blob seed={67} color={palette.lilac} size={260} />
      </View>
      <Animated.View entering={enterUp(0)} style={styles.header}>
        <PressableScale onPress={() => setAvatarSheet(true)} accessibilityRole="button" accessibilityLabel="Change profile picture">
          <Avatar name={displayName} uri={avatarUri} size={88} />
          <View style={styles.avatarEdit}>
            <Camera size={14} color={palette.cream} />
          </View>
        </PressableScale>
        <View style={styles.identity}>
          <Text variant="eyebrow" tone="secondary">
            Profile
          </Text>
          <Text variant="h1" numberOfLines={2}>
            {displayName}
          </Text>
          {user?.email ? (
            <Text variant="bodyS" tone="secondary" numberOfLines={1}>
              {user.email}
            </Text>
          ) : null}
          {isDemo ? <Badge label="Demo mode · on this device" tone="demo" /> : null}
        </View>
      </Animated.View>

      <Animated.View entering={enterUp(1)} style={[styles.stats, shadows.offsetSmall]}>
        <Stat value={stats.data?.analyses} label="Analyses" />
        <Stat value={stats.data?.palettes} label="Palettes" />
        <Stat value={stats.data?.savedOutfits} label="Outfits" />
      </Animated.View>

      {isDemo ? (
        <InlineAlert
          tone="info"
          title="You’re exploring in demo mode"
          message="Everything is stored on this device only. Create an account to keep your colours across devices."
          style={styles.section}
        />
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Your colours" />
        <ListRow icon={History} title="Analysis history" subtitle={pluralize(stats.data?.analyses ?? 0, 'session')} onPress={() => router.push('/history')} />
        <ListRow icon={ImageIcon} title="Manage portraits" subtitle="See where each portrait is stored and delete it" onPress={() => router.push('/portraits')} />
        <ListRow icon={BookOpen} title="Revisit the introduction" onPress={() => router.push({ pathname: '/onboarding', params: { revisit: '1' } })} last />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Account" />
        {!isDemo ? <ListRow icon={Pencil} title="Display name" value={displayName} onPress={() => {
              setNameError(undefined);
              setEditingName(displayName);
            }} /> : null}
        <ListRow icon={ShieldCheck} title="Privacy & data" subtitle="Portrait storage, AI providers, deletion" onPress={() => router.push('/settings')} />
        <ListRow icon={Settings} title="Settings" onPress={() => router.push('/settings')} />
        <ListRow icon={LogOut} title={isDemo ? 'Leave demo mode' : 'Sign out'} onPress={() => setConfirmSignOut(true)} last />
      </View>

      <BottomSheet visible={editingName !== null} onClose={() => setEditingName(null)} eyebrow="Account" title="Display name">
        <FormField label="Name" value={editingName ?? ''} onChangeText={setEditingName} error={nameError} maxLength={60} autoFocus onSubmitEditing={() => void saveName()} />
        <PrimaryButton label="Save" onPress={() => void saveName()} loading={savingName} fullWidth />
      </BottomSheet>

      <BottomSheet visible={avatarSheet} onClose={() => setAvatarSheet(false)} eyebrow="Profile picture" title="Your photo">
        <Text variant="bodyS" tone="secondary">
          Your profile picture stays on this device. It isn’t uploaded or used for colour analysis.
        </Text>
        <ListRow
          icon={ImageIcon}
          title="Choose from photos"
          onPress={async () => {
            setAvatarSheet(false);
            try {
              await pickAvatar();
            } catch {
              toast.error('We couldn’t use that image.');
            }
          }}
          last={!avatarUri}
        />
        {avatarUri ? <ListRow icon={Trash2} title="Remove picture" destructive onPress={() => {
              removeAvatar();
              setAvatarSheet(false);
            }} last /> : null}
      </BottomSheet>

      <ConfirmationModal
        visible={confirmSignOut}
        title={isDemo ? 'Leave demo mode?' : 'Sign out?'}
        message={
          isDemo
            ? 'Your demo data stays on this device so you can come back to it.'
            : 'Your colours stay safe in your account. Portraits kept on this device remain on this device.'
        }
        confirmLabel={isDemo ? 'Leave' : 'Sign out'}
        loading={signingOut}
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={() => void doSignOut()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', top: -60, right: -90, opacity: 0.5 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[5], paddingTop: spacing[6] },
  avatarEdit: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.cream,
  },
  identity: { flex: 1, gap: spacing[1] },
  stats: {
    flexDirection: 'row',
    marginTop: spacing[8],
    backgroundColor: palette.paper,
    borderWidth: 1.5,
    borderColor: palette.navy,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing[5], gap: spacing[1] },
  statValue: { fontSize: 38, lineHeight: 42 },
  section: { marginTop: spacing[10] },
});
