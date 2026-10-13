# Supabase backend

The app runs without Supabase (on-device + demo mode). Connect a project to get accounts,
cross-device sync, private cloud portraits, cloud analysis and AI previews.

```text
supabase/
├── config.toml                      local stack + auth redirect URLs + function JWT settings
├── migrations/
│   ├── 20261013120000_core_schema.sql       tables, constraints, triggers
│   ├── 20261013120100_row_level_security.sql  RLS + grants
│   └── 20261013120200_storage.sql           private buckets + storage policies
├── functions/
│   ├── analyze-portrait/   cloud colour analysis (Claude vision, structured output)
│   ├── generate-outfit/    AI try-on jobs (FASHN), quota, private re-storage
│   ├── delete-account/     storage cleanup + auth user deletion
│   ├── cleanup-orphans/    scheduled housekeeping (secret header)
│   └── _shared/            http helpers, service client, FASHN client
└── tests/
    ├── rls.scenarios.mjs   55 schema/RLS scenarios on PGlite — `npm run test:rls` (no Docker)
    ├── rls.test.sql        pgTAP version — `npx supabase test db` (needs the local stack)
    └── support/supabase_stubs.sql
```

## 1. Create and link a project

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push                 # applies supabase/migrations
```

Then in the dashboard:

1. **Project Settings → API**: copy the URL and the **publishable** key (or legacy anon key) into
   `.env.local` (see `.env.example`). Never copy a secret/service-role key into the app.
2. **Authentication → URL Configuration**
   - Site URL: `colortheory://`
   - Redirect URLs: `colortheory://**` and, for development in Expo Go, `exp://**`.
3. **Authentication → Providers → Email**: keep "Confirm email" on (the app handles it).
   Password policy is 8+ characters with letters and digits (mirrored in `config.toml` and the
   app's Zod schema).

Restart Metro after editing env: `npx expo start --clear`.

### Local stack (optional, needs Docker)

```bash
npx supabase start        # Postgres, Auth, Storage, Edge Runtime; applies migrations
npx supabase status       # prints the local URL + publishable key for .env.local
```

A physical phone or Android emulator can't reach `127.0.0.1`: use your computer's LAN IP
(Android emulator: `10.0.2.2`).

## 2. Schema

| Table | Purpose | Notable constraints |
|---|---|---|
| `profiles` | Display name (+ reserved `avatar_path`) | PK = `auth.users.id`, created by trigger from sign-up metadata |
| `analysis_sessions` | One analysis; versioned result JSON | path convention check; cloud ⇒ path (except while uploading); completed ⇒ result; result is `{schemaVersion: 1}` and ≤ 256 KB |
| `color_palettes` | Saved and custom palettes | 1–40 colours; composite FK to the user's own session, `ON DELETE SET NULL (analysis_id)` |
| `favorite_colors` | Individual favourites | `#RRGGBB` uppercase; unique per user |
| `outfit_previews` | Drape (Mode A) or AI (Mode B) previews | composite FK, cascades with the session; AI image path convention; completed AI ⇒ image (unless demo) |
| `saved_outfits` | Wardrobe | composite FK to own preview, unique per user |

Design rules:

- `user_id` **defaults to `auth.uid()`** — the app never sends it.
- **Composite foreign keys** `(child.parent_id, user_id) → parent(id, user_id)` make it
  impossible to attach a row to another user's data, even with a hand-crafted request.
- JSONB only for genuinely flexible payloads (colour arrays, the analysis result).
- Images live in Storage; tables hold private object paths only.
- `updated_at` maintained by trigger; helper functions live in a `private` schema with execute
  revoked from API roles.

## 3. Row Level Security

Every user table: RLS enabled, `anon` has no grants, and per-operation policies for
`authenticated` scoped to `(select auth.uid()) = user_id`. Highlights:

```sql
-- Insert: own rows only, and any referenced analysis must be yours.
create policy "color_palettes: insert own" on public.color_palettes
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (analysis_id is null or exists (
      select 1 from public.analysis_sessions s
      where s.id = analysis_id and s.user_id = (select auth.uid())))
  );

-- Clients may record drape previews and demo AI results — never a real AI preview.
create policy "outfit_previews: insert own drape or demo" on public.outfit_previews
  for insert to authenticated
  with check ((select auth.uid()) = user_id
    and (mode = 'drape' or (mode = 'ai' and is_demo and image_path is null)) and …);
-- and no UPDATE grant on outfit_previews at all: statuses/paths are server-controlled.
```

Full policies: `supabase/migrations/20261013120100_row_level_security.sql`.

Hiding buttons is not security — these policies are. The service role bypasses RLS and exists
only inside Edge Functions.

## 4. Storage

| Bucket | Public | Path | Client policies |
|---|---|---|---|
| `portraits` | no | `{user_id}/{analysis_id}/original.jpg` | read/delete own folder; **upload only into an existing analysis you own, file name `original.jpg`**; no update (immutable) |
| `outfit-previews` | no | `{user_id}/{analysis_id}/{preview_id}.png` | read/delete own; **no client upload** (Edge Function only) |
| `garment-references` | no | `{template_id}/{color_id}.png` | none (Edge Function only) — optional licensed garment photos |

The app displays private images with signed URLs that expire in 10 minutes (refreshed by
TanStack Query before expiry) and gives providers 5-minute signed URLs. Nothing is public.

### Portrait lifecycle (temporary images)

| Copy | Where | Deleted when |
|---|---|---|
| Camera/picker original | app cache | immediately after resizing (re-encoding also strips EXIF/GPS) |
| Working copy (≤1280 px JPEG) | app cache | after the analysis completes, or when the user cancels/discards |
| Analysis thumbnail (256 px) | memory only | the temporary file is deleted right after decoding |
| Device copy | app documents `portraits/` | user deletes the portrait/analysis/history/account; "Clean up unused files" removes orphans |
| Cloud copy | `portraits` bucket | user deletes it; **automatically right after a cloud analysis if the user chose "keep on this device"**; account deletion; `cleanup-orphans` for failed sessions |
| Provider copy | FASHN CDN | FASHN deletes outputs after ~3 days; we copy results into our bucket immediately |
| AI preview | `outfit-previews` bucket | with its analysis (cascade + storage delete), or account deletion |

Uploads happen only after an explicit consent tap on the confirmation screen (or in outfit
details for AI previews) — never because camera permission was granted.

## 5. Edge Functions

```bash
cp supabase/functions/.env.example supabase/functions/.env   # fill in; git-ignored
npx supabase secrets set --env-file supabase/functions/.env
npx supabase functions deploy analyze-portrait
npx supabase functions deploy generate-outfit
npx supabase functions deploy delete-account
npx supabase functions deploy cleanup-orphans --no-verify-jwt
```

Local: `npx supabase functions serve` (reads `supabase/functions/.env`).

Then set in the app's `.env.local`:

```bash
EXPO_PUBLIC_ANALYSIS_PROVIDER=remote     # offers "Cloud analysis" to signed-in users
EXPO_PUBLIC_OUTFIT_GENERATION=remote     # real AI previews for cloud-stored portraits
```

| Function | Auth | Does |
|---|---|---|
| `analyze-portrait` | user JWT | checks path ownership, daily quota, downloads the portrait with the service role, sends it to Claude (`claude-opus-5-5`, JSON-schema output, server-side refusal fallback), validates ranges, returns characteristics only |
| `generate-outfit` | user JWT | `start`: ownership + cloud portrait + daily quota + kill switch → FASHN job (try-on with a garment photo, else `edit`) → service-role preview row. `status`: polls FASHN, SSRF-guarded download, re-stores privately, returns a signed URL |
| `delete-account` | user JWT | removes the user's objects from both buckets, then deletes the auth user (rows cascade); aborts if storage cleanup fails |
| `cleanup-orphans` | `x-cleanup-secret` | deletes unfinished sessions >24 h, fails stuck AI jobs >1 h, removes objects without rows (>1 h old) |

Functions verify the caller with `auth.getUser(token)` in code, in addition to the gateway's JWT
check. If your project uses the new asymmetric JWT signing keys and calls are rejected at the
gateway, set `verify_jwt = false` for the user-facing functions in `config.toml` — the in-code
check still protects them.

### Schedule the cleanup (pg_cron + pg_net)

Enable the `pg_cron` and `pg_net` extensions (Database → Extensions), store the secret in Vault,
then:

```sql
select vault.create_secret('<same value as CLEANUP_SECRET>', 'cleanup_secret');

select cron.schedule(
  'colortheory-cleanup',
  '17 3 * * *',  -- daily 03:17 UTC
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/cleanup-orphans',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cleanup-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cleanup_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## 6. Testing RLS with two accounts

**Automated, no Docker:** `npm run test:rls` loads the real migrations into PGlite (Postgres 18
in WASM) on top of stub `auth`/`storage` schemas and runs 55 scenarios as user A, user B,
`anon` and the service role (reads, updates, deletes, cross-user attachments, storage paths,
fabricated AI previews, cascades, account deletion).

**Against the local stack:** `npx supabase test db` runs `supabase/tests/rls.test.sql` (pgTAP).

**Against a real (non-production) project:**

1. Create two users (Authentication → Users → Add user), confirm both.
2. Run `npm run test:integration` with `SUPABASE_TEST_URL`, `SUPABASE_TEST_PUBLISHABLE_KEY` and
   both users' credentials (see `jest.integration.config.js`). It signs in as each user with the
   publishable key — exactly the app's privileges.
3. Manual spot check in the SQL editor — impersonate each user:

   ```sql
   set local role authenticated;
   select set_config('request.jwt.claims', '{"sub":"<user-B-uuid>","role":"authenticated"}', true);
   select count(*) from public.analysis_sessions;                         -- only B's rows
   update public.analysis_sessions set status = 'failed'
     where user_id = '<user-A-uuid>' returning id;                        -- 0 rows
   insert into public.color_palettes (analysis_id, name, colors)
     values ('<A-analysis-id>', 'x', '[{"name":"Navy","hex":"#172A46"}]'); -- RLS error
   ```

4. In the app: sign in as A, run a cloud analysis; sign in as B on another device — A's history,
   palettes and portraits never appear; signed URLs from A's session stop working after expiry.

## 7. If you add an Express (or other) backend later

Never trust a user id sent by the client. Verify the Supabase access token on every request:

```ts
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

export async function requireUser(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return res.status(401).end();
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    });
    req.userId = payload.sub; // the only trustworthy user id
    next();
  } catch {
    res.status(401).end();
  }
}
```

Projects still on the legacy shared JWT secret can call `supabase.auth.getUser(token)` instead.
For database work on the user's behalf, create a per-request client with the user's token in the
`Authorization` header so RLS still applies; reserve the service key for genuinely privileged
jobs.

## 8. Regenerating types

`src/types/database.ts` is hand-written to match the migrations. After schema changes:

```bash
npx supabase gen types typescript --linked > src/types/database.generated.ts
```

and reconcile.
