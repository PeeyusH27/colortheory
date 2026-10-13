// analyze-portrait — cloud colour analysis with a vision model.
//
// Flow: verify caller JWT → check the storage path belongs to the caller → per-user daily quota →
// download the portrait with the service role (it never leaves Supabase as a URL) → send it to
// Claude as base64 with a JSON-schema response format → validate → return characteristics only.
// The app builds the palette itself with its deterministic engine, so the model can never inject
// colours or copy into the UI.
//
// Secrets (supabase secrets set …): ANTHROPIC_API_KEY. Optional: ANALYSIS_MODEL, ANALYSIS_EFFORT,
// ANALYSIS_DAILY_LIMIT.
import Anthropic from 'npm:@anthropic-ai/sdk@0.129.0';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';
import { z } from 'npm:zod@4.6.5';

import { envInt, errorResponse, HttpError, json, preflight, readJson } from '../_shared/http.ts';
import { adminClient, BUCKETS, portraitPath, requireUser } from '../_shared/supabase.ts';

const MODEL = Deno.env.get('ANALYSIS_MODEL') ?? 'claude-opus-5-5';
// A bounded perception task: lower effort keeps latency and cost down. Set explicitly because the
// model's default effort differs between Claude models.
const EFFORT = (Deno.env.get('ANALYSIS_EFFORT') ?? 'low') as 'low' | 'medium' | 'high';
const TIMEOUT_MS = 50_000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const requestSchema = z.object({
  analysisId: z.uuid(),
  storagePath: z.string().min(1).max(300),
});

// Structured-output schema. Numeric ranges can't be expressed in JSON-schema structured outputs,
// so they are stated in descriptions and enforced by `modelOutputSchema` below.
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['usable', 'lean', 'depth', 'contrast', 'chroma', 'confidence', 'observations', 'qualityConcerns'],
  properties: {
    usable: { type: 'boolean', description: 'false if there is not exactly one clearly visible human face, or the photo is too dark, blurred, filtered or tinted to judge colour.' },
    lean: { type: 'number', description: 'Undertone lean from -1 (clearly cool: pink/blue) through 0 (neutral or unclear) to +1 (clearly warm: golden/yellow).' },
    depth: { type: 'number', description: 'Overall depth of the visible colouring from 0 (very light) to 1 (very deep).' },
    contrast: { type: 'number', description: 'Value contrast between skin, hair and eyes/brows from 0 (low) to 1 (high).' },
    chroma: { type: 'number', description: 'Clarity of the colouring from 0 (soft, muted) to 1 (clear, bright).' },
    confidence: { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'Confidence 0–1 given photo quality, or null if you cannot judge.' },
    observations: { type: 'array', items: { type: 'string' }, description: 'Up to 3 short, neutral sentences addressed to the user about the colours visible in the photo.' },
    qualityConcerns: { type: 'array', items: { type: 'string' }, description: 'Up to 3 short sentences about lighting, filters, occlusion or blur. Empty if none.' },
  },
} as const;

const modelOutputSchema = z.object({
  usable: z.boolean(),
  lean: z.number().min(-1).max(1),
  depth: z.number().min(0).max(1),
  contrast: z.number().min(0).max(1),
  chroma: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1).nullable(),
  observations: z.array(z.string().max(300)).max(6),
  qualityConcerns: z.array(z.string().max(300)).max(6),
});

const SYSTEM_PROMPT = `You estimate visible colour characteristics from one portrait photo for a fashion styling app. Stylists use these estimates to suggest clothing colours.

Describe only colour as it appears in this photo. Lighting, white balance, makeup, filters and camera processing all change apparent colour — when you notice them, say so in qualityConcerns and lower your confidence rather than guessing.

Do not identify the person. Do not comment on or infer ethnicity, race, age, gender, health, attractiveness or body shape. Keep observations about colour only (skin tone as seen, hair, eyes, brows, and how they relate).

If usable is false, still return numbers (use 0 for lean and 0.5 for the others) and explain why in qualityConcerns.`;

function mapProviderError(error: unknown): HttpError {
  if (error instanceof Anthropic.RateLimitError) return new HttpError(503, 'provider_error', 'The analysis service is busy. Try again in a minute.');
  if (error instanceof Anthropic.APIConnectionTimeoutError) return new HttpError(504, 'provider_timeout', 'The analysis service took too long.');
  if (error instanceof Anthropic.AuthenticationError) return new HttpError(503, 'provider_not_configured', 'The analysis service is not configured correctly.');
  if (error instanceof Anthropic.BadRequestError) return new HttpError(422, 'invalid_input', 'The analysis service could not read this image.');
  if (error instanceof Anthropic.APIError) return new HttpError(502, 'provider_error', 'The analysis service returned an error.');
  if (error instanceof Anthropic.APIConnectionError) return new HttpError(502, 'provider_error', 'Could not reach the analysis service.');
  return new HttpError(500, 'internal', 'Analysis failed.');
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const admin = adminClient();
    const user = await requireUser(req, admin);
    const parsed = requestSchema.safeParse(await readJson(req));
    if (!parsed.success) throw new HttpError(400, 'invalid_input', 'Invalid request.');
    const { analysisId, storagePath } = parsed.data;

    // The path must be exactly the caller's own portrait for this analysis.
    if (storagePath !== portraitPath(user.id, analysisId)) throw new HttpError(403, 'forbidden', 'Not your portrait.');

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new HttpError(503, 'provider_not_configured', 'Cloud analysis is not configured.');

    // Cost guard: cloud analyses per user per rolling 24 h.
    const limit = envInt('ANALYSIS_DAILY_LIMIT', 10);
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count, error: countError } = await admin
      .from('analysis_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('model_provider', 'remote')
      .gte('created_at', since);
    if (countError) throw countError;
    if ((count ?? 0) > limit) throw new HttpError(429, 'quota_exceeded', 'Daily cloud analysis limit reached.');

    const { data: blob, error: downloadError } = await admin.storage.from(BUCKETS.portraits).download(storagePath);
    if (downloadError || !blob) throw new HttpError(404, 'not_found', 'Portrait not found.');
    if (blob.size > MAX_IMAGE_BYTES) throw new HttpError(413, 'invalid_input', 'Portrait is too large.');
    const data = encodeBase64(new Uint8Array(await blob.arrayBuffer()));

    const client = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });
    let response;
    try {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 8000,
        // Opt into server-side fallback: if a safety classifier declines, the API re-runs the
        // request on Anthropic's recommended fallback model instead of failing.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: EFFORT, format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
              { type: 'text', text: 'Estimate the visible colour characteristics in this portrait.' },
            ],
          },
        ],
      });
    } catch (error) {
      throw mapProviderError(error);
    }

    if (response.stop_reason === 'refusal') {
      return json({
        characteristics: { lean: 0, depth: 0.5, contrast: 0.5, chroma: 0.5 },
        confidence: null,
        observations: [],
        qualityConcerns: ['The analysis service declined this image. Try a different portrait or use on-device analysis.'],
        usable: false,
        model: response.model,
      });
    }
    if (response.stop_reason === 'max_tokens') {
      throw new HttpError(502, 'invalid_provider_response', 'The analysis was cut short.');
    }

    const text = response.content.find((b) => b.type === 'text');
    let raw: unknown;
    try {
      raw = JSON.parse(text && text.type === 'text' ? text.text : '');
    } catch {
      throw new HttpError(502, 'invalid_provider_response', 'The analysis service returned malformed output.');
    }
    const out = modelOutputSchema.safeParse(raw);
    if (!out.success) throw new HttpError(502, 'invalid_provider_response', 'The analysis service returned out-of-range values.');

    const o = out.data;
    return json({
      characteristics: { lean: o.lean, depth: o.depth, contrast: o.contrast, chroma: o.chroma },
      confidence: o.confidence,
      observations: o.observations.slice(0, 3),
      qualityConcerns: o.qualityConcerns.slice(0, 3),
      usable: o.usable,
      model: response.model,
    });
  } catch (error) {
    return errorResponse(error);
  }
});
