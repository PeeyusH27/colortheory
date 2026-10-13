import type { ImageQualityReport } from '@/types/domain';
import { AppError } from '@/utils/errors';

/**
 * Thrown when a photo has blocking quality issues. The analysis screen shows the specific issues
 * and lets the user retake — or explicitly continue with a low-confidence result.
 */
export class QualityGateError extends AppError {
  readonly report: ImageQualityReport;

  constructor(report: ImageQualityReport) {
    super('low_quality', report.issues.find((i) => i.severity === 'blocking')?.message ?? 'Photo quality is too low.');
    this.name = 'QualityGateError';
    this.report = report;
  }
}

export function isQualityGateError(error: unknown): error is QualityGateError {
  return error instanceof QualityGateError;
}
