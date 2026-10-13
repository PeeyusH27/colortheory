// generate-outfit — Mode B: AI try-on previews from the user's own portrait.
//
//   { action: "start",  analysisId, outfitId, outfitName, garmentColor, garmentColorName,
//                       garmentCategory, garmentDescription }   → { previewId, jobId, status }
//   { action: "status", previewId }                             → queued | processing |
//                                                                  completed (+ signedUrl) | failed
//
// Guarantees:
// * The caller's JWT is verified; every row/object is scoped to that user id.
// * The portrait is shared with the provider only via a signed URL that expires in 5 minutes.
// * Results are copied into the private outfit-previews bucket; the provider link is never stored.
// * Only this function (service role) can create real AI preview rows/objects (see RLS), so a
//   stored "AI preview" is always genuine.
// * Per-user daily quota (AI_PREVIEW_DAILY_LIMIT) and a kill switch (AI_PREVIEWS_ENABLED=false).
//
// Secrets: FASHN_API_KEY. Optional: AI_PREVIEW_DAILY_LIMIT, AI_PREVIEWS_ENABLED, TRYON_MODE.
import { z } from 'npm:zod@4.6.5';

import { describeFailure, downloadOutput, getTryOnStatus, startTryOn, type TryOnRequest } from '../_shared/fashn.ts';
import { envInt, errorResponse, HttpError, json, preflight, readJson } from '../_shared/http.ts';
import { adminClient, BUCKETS, previewPath, requireUser } from '../_shared/supabase.ts';

const JOB_TIMEOUT_MS = 10 * 60_000;
const SIGNED_URL_SECONDS = 10 * 60;

const startSchema = z.object({
  action: z.literal('start'),
  analysisId: z.uuid(),
  outfitId: z.string().regex(/^[a-z0-9-]+--[a-z0-9-]+$/),
  outfitName: z.string().min(1).max(160),
  garmentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  garmentColorName: z.string().min(1).max(60),
  garmentCategory: z.enum(['tops', 'bottoms', 'one-pieces']),
  garmentDescription: z.string().min(1).max(160),
});
const statusSchema = z.object({ action: z.literal('status'), previewId: z.uuid() });
const bodySchema = z.discriminatedUnion('action', [startSchema, statusSchema]);

type Admin = ReturnType<typeof adminClient>;

async function garmentReferenceUrl(admin: Admin, outfitId: string): Promise<string | null> {
  // Optional licensed/original garment photos, stored privately as {templateId}/{colorId}.png.
  const [templateId, colorId] = outfitId.split('--');
  const path = `${templateId}/${colorId}.png`;
  const { data } = await admin.storage.from(BUCKETS.garmentRefs).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

async function start(admin: Admin, userId: string, input: z.infer<typeof startSchema>) {
  if (Deno.env.get('AI_PREVIEWS_ENABLED') === 'false') {
    throw new HttpError(503, 'provider_not_configured', 'AI previews are temporarily unavailable.');
  }

  const { data: session, error } = await admin
    .from('analysis_sessions')
    .select('id, user_id, portrait_location, original_image_path')
    .eq('id', input.analysisId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!session) throw new HttpError(404, 'not_found', 'Analysis not found.');
  if (session.portrait_location !== 'cloud' || !session.original_image_path) {
    throw new HttpError(409, 'invalid_input', 'Upload the portrait to your private storage first.');
  }

  // Cost guard: AI previews per user per rolling 24 h.
  const limit = envInt('AI_PREVIEW_DAILY_LIMIT', 5);
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count, error: countError } = await admin
    .from('outfit_previews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('mode', 'ai')
    .eq('is_demo', false)
    .gte('created_at', since);
  if (countError) throw countError;
  if ((count ?? 0) >= limit) throw new HttpError(429, 'quota_exceeded', `Daily limit of ${limit} AI previews reached.`);

  const { data: signed, error: signError } = await admin.storage.from(BUCKETS.portraits).createSignedUrl(session.original_image_path, 300);
  if (signError || !signed?.signedUrl) throw new HttpError(404, 'not_found', 'Portrait not found.');

  const garmentUrl = Deno.env.get('TRYON_MODE') === 'edit' ? null : await garmentReferenceUrl(admin, input.outfitId);
  const request: TryOnRequest = garmentUrl
    ? {
        model_name: 'tryon-v1.6',
        inputs: {
          model_image: signed.signedUrl,
          garment_image: garmentUrl,
          category: input.garmentCategory,
          garment_photo_type: 'flat-lay',
          mode: 'balanced',
          segmentation_free: true,
          moderation_level: 'permissive',
          num_samples: 1,
          output_format: 'png',
          return_base64: false,
        },
      }
    : {
        model_name: 'edit',
        inputs: {
          image: signed.signedUrl,
          prompt: `Change only the person's ${input.garmentCategory === 'bottoms' ? 'lower-body garment' : input.garmentCategory === 'one-pieces' ? 'outfit' : 'top'} to a ${input.garmentColorName.toLowerCase()} (${input.garmentColor.toUpperCase()}) ${input.garmentDescription}. Keep the face, hair, skin, pose, background and lighting exactly the same.`,
          output_format: 'png',
          return_base64: false,
        },
      };

  const jobId = await startTryOn(request);
  const previewId = crypto.randomUUID();
  const { error: insertError } = await admin.from('outfit_previews').insert({
    id: previewId,
    user_id: userId,
    analysis_id: input.analysisId,
    outfit_id: input.outfitId,
    outfit_name: input.outfitName,
    garment_color: input.garmentColor.toUpperCase(),
    mode: 'ai',
    provider: `fashn:${request.model_name}`,
    provider_job_id: jobId,
    generation_status: 'queued',
    is_demo: false,
  });
  if (insertError) throw insertError;
  return { previewId, jobId, status: 'queued' as const };
}

async function status(admin: Admin, userId: string, previewId: string) {
  const { data: row, error } = await admin
    .from('outfit_previews')
    .select('id, user_id, analysis_id, provider, provider_job_id, generation_status, image_path, error_code, created_at')
    .eq('id', previewId)
    .eq('user_id', userId)
    .eq('mode', 'ai')
    .maybeSingle();
  if (error) throw error;
  if (!row || !row.analysis_id) throw new HttpError(404, 'not_found', 'Preview not found.');

  if (row.generation_status === 'completed' && row.image_path) {
    const { data: url } = await admin.storage.from(BUCKETS.previews).createSignedUrl(row.image_path, SIGNED_URL_SECONDS);
    if (!url?.signedUrl) throw new HttpError(404, 'not_found', 'Preview image missing.');
    return { status: 'completed', previewId, imagePath: row.image_path, signedUrl: url.signedUrl, provider: row.provider };
  }
  if (row.generation_status === 'failed') {
    return { status: 'failed', previewId, errorCode: row.error_code ?? 'provider_error', message: describeFailure(undefined).message };
  }

  const markFailed = async (code: string) => {
    await admin.from('outfit_previews').update({ generation_status: 'failed', error_code: code }).eq('id', previewId).eq('user_id', userId);
  };

  if (Date.now() - new Date(row.created_at).getTime() > JOB_TIMEOUT_MS) {
    await markFailed('provider_timeout');
    return { status: 'failed', previewId, errorCode: 'provider_timeout', message: 'The preview took too long. Please try again.' };
  }
  if (!row.provider_job_id) throw new HttpError(500, 'internal', 'Preview has no job id.');

  const job = await getTryOnStatus(row.provider_job_id);
  if (job.status === 'failed') {
    const failure = describeFailure(job.error?.name);
    await markFailed(failure.code);
    return { status: 'failed', previewId, errorCode: failure.code, message: failure.message };
  }
  if (job.status !== 'completed') {
    const next = job.status === 'processing' ? 'processing' : 'queued';
    if (next !== row.generation_status) {
      await admin.from('outfit_previews').update({ generation_status: next }).eq('id', previewId).eq('user_id', userId);
    }
    return { status: next, previewId };
  }

  const outputUrl = job.output?.[0];
  if (!outputUrl) {
    await markFailed('invalid_provider_response');
    throw new HttpError(502, 'invalid_provider_response', 'The try-on service returned no image.');
  }
  const { bytes, contentType } = await downloadOutput(outputUrl);
  const path = previewPath(userId, row.analysis_id, previewId);
  const { error: uploadError } = await admin.storage
    .from(BUCKETS.previews)
    .upload(path, bytes, { contentType, upsert: true }); // upsert: concurrent polls may race
  if (uploadError) throw uploadError;
  const { error: updateError } = await admin
    .from('outfit_previews')
    .update({ generation_status: 'completed', image_path: path, error_code: null })
    .eq('id', previewId)
    .eq('user_id', userId);
  if (updateError) throw updateError;

  const { data: url } = await admin.storage.from(BUCKETS.previews).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (!url?.signedUrl) throw new HttpError(500, 'internal', 'Could not sign the preview URL.');
  return { status: 'completed', previewId, imagePath: path, signedUrl: url.signedUrl, provider: row.provider };
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const admin = adminClient();
    const user = await requireUser(req, admin);
    const parsed = bodySchema.safeParse(await readJson(req));
    if (!parsed.success) throw new HttpError(400, 'invalid_input', 'Invalid request.');
    const body = parsed.data;
    return json(body.action === 'start' ? await start(admin, user.id, body) : await status(admin, user.id, body.previewId));
  } catch (error) {
    return errorResponse(error);
  }
});
