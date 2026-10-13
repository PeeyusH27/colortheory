import { config } from '@/constants/config';

import { MockColorAnalysisProvider } from './MockColorAnalysisProvider';
import { OnDeviceColorAnalysisProvider } from './OnDeviceColorAnalysisProvider';
import { RemoteColorAnalysisProvider } from './RemoteColorAnalysisProvider';
import type { ColorAnalysisProvider } from './types';

export * from './types';
export { isQualityGateError, QualityGateError } from './QualityGateError';

export type AnalysisMethod = 'device' | 'cloud' | 'demo';

const providers = {
  device: new OnDeviceColorAnalysisProvider(),
  cloud: new RemoteColorAnalysisProvider(),
  demo: new MockColorAnalysisProvider(),
} satisfies Record<AnalysisMethod, ColorAnalysisProvider>;

export function getColorAnalysisProvider(method: AnalysisMethod): ColorAnalysisProvider {
  return providers[method];
}

/** Methods the user may choose from, given build configuration and account state. */
export function availableAnalysisMethods(options: { signedIn: boolean }): AnalysisMethod[] {
  const methods: AnalysisMethod[] = ['device'];
  if (config.analysisProvider === 'remote' && options.signedIn) methods.push('cloud');
  if (config.analysisProvider === 'mock' || __DEV__) methods.push('demo');
  return methods;
}

/** Default method from configuration (`EXPO_PUBLIC_ANALYSIS_PROVIDER`). */
export function defaultAnalysisMethod(options: { signedIn: boolean }): AnalysisMethod {
  if (config.analysisProvider === 'mock') return 'demo';
  if (config.analysisProvider === 'remote' && options.signedIn) return 'cloud';
  return 'device';
}
