'use client';

import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, Camera, History, ImageIcon, LogOut, Pencil, Settings, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { useRef, useState } from 'react';

import { Blob } from '@/components/brand/Blob';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Sheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
import { isSupabaseConfigured } from '@/constants/config';
import { signOut, updateDisplayName } from '@/features/auth/authService';
import { selectIsDemo, useAuthStore } from '@/features/auth/authStore';
import { displayNameSchema } from '@/features/auth/schemas';
import { useProfile, useStats } from '@/features/data/queries';
import { removeAvatar, setAvatarFromFile } from '@/features/profile/avatar';
import { usePreferencesStore } from '@/store/preferencesStore';
import { palette } from '@/theme/colors';
import { friendlyError, toAppError } from '@/utils/errors';
import { pluralize } from '@/utils/format';

function Stat({ value, label }: { value: number | undefined; label: string }) {
  return (
    <div className="flex flex-1 flex-col-reverse items-center gap-1 px-2 py-5">
      <dt className="type-eyebrow text-muted">{label}</dt>
      <dd className="type-display-l leading-none text-navy">{value ?? '—'}</dd>
    </div>
  );
}

function NameForm({ initial, onDone }: { initial: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const parsed = displayNameSchema.safeParse({ displayName: name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setSaving(true);
    try {
      await updateDisplayName(parsed.data.displayName);
      await queryClient.invalidateQueries({ queryKey: ['data'] });
      toast.success('Name updated');
      onDone();
    } catch (e) {
      setError(friendlyError(e).body);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}>
      <FormField label="Name" value={name} onChange={(e) => setName(e.target.value)} error={error} maxLength={60} autoFocus autoComplete="name" />
      <Button type="submit" loading={saving}>
        Save
      </Button>
    </form>
  );
}

export function ProfileView() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isDemo = useAuthStore(selectIsDemo);
  const avatarUri = usePreferencesStore((s) => s.avatarUri);
  const profile = useProfile();
  const stats = useStats();
  const avatarInput = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const displayName = profile.data?.displayName ?? user?.displayName ?? 'Guest';

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
    <div className="page relative isolate flex flex-col gap-10 overflow-x-clip">
      <Blob seed={67} color={palette.lilac} className="pointer-events-none absolute -top-10 -right-24 -z-10 w-72 opacity-70" />
      <PageHeader eyebrow="Profile" title={displayName} subtitle={user?.email ?? undefined} />

      <section aria-label="Your profile" className="-mt-4 flex animate-enter-up flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={() => setAvatarSheet(true)}
          aria-label="Change profile picture"
          className="relative rounded-full transition-transform active:scale-95">
          <Avatar name={displayName} src={avatarUri} size={88} />
          <span className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full border-2 border-cream bg-navy text-cream">
            <Camera aria-hidden size={14} />
          </span>
        </button>
        {isDemo ? <Badge label="Demo mode · this browser only" tone="demo" /> : null}
      </section>

      <dl className="editorial-frame flex divide-x divide-line-warm bg-paper shadow-offset-sm sm:max-w-xl">
        <Stat value={stats.data?.analyses} label="Analyses" />
        <Stat value={stats.data?.palettes} label="Palettes" />
        <Stat value={stats.data?.savedOutfits} label="Outfits" />
      </dl>

      {isDemo ? (
        <InlineAlert tone="info" title="You’re exploring in demo mode" className="sm:max-w-xl">
          Everything is stored in this browser only. {isSupabaseConfigured ? 'Create an account to keep your colours across devices.' : ''}
        </InlineAlert>
      ) : null}

      <div className="grid gap-8 md:grid-cols-2">
        <ListGroup label="Your colours">
          <ListRow icon={History} title="Analysis history" description={pluralize(stats.data?.analyses ?? 0, 'session')} href="/history" />
          <ListRow icon={ImageIcon} title="Manage portraits" description="See where each portrait is stored and delete it" href="/portraits" />
          <ListRow icon={BookOpen} title="Revisit the introduction" href="/?intro=1" />
        </ListGroup>

        <ListGroup label="Account">
          {!isDemo ? (
            <ListRow
              icon={Pencil}
              title="Display name"
              description={displayName}
              onClick={() => setEditingName(true)}
            />
          ) : isSupabaseConfigured ? (
            <ListRow icon={UserPlus} title="Create an account" description="Keep your colours across devices" href="/sign-up" />
          ) : null}
          <ListRow icon={ShieldCheck} title="Privacy & data" description="Portrait storage, AI providers, deletion" href="/settings" />
          <ListRow icon={Settings} title="Settings" href="/settings" />
          <ListRow icon={LogOut} title={isDemo ? 'Leave demo mode' : 'Sign out'} onClick={() => setConfirmSignOut(true)} />
        </ListGroup>
      </div>

      <Sheet open={editingName} onClose={() => setEditingName(false)} title="Display name" size="sm">
        {editingName ? <NameForm initial={displayName} onDone={() => setEditingName(false)} /> : null}
      </Sheet>

      <Sheet open={avatarSheet} onClose={() => setAvatarSheet(false)} title="Your photo" description="Profile picture" size="sm">
        <div className="flex flex-col gap-4">
          <p className="type-body-s text-muted">Your profile picture stays in this browser. It isn’t uploaded or used for colour analysis.</p>
          <input
            ref={avatarInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setAvatarSheet(false);
              try {
                await setAvatarFromFile(file);
              } catch (error) {
                toast.error(toAppError(error, 'invalid_image').message);
              }
            }}
          />
          <div className="divide-y divide-line-warm overflow-hidden rounded-md border-[1.5px] border-navy bg-paper">
            <ListRow icon={ImageIcon} title="Choose a photo" onClick={() => avatarInput.current?.click()} />
            {avatarUri ? (
              <ListRow
                icon={Trash2}
                title="Remove picture"
                destructive
                onClick={() => {
                  removeAvatar();
                  setAvatarSheet(false);
                }}
              />
            ) : null}
          </div>
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmSignOut}
        title={isDemo ? 'Leave demo mode?' : 'Sign out?'}
        body={
          isDemo
            ? 'Your demo data stays in this browser so you can come back to it.'
            : 'Your colours stay safe in your account. Portraits kept in this browser remain in this browser.'
        }
        confirmLabel={isDemo ? 'Leave' : 'Sign out'}
        loading={signingOut}
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={() => void doSignOut()}
      />
    </div>
  );
}
