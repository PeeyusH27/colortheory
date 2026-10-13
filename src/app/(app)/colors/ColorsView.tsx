'use client';

import { Camera, ExternalLink, Heart, Pencil, Plus, Share2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ColorDetailSheet, type ColorDetailSheetColor } from '@/components/colors/ColorDetailSheet';
import { ColorPaletteCard } from '@/components/colors/ColorPaletteCard';
import { ColorSwatch } from '@/components/colors/ColorSwatch';
import { PageHeader } from '@/components/layout/PageHeader';
import { SavedOutfitCard } from '@/components/outfits/SavedOutfitCard';
import { Button, LinkButton } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormField } from '@/components/ui/FormField';
import { IconButton, IconLink } from '@/components/ui/IconButton';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Tabs } from '@/components/ui/Tabs';
import { toast } from '@/components/ui/Toast';
import {
  useDeletePalette,
  useFavoriteColors,
  usePalettes,
  useRemoveSavedOutfit,
  useSavedOutfits,
  useSavePalette,
  useToggleFavoriteColor,
  useUpdatePalette,
} from '@/features/data/queries';
import { useShare } from '@/features/outfits/useShareOutfit';
import { routes } from '@/lib/routes';
import { useClientValue } from '@/lib/useClientValue';
import { usePreferencesStore } from '@/store/preferencesStore';
import { staggerStyle } from '@/theme/motion';
import type { SavedPalette } from '@/types/domain';
import { friendlyError } from '@/utils/errors';
import { formatRelative, pluralize } from '@/utils/format';

type Tab = 'palettes' | 'favorites' | 'outfits' | 'recent';
const TABS = [
  { value: 'palettes', label: 'Palettes' },
  { value: 'favorites', label: 'Colours' },
  { value: 'outfits', label: 'Outfits' },
  { value: 'recent', label: 'Recent' },
] as const;

function RenameSheet({ target, onClose }: { target: SavedPalette | null; onClose: () => void }) {
  return (
    <Sheet open={target !== null} onClose={onClose} title="Rename palette" size="sm">
      {target ? <RenameForm target={target} onDone={onClose} /> : null}
    </Sheet>
  );
}

function RenameForm({ target, onDone }: { target: SavedPalette; onDone: () => void }) {
  const update = useUpdatePalette();
  const [name, setName] = useState(target.name);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        update.mutate(
          { id: target.id, patch: { name: name.trim() } },
          {
            onSuccess: () => {
              toast.success('Renamed');
              onDone();
            },
            onError: (err) => toast.error(friendlyError(err).body),
          },
        );
      }}>
      <FormField label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
      <Button type="submit" loading={update.isPending} disabled={!name.trim()}>
        Save name
      </Button>
    </form>
  );
}

function NewCollectionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="New collection" description="Custom collection from your favourite colours">
      {open ? <NewCollectionForm onDone={onClose} /> : null}
    </Sheet>
  );
}

function NewCollectionForm({ onDone }: { onDone: () => void }) {
  const favorites = useFavoriteColors();
  const save = useSavePalette();
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const colors = (favorites.data ?? []).filter((f) => picked.includes(f.id)).map((f) => ({ name: f.name, hex: f.hex }));
        save.mutate(
          { name: name.trim(), analysisId: null, kind: 'custom', colors },
          {
            onSuccess: () => {
              toast.success('Collection created');
              onDone();
            },
            onError: (err) => toast.error(friendlyError(err).body),
          },
        );
      }}>
      <FormField label="Name" placeholder="e.g. Wedding guest" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      <fieldset className="flex flex-col gap-3">
        <legend className="type-eyebrow mb-3 text-muted">Choose from your favourite colours</legend>
        {favorites.data?.length ? (
          <ul className="grid grid-cols-4 gap-3 sm:grid-cols-5">
            {favorites.data.map((f) => (
              <li key={f.id}>
                <ColorSwatch name={f.name} hex={f.hex} selected={picked.includes(f.id)} onClick={() => toggle(f.id)} showHex={false} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-body-s text-muted">Favourite some colours from a palette first — they’ll appear here.</p>
        )}
      </fieldset>
      <Button type="submit" loading={save.isPending} disabled={!name.trim() || picked.length === 0}>
        Create collection
      </Button>
    </form>
  );
}

export function ColorsView() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('palettes');
  const [renameTarget, setRenameTarget] = useState<SavedPalette | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedPalette | null>(null);
  const [detail, setDetail] = useState<(ColorDetailSheetColor & { favoriteId: string; analysisId: string | null }) | null>(null);
  const [newCollection, setNewCollection] = useState(false);
  const palettes = usePalettes();
  const favorites = useFavoriteColors();
  const savedOutfits = useSavedOutfits();
  const removeOutfit = useRemoveSavedOutfit();
  const update = useUpdatePalette();
  const remove = useDeletePalette();
  const toggleFavorite = useToggleFavoriteColor();
  const share = useShare();
  const recent = usePreferencesStore((s) => s.recentlyViewed);
  const clearRecent = usePreferencesStore((s) => s.clearRecentlyViewed);
  const now = useClientValue(() => Date.now(), 0);

  const counts = [
    pluralize(palettes.data?.length ?? 0, 'palette'),
    pluralize(favorites.data?.length ?? 0, 'colour'),
    pluralize(savedOutfits.data?.length ?? 0, 'outfit'),
  ].join(' · ');

  const renderPalettes = () => {
    if (palettes.isPending) return <LoadingState label="Loading palettes" />;
    if (palettes.error) return <ErrorState error={palettes.error} onRetry={() => void palettes.refetch()} compact />;
    return (
      <div className="flex flex-col gap-5">
        <Button variant="secondary" icon={Plus} className="self-start" onClick={() => setNewCollection(true)}>
          New custom collection
        </Button>
        {palettes.data?.length ? (
          <ul className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {palettes.data.map((p, i) => (
              <li key={p.id} className="animate-enter-up" style={staggerStyle(i)}>
                <ColorPaletteCard
                  name={p.name}
                  colors={p.colors}
                  createdAt={p.createdAt}
                  isFavorite={p.isFavorite}
                  subtitle={p.kind === 'custom' ? `Custom · ${p.colors.length} colours` : undefined}
                  className="h-full"
                  actions={
                    <>
                      {p.analysisId ? <IconLink icon={ExternalLink} label={`Open ${p.name}`} href={routes.palette(p.analysisId)} size={36} iconSize={16} /> : null}
                      <IconButton icon={Pencil} label={`Rename ${p.name}`} onClick={() => setRenameTarget(p)} size={36} iconSize={16} />
                      <IconButton
                        icon={Heart}
                        label={p.isFavorite ? `Remove ${p.name} from favourites` : `Mark ${p.name} as favourite`}
                        pressed={p.isFavorite}
                        onClick={() => update.mutate({ id: p.id, patch: { isFavorite: !p.isFavorite } }, { onError: (e) => toast.error(friendlyError(e).body) })}
                        size={36}
                        iconSize={16}
                      />
                      <IconButton icon={Share2} label={`Share ${p.name}`} onClick={() => share.palette(p.name, p.colors)} size={36} iconSize={16} />
                      <IconButton icon={Trash2} label={`Delete ${p.name}`} onClick={() => setDeleteTarget(p)} size={36} iconSize={16} className="ml-auto" />
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No palettes yet"
            body="Run an analysis and save your palette — or build a custom collection from favourite colours."
            action={
              <LinkButton href="/analyze" icon={Camera}>
                Analyze my look
              </LinkButton>
            }
          />
        )}
      </div>
    );
  };

  const renderFavorites = () => {
    if (favorites.isPending) return <LoadingState label="Loading colours" />;
    if (favorites.error) return <ErrorState error={favorites.error} onRetry={() => void favorites.refetch()} compact />;
    if (!favorites.data?.length) {
      return <EmptyState icon={Heart} title="No favourite colours" body="Use the heart on any colour in your palette to keep it here." />;
    }
    return (
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {favorites.data.map((f, i) => (
          <li key={f.id} className="animate-enter-up" style={staggerStyle(i)}>
            <ColorSwatch name={f.name} hex={f.hex} variant="tile" onClick={() => setDetail({ name: f.name, hex: f.hex, favoriteId: f.id, analysisId: f.analysisId })} />
          </li>
        ))}
      </ul>
    );
  };

  const renderOutfits = () => {
    if (savedOutfits.isPending) return <LoadingState label="Loading wardrobe" />;
    if (savedOutfits.error) return <ErrorState error={savedOutfits.error} onRetry={() => void savedOutfits.refetch()} compact />;
    if (!savedOutfits.data?.length) {
      return (
        <EmptyState
          title="Your wardrobe is empty"
          body="Save outfits from the gallery to plan what to wear."
          action={
            <LinkButton href="/outfits" variant="secondary">
              Browse outfits
            </LinkButton>
          }
        />
      );
    }
    return (
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {savedOutfits.data.map((s) => (
          <li key={s.id}>
            <SavedOutfitCard
              saved={s}
              onRemove={() => removeOutfit.mutate(s.id, { onSuccess: () => toast.show('Removed from wardrobe'), onError: (e) => toast.error(friendlyError(e).body) })}
            />
          </li>
        ))}
      </ul>
    );
  };

  const renderRecent = () => {
    if (!recent.length) {
      return <EmptyState title="Nothing viewed yet" body="Colours and outfits you open appear here (stored in this browser only)." />;
    }
    return (
      <div className="flex flex-col gap-4">
        <ListGroup label="Recently viewed">
          {recent.map((r) => (
            <ListRow
              key={`${r.kind}-${r.id}`}
              title={r.label}
              description={`${r.kind === 'color' ? 'Colour' : 'Outfit'}${now ? ` · ${formatRelative(r.at, now)}` : ''}`}
              trailing={<span aria-hidden className="size-7 shrink-0 border border-navy/30" style={{ backgroundColor: r.hex }} />}
            />
          ))}
        </ListGroup>
        <Button variant="ghost" className="self-start" onClick={clearRecent}>
          Clear recently viewed
        </Button>
      </div>
    );
  };

  return (
    <div className="page flex flex-col gap-6">
      <PageHeader eyebrow="Collection" title="My Colors" subtitle={palettes.isPending ? ' ' : counts} />
      <Tabs label="Collection sections" tabs={TABS} value={tab} onChange={setTab}>
        {tab === 'palettes' ? renderPalettes() : tab === 'favorites' ? renderFavorites() : tab === 'outfits' ? renderOutfits() : renderRecent()}
      </Tabs>

      <RenameSheet target={renameTarget} onClose={() => setRenameTarget(null)} />
      <NewCollectionSheet open={newCollection} onClose={() => setNewCollection(false)} />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this palette?"
        body="The palette is removed from your collection. Your analysis results are kept."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget &&
          remove.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.show('Palette deleted');
              setDeleteTarget(null);
            },
            onError: (e) => toast.error(friendlyError(e).body),
          })
        }
      />
      <ColorDetailSheet
        color={detail}
        onClose={() => setDetail(null)}
        isFavorite
        favoritePending={toggleFavorite.isPending}
        onToggleFavorite={() =>
          detail &&
          toggleFavorite.mutate(
            { name: detail.name, hex: detail.hex, analysisId: detail.analysisId, favoriteId: detail.favoriteId },
            {
              onSuccess: () => {
                toast.show('Removed from favourites');
                setDetail(null);
              },
              onError: (e) => toast.error(friendlyError(e).body),
            },
          )
        }
        onShowOutfits={
          detail?.analysisId
            ? () => {
                const analysisId = detail.analysisId as string;
                setDetail(null);
                router.push(`${routes.gallery(analysisId)}?color=${encodeURIComponent(detail.hex)}`);
              }
            : undefined
        }
      />
    </div>
  );
}
