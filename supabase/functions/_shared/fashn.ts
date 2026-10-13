// Minimal FASHN API client (https://docs.fashn.ai/). Server-side only — the key never ships.
//
//   POST {base}/v1/run          → { id, error }
//   GET  {base}/v1/status/{id}  → { id, status, output?, error? }
//
// Status values: starting | in_queue | processing | completed | failed.
// Output CDN links are deleted by FASHN after ~3 days, so results are copied into our own private
// bucket immediately. Failed predictions are not billed by FASHN.
import { HttpError } from './http.ts';

const BASE_URL = 'https://api.fashn.ai';
const ALLOWED_OUTPUT_HOSTS = ['cdn.fashn.ai'];

export type FashnStatus = 'starting' | 'in_queue' | 'processing' | 'completed' | 'failed';

export interface FashnStatusResponse {
  id: string;
  status: FashnStatus;
  output?: string[];
  error?: { name?: string; message?: string } | null;
}

export type TryOnRequest =
  | {
      // True virtual try-on: needs a garment photo (flat-lay or on-model).
      model_name: 'tryon-v1.6';
      inputs: {
        model_image: string;
        garment_image: string;
        category: 'auto' | 'tops' | 'bottoms' | 'one-pieces';
        garment_photo_type: 'auto' | 'flat-lay' | 'model';
        mode: 'performance' | 'balanced' | 'quality';
        segmentation_free: boolean;
        moderation_level: 'conservative' | 'permissive' | 'none';
        num_samples: 1;
        output_format: 'png' | 'jpeg';
        return_base64: false;
      };
    }
  | {
      // Instruction-based edit (FASHN marks this model experimental): used when no garment
      // reference photo exists for an outfit colour.
      model_name: 'edit';
      inputs: { image: string; prompt: string; output_format: 'png' | 'jpeg'; return_base64: false };
    };

function apiKey(): string {
  const key = Deno.env.get('FASHN_API_KEY');
  if (!key) throw new HttpError(503, 'provider_not_configured', 'AI previews are not configured.');
  return key;
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20_000),
  }).catch((e: unknown) => {
    throw new HttpError(e instanceof DOMException && e.name === 'TimeoutError' ? 504 : 502, e instanceof DOMException && e.name === 'TimeoutError' ? 'provider_timeout' : 'provider_error', 'Could not reach the try-on service.');
  });
  const body = (await res.json().catch(() => ({}))) as { error?: unknown; message?: string };
  if (!res.ok) {
    const name = typeof body.error === 'string' ? body.error : '';
    if (res.status === 429 && name === 'OutOfCredits') throw new HttpError(503, 'quota_exceeded', 'The try-on service is out of credits.');
    if (res.status === 429) throw new HttpError(503, 'provider_error', 'The try-on service is busy. Try again shortly.');
    if (res.status === 401) throw new HttpError(503, 'provider_not_configured', 'The try-on service key is invalid.');
    throw new HttpError(502, 'provider_error', 'The try-on service rejected the request.');
  }
  return body as T;
}

export async function startTryOn(request: TryOnRequest): Promise<string> {
  const res = await call<{ id?: string; error?: unknown }>('/v1/run', { method: 'POST', body: JSON.stringify(request) });
  if (!res.id) throw new HttpError(502, 'invalid_provider_response', 'The try-on service did not return a job id.');
  return res.id;
}

export function getTryOnStatus(jobId: string): Promise<FashnStatusResponse> {
  if (!/^[\w-]{1,200}$/.test(jobId)) throw new HttpError(400, 'invalid_input', 'Invalid job id.');
  return call<FashnStatusResponse>(`/v1/status/${encodeURIComponent(jobId)}`, { method: 'GET' });
}

/** Downloads a FASHN output, refusing any URL that isn't on FASHN's CDN (SSRF guard). */
export async function downloadOutput(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !ALLOWED_OUTPUT_HOSTS.includes(parsed.hostname)) {
    throw new HttpError(502, 'invalid_provider_response', 'Unexpected output location.');
  }
  const res = await fetch(parsed, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new HttpError(502, 'provider_error', 'Could not download the generated preview.');
  const contentType = res.headers.get('content-type') ?? 'image/png';
  if (!contentType.startsWith('image/')) throw new HttpError(502, 'invalid_provider_response', 'Generated preview is not an image.');
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > 15 * 1024 * 1024) throw new HttpError(502, 'invalid_provider_response', 'Generated preview is too large.');
  return { bytes, contentType };
}

/** User-facing message for FASHN runtime error names. */
export function describeFailure(name: string | undefined): { code: string; message: string } {
  switch (name) {
    case 'ContentModerationError':
      return { code: 'moderated', message: 'The try-on service declined this image.' };
    case 'PoseError':
      return { code: 'pose', message: 'The try-on service couldn’t read your pose. A front-facing, upper-body photo works best.' };
    case 'ImageLoadError':
      return { code: 'image_load', message: 'The try-on service couldn’t load the images.' };
    case 'InputValidationError':
      return { code: 'invalid_input', message: 'The try-on service couldn’t use this photo.' };
    default:
      return { code: 'provider_error', message: 'The preview couldn’t be generated. Try again in a moment.' };
  }
}
