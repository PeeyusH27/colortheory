import { createDemoAnalysisResult } from '@/mocks/demoAnalysis';
import { deleteFileQuietly } from '@/services/storage/localFiles';

import { useLocalDataStore } from '../localDataStore';
import { LocalRepository } from '../localRepository';
import type { OutfitPreviewInput } from '../types';

jest.mock('@/services/storage/localFiles', () => ({ deleteFileQuietly: jest.fn() }));

const repo = new LocalRepository();
const result = createDemoAnalysisResult({ createdAt: '2026-01-01T00:00:00.000Z' });

const preview = (analysisId: string | null): OutfitPreviewInput => ({
  analysisId,
  outfitId: 'clean-shirt--navy',
  outfitName: 'Navy Blue Shirt + Stone Trousers',
  garmentHex: '#172A46',
  mode: 'drape',
  provider: 'template',
  generationStatus: 'not_requested',
  imageUri: null,
  imagePath: null,
  isDemo: true,
});

async function seed(id = 'a1', localUri: string | null = 'file:///docs/portraits/a1.jpg') {
  await repo.createAnalysis({ id, provider: 'on-device', status: 'processing', portrait: { location: 'device', localUri, storagePath: null }, isDemo: false });
  return repo.updateAnalysis(id, { status: 'completed', result });
}

beforeEach(() => {
  useLocalDataStore.getState().reset();
  (deleteFileQuietly as jest.Mock).mockClear();
});

describe('LocalRepository', () => {
  it('creates, completes and lists analyses newest first', async () => {
    await seed('a1');
    await new Promise((r) => setTimeout(r, 5));
    await seed('a2');
    const list = await repo.listAnalyses();
    expect(list.map((a) => a.id)).toEqual(['a2', 'a1']);
    expect(list[0]?.status).toBe('completed');
    expect(list[0]?.result?.title).toBe('Your Color Story');
  });

  it('deletes an analysis with its portrait, previews and saved outfits, but keeps palettes', async () => {
    await seed('a1');
    await repo.savePalette({ name: 'Blues', analysisId: 'a1', kind: 'analysis', colors: [{ name: 'Navy', hex: '#172A46' }] });
    await repo.addFavoriteColor({ name: 'Navy', hex: '#172a46', analysisId: 'a1' });
    await repo.saveOutfit(preview('a1'));

    await repo.deleteAnalysis('a1');

    expect(deleteFileQuietly).toHaveBeenCalledWith('file:///docs/portraits/a1.jpg');
    expect(await repo.getAnalysis('a1')).toBeNull();
    expect(await repo.listSavedOutfits()).toEqual([]);
    const [palette] = await repo.listPalettes();
    expect(palette?.analysisId).toBeNull(); // detached, like ON DELETE SET NULL
    const [fav] = await repo.listFavoriteColors();
    expect(fav?.analysisId).toBeNull();
  });

  it('deletes only the portrait when asked, keeping results', async () => {
    await seed('a1');
    await repo.deletePortrait('a1');
    const session = await repo.getAnalysis('a1');
    expect(session?.portrait).toEqual({ location: 'deleted', localUri: null, storagePath: null });
    expect(session?.result).not.toBeNull();
  });

  it('de-duplicates favourite colours by hex', async () => {
    const a = await repo.addFavoriteColor({ name: 'Navy', hex: '#172a46', analysisId: null });
    const b = await repo.addFavoriteColor({ name: 'Navy Blue', hex: '#172A46', analysisId: null });
    expect(b.id).toBe(a.id);
    expect(await repo.listFavoriteColors()).toHaveLength(1);
  });

  it('saving the same outfit twice is idempotent', async () => {
    await seed('a1');
    const first = await repo.saveOutfit(preview('a1'));
    const second = await repo.saveOutfit(preview('a1'));
    expect(second.id).toBe(first.id);
    expect(await repo.listSavedOutfits()).toHaveLength(1);
  });

  it('renames and favourites palettes', async () => {
    const p = await repo.savePalette({ name: 'Old', analysisId: null, kind: 'custom', colors: [{ name: 'Sky', hex: '#A7C7E7' }] });
    await repo.updatePalette(p.id, { name: 'New', isFavorite: true });
    expect((await repo.listPalettes())[0]).toMatchObject({ name: 'New', isFavorite: true });
    await repo.deletePalette(p.id);
    expect(await repo.listPalettes()).toEqual([]);
  });

  it('reports collection stats', async () => {
    await seed('a1');
    await repo.saveOutfit(preview('a1'));
    expect(await repo.getStats()).toEqual({ analyses: 1, palettes: 0, favoriteColors: 0, savedOutfits: 1, cloudPortraits: 0 });
  });

  it('throws a not_found AppError for unknown records', async () => {
    await expect(repo.updateAnalysis('missing', { status: 'failed' })).rejects.toMatchObject({ code: 'not_found' });
  });
});
