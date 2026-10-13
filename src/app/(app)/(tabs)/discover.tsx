import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowRight, Camera, ImagePlus } from 'lucide-react-native';
import { FlatList, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Blob } from '@/components/brand/Blob';
import { ColorPaletteCard } from '@/components/colors/ColorPaletteCard';
import { CombinationCard } from '@/components/colors/CombinationCard';
import { PaletteStrip } from '@/components/colors/PaletteStrip';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { OutfitCarousel } from '@/components/outfits/OutfitCarousel';
import { PortraitFrame } from '@/components/outfits/PortraitFrame';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, ProvenanceBadge } from '@/components/ui/Badge';
import { PressableScale } from '@/components/ui/PressableScale';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { Text } from '@/components/ui/Text';
import { TextButton } from '@/components/ui/TextButton';
import { toast } from '@/components/ui/Toast';
import { selectIsDemo, useAuthStore } from '@/features/auth/authStore';
import { seedDemoAnalysis } from '@/features/analysis/seedDemoAnalysis';
import { pickPortraitFromLibrary } from '@/features/camera/pickPortrait';
import { queryKeys, useLatestAnalysis, usePalettes, usePortraitUri, useRepository } from '@/features/data/queries';
import { recommendOutfits } from '@/features/outfits/recommendOutfits';
import { shareOutfit } from '@/features/outfits/share';
import { useOutfitSaving } from '@/features/outfits/useOutfitSaving';
import { EDITORS_PALETTE } from '@/mocks/demoAnalysis';
import { STYLE_PRINCIPLES, TRENDING_COMBINATIONS } from '@/mocks/editorial';
import { usePreferencesStore } from '@/store/preferencesStore';
import { palette } from '@/theme/colors';
import { enterUp } from '@/theme/motion';
import { shadows } from '@/theme/shadows';
import { layout, spacing } from '@/theme/spacing';
import { formatRelative, greetingFor } from '@/utils/format';

function Hero({ width, onSample }: { width: number; onSample?: () => void }) {
  return (
    <Animated.View entering={enterUp(0)} style={[styles.hero, shadows.offsetInk]}>
      <View style={styles.heroArt} pointerEvents="none">
        <View style={[styles.abs, { right: -width * 0.26, top: -width * 0.26 }]}>
          <Blob seed={11} color={palette.denim} size={width * 0.72} />
        </View>
        <View style={[styles.abs, { right: -width * 0.02, top: width * 0.16 }]}>
          <Blob seed={41} color={palette.coral} size={width * 0.3} />
        </View>
        <View style={[styles.abs, { right: -width * 0.12, top: width * 0.4 }]}>
          <Blob seed={53} color={palette.sky} size={width * 0.22} />
        </View>
      </View>
      <Text variant="eyebrow" color={palette.sky}>
        Nº 01 — Your colour edit
      </Text>
      <Text variant="displayL" color={palette.cream} style={styles.heroTitle} accessibilityRole="header">
        Discover{'\n'}your{' '}
        <Text variant="displayL" italic color={palette.sky}>
          colours
        </Text>
      </Text>
      <Text variant="bodyM" color="rgba(247,243,236,0.82)" style={styles.heroBody}>
        One portrait in good light. A palette, combinations and outfits that work with your colouring.
      </Text>
      <View style={styles.heroActions}>
        <PrimaryButton label="Analyze my look" icon={Camera} iconPosition="leading" tone="coral" onPress={() => router.push('/camera')} />
        <SecondaryButton
          label="Upload"
          icon={ImagePlus}
          iconPosition="leading"
          tone="cream"
          size="md"
          onPress={async () => {
            if (await pickPortraitFromLibrary()) router.push('/portrait-confirmation');
          }}
          accessibilityHint="Choose an existing portrait from your photos"
        />
      </View>
      {onSample ? (
        <TextButton label="No camera? See a sample result (demo)" color={palette.sky} onPress={onSample} underline />
      ) : null}
    </Animated.View>
  );
}

export default function DiscoverScreen() {
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const isDemo = useAuthStore(selectIsDemo);
  const avatarUri = usePreferencesStore((s) => s.avatarUri);
  const { latest, refetch, isRefetching } = useLatestAnalysis();
  const palettes = usePalettes();
  const portraitUri = usePortraitUri(latest);
  const source = latest?.result ?? EDITORS_PALETTE;
  const personal = Boolean(latest?.result);
  const outfits = recommendOutfits(source, { limit: 8, includeExperimental: false });
  const saving = useOutfitSaving(latest?.id ?? null, source.isDemo);
  const firstName = user?.displayName?.split(' ')[0];
  const contentWidth = Math.min(width, layout.maxContentWidth) - layout.screenPaddingX * 2;
  // Magazine-style section numbers stay sequential whether or not "latest story" is shown.
  const hasLatest = Boolean(latest?.result);
  const sectionNo = (n: number) => String(hasLatest ? n : n - 1).padStart(2, '0');
  const queryClient = useQueryClient();
  const repo = useRepository();

  const showSample = async () => {
    try {
      const id = await seedDemoAnalysis();
      await queryClient.invalidateQueries({ queryKey: queryKeys.all(repo.scope) });
      router.push({ pathname: '/results/[analysisId]', params: { analysisId: id } });
    } catch {
      toast.error('We couldn’t create the sample.');
    }
  };

  return (
    <ScreenContainer
      scroll
      withTabBar
      padded={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={palette.navy} />}>
      <View style={styles.gutter}>
        <Animated.View entering={enterUp(0)} style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="eyebrow" tone="secondary">
              {greetingFor()}
            </Text>
            <Text variant="h1">{firstName ? `${firstName}.` : 'Hello.'}</Text>
          </View>
          {isDemo ? <Badge label="Demo" tone="demo" /> : null}
          <PressableScale onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Open profile">
            <Avatar name={user?.displayName} uri={avatarUri} size={46} />
          </PressableScale>
        </Animated.View>

        <Hero width={contentWidth} onSample={isDemo && !latest ? () => void showSample() : undefined} />

        {latest?.result ? (
          <Animated.View entering={enterUp(1)} style={styles.section}>
            <SectionHeader index="02" title="Your latest story" actionLabel="Open" onAction={() => router.push(`/results/${latest.id}`)} />
            <PressableScale
              onPress={() => router.push(`/results/${latest.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Latest analysis: ${latest.result.headline}`}
              style={[styles.latest, shadows.offsetSmall]}>
              <PortraitFrame uri={portraitUri ?? (latest.portrait.location === 'deleted' ? null : undefined)} width={96} shadow="none" />
              <View style={styles.latestCopy}>
                <ProvenanceBadge kind={latest.result.isDemo ? 'demo' : latest.result.provider === 'remote' ? 'remote' : 'device'} />
                <Text variant="h3" numberOfLines={3}>
                  {latest.result.headline}
                </Text>
                <Text variant="caption" tone="secondary">
                  {formatRelative(latest.createdAt)}
                </Text>
                <PaletteStrip colors={latest.result.recommendedColors.slice(0, 6)} height={22} />
              </View>
            </PressableScale>
          </Animated.View>
        ) : null}

        <Animated.View entering={enterUp(2)} style={styles.section}>
          <SectionHeader
            index={sectionNo(3)}
            title="Saved palettes"
            actionLabel={palettes.data?.length ? 'All' : undefined}
            onAction={() => router.push('/colors')}
          />
        </Animated.View>
      </View>

      {palettes.data?.length ? (
        <FlatList
          horizontal
          data={palettes.data.slice(0, 8)}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
          renderItem={({ item }) => (
            <ColorPaletteCard
              name={item.name}
              colors={item.colors}
              createdAt={item.createdAt}
              isFavorite={item.isFavorite}
              width={180}
              onPress={() => (item.analysisId ? router.push(`/palette/${item.analysisId}`) : router.push('/colors'))}
            />
          )}
        />
      ) : (
        <View style={styles.gutter}>
          <View style={styles.emptyPalettes}>
            <PaletteStrip colors={[{ hex: palette.linen }, { hex: palette.sand }, { hex: palette.mist }, { hex: palette.linen }]} height={36} />
            <Text variant="bodyS" tone="secondary">
              Palettes you save from your results appear here.
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.gutter, styles.section]}>
        <SectionHeader index={sectionNo(4)} title="Trending combinations" subtitle="Curated by the ColorTheory editors." />
      </View>
      <FlatList
        horizontal
        data={TRENDING_COMBINATIONS}
        keyExtractor={(c) => c.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hList}
        renderItem={({ item }) => <CombinationCard name={item.name} hexes={item.hexes} note={item.note} tag={item.season} width={210} />}
      />

      <View style={[styles.gutter, styles.section]}>
        <SectionHeader
          index={sectionNo(5)}
          title="Outfit inspiration"
          subtitle={personal ? 'Built from your latest palette.' : 'Editor’s picks from a sample palette — analyse your look to personalise.'}
          actionLabel="More"
          onAction={() => router.push('/outfits')}
        />
      </View>
      <OutfitCarousel
        outfits={outfits}
        savedIds={saving.savedIds}
        onOpen={(o) => router.push({ pathname: '/outfit/[outfitId]', params: { outfitId: o.id, analysisId: latest?.id ?? 'editorial' } })}
        onToggleSave={personal ? saving.toggle : undefined}
        onShare={(o) => void shareOutfit(o)}
        widthRatio={0.64}
      />

      <View style={[styles.gutter, styles.section]}>
        <View style={[styles.rules, shadows.offsetCoral]}>
          <Text variant="eyebrow" color={palette.sky}>
            Nº {sectionNo(6)} — Manifesto
          </Text>
          <Text variant="displayL" color={palette.cream} accessibilityRole="header">
            Your colours,{'\n'}
            <Text variant="displayL" italic color={palette.coral}>
              your rules.
            </Text>
          </Text>
          {STYLE_PRINCIPLES.map((p, i) => (
            <View key={p.title} style={styles.rule}>
              <Text variant="numeric" color={palette.sky}>
                {String(i + 1).padStart(2, '0')}
              </Text>
              <View style={styles.ruleCopy}>
                <Text variant="h3" color={palette.cream}>
                  {p.title}
                </Text>
                <Text variant="bodyS" color="rgba(247,243,236,0.78)">
                  {p.body}
                </Text>
              </View>
            </View>
          ))}
          <SecondaryButton label="Start an analysis" icon={ArrowRight} tone="cream" size="md" onPress={() => router.push('/camera')} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: layout.screenPaddingX },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingTop: spacing[3], paddingBottom: spacing[5] },
  headerText: { flex: 1 },
  abs: { position: 'absolute' },
  hero: {
    backgroundColor: palette.ink,
    padding: spacing[6],
    paddingTop: spacing[8],
    gap: spacing[3],
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: palette.navy,
  },
  heroArt: { ...StyleSheet.absoluteFill },
  heroTitle: { marginTop: spacing[2] },
  heroBody: { maxWidth: 240 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginTop: spacing[3], alignItems: 'center' },
  section: { marginTop: layout.sectionGap },
  latest: {
    flexDirection: 'row',
    gap: spacing[4],
    padding: spacing[3],
    backgroundColor: palette.paper,
    borderWidth: 1.5,
    borderColor: palette.navy,
  },
  latestCopy: { flex: 1, gap: spacing[2] },
  hList: { paddingHorizontal: layout.screenPaddingX, gap: spacing[4], paddingBottom: spacing[2], paddingRight: layout.screenPaddingX + 6 },
  emptyPalettes: { gap: spacing[2] },
  rules: { backgroundColor: palette.navy, padding: spacing[6], gap: spacing[4], borderWidth: 1.5, borderColor: palette.navy },
  rule: { flexDirection: 'row', gap: spacing[3] },
  ruleCopy: { flex: 1, gap: 2 },
});
