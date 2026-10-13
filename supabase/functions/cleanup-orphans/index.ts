// cleanup-orphans — scheduled housekeeping (see docs/SUPABASE.md for the pg_cron schedule).
//
// 1. Analyses that never completed (crash, killed app, offline) and are older than 24 h: delete
//    their stored objects and rows.
// 2. AI previews stuck in queued/processing for over an hour: mark failed.
// 3. Storage objects whose analysis/preview row no longer exists (older than 1 h, so in-flight
//    uploads are never touched): delete.
//
// Not callable by app users: requires the CLEANUP_SECRET header and runs with verify_jwt = false
// (configured in supabase/config.toml).
import { errorResponse, HttpError, json, preflight, safeEqual } from '../_shared/http.ts';
import { adminClient, BUCKETS } from '../_shared/supabase.ts';

const MAX_USERS_PER_RUN = 500;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const secret = Deno.env.get('CLEANUP_SECRET');
    const provided = req.headers.get('x-cleanup-secret') ?? '';
    if (!secret || !safeEqual(provided, secret)) throw new HttpError(401, 'unauthorized', 'Unauthorized.');

    const admin = adminClient();
    const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const report = { staleSessions: 0, stuckPreviews: 0, orphanObjects: 0 };

    // 1. Stale unfinished sessions.
    const { data: stale, error: staleError } = await admin
      .from('analysis_sessions')
      .select('id, user_id')
      .neq('status', 'completed')
      .lt('created_at', dayAgo)
      .limit(500);
    if (staleError) throw staleError;
    for (const s of stale ?? []) {
      for (const bucket of [BUCKETS.portraits, BUCKETS.previews]) {
        const prefix = `${s.user_id}/${s.id}`;
        const { data: files } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
        const paths = (files ?? []).filter((f) => f.id).map((f) => `${prefix}/${f.name}`);
        if (paths.length) await admin.storage.from(bucket).remove(paths);
      }
      await admin.from('analysis_sessions').delete().eq('id', s.id);
      report.staleSessions++;
    }

    // 2. Stuck AI previews.
    const { data: stuck, error: stuckError } = await admin
      .from('outfit_previews')
      .update({ generation_status: 'failed', error_code: 'provider_timeout' })
      .eq('mode', 'ai')
      .in('generation_status', ['queued', 'processing'])
      .lt('created_at', hourAgo)
      .select('id');
    if (stuckError) throw stuckError;
    report.stuckPreviews = stuck?.length ?? 0;

    // 3. Orphaned objects: {user}/{analysis}/… with no matching row.
    for (const bucket of [BUCKETS.portraits, BUCKETS.previews]) {
      const { data: users } = await admin.storage.from(bucket).list('', { limit: MAX_USERS_PER_RUN });
      for (const userFolder of users ?? []) {
        if (userFolder.id) continue; // top level should only contain folders
        const { data: analyses } = await admin.storage.from(bucket).list(userFolder.name, { limit: 1000 });
        const analysisIds = (analyses ?? []).filter((a) => !a.id).map((a) => a.name);
        if (!analysisIds.length) continue;
        const { data: rows } = await admin.from('analysis_sessions').select('id').in('id', analysisIds);
        const live = new Set((rows ?? []).map((r) => r.id as string));
        for (const analysisId of analysisIds) {
          const prefix = `${userFolder.name}/${analysisId}`;
          const { data: files } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
          let candidates = (files ?? []).filter((f) => f.id && (f.created_at ?? '') < hourAgo);
          if (live.has(analysisId)) {
            if (bucket !== BUCKETS.previews) continue;
            // Analysis exists: remove only preview images whose preview row is gone.
            const ids = candidates.map((f) => f.name.replace(/\.png$/, ''));
            const { data: previewRows } = await admin.from('outfit_previews').select('id').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
            const livePreviews = new Set((previewRows ?? []).map((r) => r.id as string));
            candidates = candidates.filter((f) => !livePreviews.has(f.name.replace(/\.png$/, '')));
          }
          const paths = candidates.map((f) => `${prefix}/${f.name}`);
          if (paths.length) {
            await admin.storage.from(bucket).remove(paths);
            report.orphanObjects += paths.length;
          }
        }
      }
    }

    console.log('[cleanup-orphans]', report);
    return json(report);
  } catch (error) {
    return errorResponse(error);
  }
});
