import { createDemoAnalysisResult } from '@/mocks/demoAnalysis';
import { getRepository } from '@/services/data';
import { createId } from '@/utils/id';

/**
 * Creates a sample analysis (no portrait, `isDemo: true`) so demo users on devices without a
 * camera — simulators, web — can explore results, palettes and outfits. Every screen labels it
 * as demo data.
 */
export async function seedDemoAnalysis(): Promise<string> {
  const repo = getRepository();
  const id = createId();
  await repo.createAnalysis({
    id,
    provider: 'mock',
    status: 'processing',
    portrait: { location: 'device', localUri: null, storagePath: null },
    isDemo: true,
  });
  await repo.updateAnalysis(id, { status: 'completed', result: createDemoAnalysisResult() });
  return id;
}
