import { router } from 'expo-router';
import { Heart, Pencil, Plus, Share2, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ColorDetailSheet, type ColorDetailSheetColor } from '@/components/colors/ColorDetailSheet';
import { ColorPaletteCard } from '@/components/colors/ColorPaletteCard';
import { ColorSwatch } from '@/components/colors/ColorSwatch';
import { EditorialHeader } from '@/components/layout/EditorialHeader';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SavedOutfitCard } from '@/components/outfits/SavedOutfitCard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormField } from '@/components/ui/FormField';
import { ListRow } from '@/components/ui/ListRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
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
import { sharePalette } from '@/features/outfits/share';
import { usePreferencesStore } from '@/store/preferencesStore';
import { palette } from '@/theme/colors';
import { enterUp } from '@/theme/motion';
import { layout, spacing } from '@/theme/spacing';
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

function PaletteActions({ target, onClose }: { target: SavedPalette | null; onClose: () => void }) {
  const update = useUpdatePalette();
  const remove = useDeletePalette();
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const close = () => {
    setRenaming(null);
    onClose();
  };

  return (
    <>
      <BottomSheet visible={target !== null && !confirmDelete} onClose={close} eyebrow="Palette" title={target?.name ?? ''}>
        {target ? (
          renaming !== null ? (
            <View style={styles.sheetBody}>
              <FormField label="Name" value={renaming} onChangeText={setRenaming} maxLength={60} autoFocus returnKeyType="done" />
              <PrimaryButton
                label="Save name"
                loading={update.isPending}
                disabled={!renaming.trim()}
                onPress={() =>
                  update.mutate(
                    { id: target.id, patch: { name: renaming.trim() } },
                    {
                      onSuccess: () => {
                        toast.success('Renamed');
                        close();
                      },
                      onError: (e) => toast.error(friendlyError(e).body),
                    },
                  )
                }
              />
            </View>
          ) : (
            <View>
              {target.analysisId ? (
                <ListRow title="Open palette" subtitle="Explore colours, variants and outfits" onPress={() => {
                    close();
                    router.push(`/palette/${target.analysisId}`);
                  }} />
              ) : null}
              <ListRow title="Rename" icon={Pencil} onPress={() => setRenaming(target.name)} />
              <ListRow
                title={target.isFavorite ? 'Remove from favourites' : 'Mark as favourite'}
                icon={Heart}
                onPress={() => update.mutate({ id: target.id, patch: { isFavorite: !target.isFavorite } }, { onSuccess: close })}
              />
              <ListRow title="Share" icon={Share2} onPress={() => void sharePalette(target.name, target.colors)} />
              <ListRow title="Delete palette" icon={Trash2} destructive last onPress={() => setConfirmDelete(true)} />
            </View>
          )
        ) : null}
      </BottomSheet>
      <ConfirmationModal
        visible={confirmDelete}
        title="Delete this palette?"
        message="The palette is removed from your collection. Your analysis results are kept."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          target &&
          remove.mutate(target.id, {
            onSuccess: () => {
              toast.show('Palette deleted');
              setConfirmDelete(false);
              close();
            },
            onError: (e) => toast.error(friendlyError(e).body),
          })
        }
      />
    </>
  );
}

function NewCollectionSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const favorites = useFavoriteColors();
  const save = useSavePalette();
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const { width } = useWindowDimensions();
  const size = Math.floor((Math.min(width, 560) - layout.screenPaddingX * 2 - spacing[3] * 3) / 4);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const create = () => {
    const colors = (favorites.data ?? []).filter((f) => picked.includes(f.id)).map((f) => ({ name: f.name, hex: f.hex }));
    save.mutate(
      { name: name.trim(), analysisId: null, kind: 'custom', colors },
      {
        onSuccess: () => {
          toast.success('Collection created');
          setName('');
          setPicked([]);
          onClose();
        },
        onError: (e) => toast.error(friendlyError(e).body),
      },
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      eyebrow="Custom collection"
      title="New collection"
      footer={<PrimaryButton label="Create collection" onPress={create} loading={save.isPending} disabled={!name.trim() || picked.length === 0} fullWidth />}>
      <FormField label="Name" placeholder="e.g. Wedding guest" value={name} onChangeText={setName} maxLength={60} />
      <Text variant="eyebrow" tone="secondary">
        Choose from your favourite colours
      </Text>
      {favorites.data?.length ? (
        <View style={styles.pickGrid}>
          {favorites.data.map((f) => (
            <ColorSwatch key={f.id} name={f.name} hex={f.hex} size={size} selected={picked.includes(f.id)} onPress={() => toggle(f.id)} showHex={false} />
          ))}
        </View>
      ) : (
        <Text variant="bodyS" tone="secondary">
          Favourite some colours from a palette first — they’ll appear here.
        </Text>
      )}
    </BottomSheet>
  );
}

export default function MyColorsScreen() {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('palettes');
  const [paletteTarget, setPaletteTarget] = useState<SavedPalette | null>(null);
  const [detail, setDetail] = useState<(ColorDetailSheetColor & { favoriteId: string; analysisId: string | null }) | null>(null);
  const [newCollection, setNewCollection] = useState(false);
  const palettes = usePalettes();
  const favorites = useFavoriteColors();
  const savedOutfits = useSavedOutfits();
  const removeOutfit = useRemoveSavedOutfit();
  const toggleFavorite = useToggleFavoriteColor();
  const recent = usePreferencesStore((s) => s.recentlyViewed);
  const clearRecent = usePreferencesStore((s) => s.clearRecentlyViewed);
  const columnWidth = Math.floor((Math.min(width, layout.maxContentWidth) - layout.screenPaddingX * 2 - spacing[4]) / 2);
  const swatchSize = Math.floor((Math.min(width, layout.maxContentWidth) - layout.screenPaddingX * 2 - spacing[3] * 2) / 3);

  const counts = [
    pluralize(palettes.data?.length ?? 0, 'palette'),
    pluralize(favorites.data?.length ?? 0, 'colour'),
    pluralize(savedOutfits.data?.length ?? 0, 'outfit'),
  ].join(' · ');

  const renderPalettes = () => {
    if (palettes.isLoading) return <LoadingState label="Loading palettes" />;
    if (palettes.error) return <ErrorState error={palettes.error} onRetry={() => void palettes.refetch()} compact />;
    return (
      <>
        <TextButton label="New custom collection" icon={Plus} onPress={() => setNewCollection(true)} />
        {palettes.data?.length ? (
          <View style={styles.grid}>
            {palettes.data.map((p, i) => (
              <Animated.View key={p.id} entering={enterUp(i)}>
                <ColorPaletteCard
                  name={p.name}
                  colors={p.colors}
                  createdAt={p.createdAt}
                  isFavorite={p.isFavorite}
                  subtitle={p.kind === 'custom' ? `Custom · ${p.colors.length} colours` : undefined}
                  width={columnWidth}
                  onPress={() => setPaletteTarget(p)}
                  onLongPress={() => setPaletteTarget(p)}
                />
              </Animated.View>
            ))}
          </View>
        ) : (
          <EmptyState
            title="No palettes yet"
            body="Run an analysis and save your palette — or build a custom collection from favourite colours."
            actionLabel="Analyze my look"
            onAction={() => router.push('/camera')}
          />
        )}
      </>
    );
  };

  const renderFavorites = () => {
    if (favorites.isLoading) return <LoadingState label="Loading colours" />;
    if (favorites.error) return <ErrorState error={favorites.error} onRetry={() => void favorites.refetch()} compact />;
    if (!favorites.data?.length) {
      return <EmptyState title="No favourite colours" body="Tap the heart on any colour in your palette to keep it here." accent={palette.sky} />;
    }
    return (
      <View style={styles.swatchGrid}>
        {favorites.data.map((f, i) => (
          <Animated.View key={f.id} entering={enterUp(i)}>
            <ColorSwatch
              name={f.name}
              hex={f.hex}
              size={swatchSize}
              variant="tile"
              onPress={() => setDetail({ name: f.name, hex: f.hex, favoriteId: f.id, analysisId: f.analysisId })}
            />
          </Animated.View>
        ))}
      </View>
    );
  };

  const renderOutfits = () => {
    if (savedOutfits.isLoading) return <LoadingState label="Loading wardrobe" />;
    if (savedOutfits.error) return <ErrorState error={savedOutfits.error} onRetry={() => void savedOutfits.refetch()} compact />;
    if (!savedOutfits.data?.length) {
      return (
        <EmptyState
          title="Your wardrobe is empty"
          body="Save outfits from the gallery to plan what to wear."
          actionLabel="Browse outfits"
          onAction={() => router.push('/outfits')}
          accent={palette.teal}
        />
      );
    }
    return (
      <View style={styles.grid}>
        {savedOutfits.data.map((s) => (
          <SavedOutfitCard
            key={s.id}
            saved={s}
            width={columnWidth}
            onOpen={(outfitId, analysisId) => router.push({ pathname: '/outfit/[outfitId]', params: { outfitId, analysisId: analysisId ?? 'editorial' } })}
            onRemove={() =>
              removeOutfit.mutate(s.id, { onSuccess: () => toast.show('Removed from wardrobe'), onError: (e) => toast.error(friendlyError(e).body) })
            }
          />
        ))}
      </View>
    );
  };

  const renderRecent = () => {
    if (!recent.length) {
      return <EmptyState title="Nothing viewed yet" body="Colours and outfits you open appear here (stored on this device only)." accent={palette.lilac} compact />;
    }
    return (
      <View>
        {recent.map((r, i) => (
          <ListRow
            key={`${r.kind}-${r.id}`}
            title={r.label}
            subtitle={`${r.kind === 'color' ? 'Colour' : 'Outfit'} · ${formatRelative(r.at)}`}
            trailing={<View style={[styles.recentDot, { backgroundColor: r.hex }]} />}
            last={i === recent.length - 1}
          />
        ))}
        <TextButton label="Clear recently viewed" onPress={clearRecent} />
      </View>
    );
  };

  return (
    <ScreenContainer scroll withTabBar>
      <EditorialHeader eyebrow="Collection" title="My Colors" deck={counts} />
      <SegmentedControl options={TABS} value={tab} onChange={setTab} accessibilityLabel="Collection sections" />
      <View style={styles.body}>
        {tab === 'palettes' ? renderPalettes() : tab === 'favorites' ? renderFavorites() : tab === 'outfits' ? renderOutfits() : renderRecent()}
      </View>

      <PaletteActions target={paletteTarget} onClose={() => setPaletteTarget(null)} />
      <NewCollectionSheet visible={newCollection} onClose={() => setNewCollection(false)} />
      <ColorDetailSheet
        color={detail}
        onClose={() => setDetail(null)}
        isFavorite
        onToggleFavorite={() =>
          detail &&
          toggleFavorite.mutate(
            { name: detail.name, hex: detail.hex, analysisId: detail.analysisId, favoriteId: detail.favoriteId },
            {
              onSuccess: () => {
                toast.show('Removed from favourites');
                setDetail(null);
              },
            },
          )
        }
        onShowOutfits={
          detail?.analysisId
            ? () => {
                const analysisId = detail.analysisId as string;
                setDetail(null);
                router.push({ pathname: '/gallery/[analysisId]', params: { analysisId, color: detail.hex } });
              }
            : undefined
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: spacing[6], gap: spacing[4] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  pickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], rowGap: spacing[4] },
  sheetBody: { gap: spacing[4] },
  recentDot: { width: 24, height: 24, borderWidth: 1, borderColor: palette.navy },
});
