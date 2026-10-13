// delete-account — permanently removes the caller's account and data.
//
// Order matters: storage objects first (they are not covered by database cascades), then the
// auth user, whose deletion cascades to every user-owned table via ON DELETE CASCADE. If storage
// cleanup fails, the account is NOT deleted, so the user can retry without leaving orphaned files.
import { errorResponse, HttpError, json, preflight, readJson } from '../_shared/http.ts';
import { adminClient, BUCKETS, removeFolder, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  try {
    const admin = adminClient();
    const user = await requireUser(req, admin);
    const body = (await readJson(req)) as { confirm?: unknown };
    if (body?.confirm !== true) throw new HttpError(400, 'invalid_input', 'Confirmation required.');

    const removedPortraits = await removeFolder(admin, BUCKETS.portraits, user.id);
    const removedPreviews = await removeFolder(admin, BUCKETS.previews, user.id);

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    console.log(`[delete-account] user deleted; removed ${removedPortraits} portraits, ${removedPreviews} previews`);
    return json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
});
