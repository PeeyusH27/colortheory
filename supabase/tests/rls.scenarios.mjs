// RLS & schema scenarios, runnable WITHOUT Docker or a Supabase project:
//
//   npm run test:rls
//
// Loads the real migrations into an in-process Postgres (PGlite, Postgres compiled to WASM) on
// top of stub `auth`/`storage` schemas, then acts as two different users plus `anon` and checks
// that every ownership rule holds. The same scenarios exist as pgTAP in rls.test.sql for running
// against the full local Supabase stack (`npx supabase test db`).
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'migrations');

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const ANALYSIS_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ANALYSIS_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const RESULT = JSON.stringify({ schemaVersion: 1, title: 'Your Color Story' });

const db = new PGlite();
let passed = 0;
const failures = [];

async function as(user, fn) {
  await db.exec('reset role');
  if (user === 'anon') {
    await db.exec(`set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  } else if (user === 'service') {
    await db.exec(`set role service_role; select set_config('request.jwt.claim.sub', '', false);`);
  } else {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  }
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

async function expectOk(name, fn) {
  try {
    await fn();
    passed++;
  } catch (e) {
    failures.push(`${name}: expected success, got ${e.message}`);
  }
}

async function expectError(name, fn, pattern) {
  try {
    await fn();
    failures.push(`${name}: expected an error, but it succeeded`);
  } catch (e) {
    if (pattern && !pattern.test(e.message)) failures.push(`${name}: wrong error: ${e.message}`);
    else passed++;
  }
}

function expectEqual(name, actual, expected) {
  if (actual === expected) passed++;
  else failures.push(`${name}: expected ${expected}, got ${actual}`);
}

const count = async (sql, params = []) => (await db.query(sql, params)).rows.length;

// ── Setup ───────────────────────────────────────────────────────────────────────────────────────
await db.exec(readFileSync(join(here, 'support', 'supabase_stubs.sql'), 'utf8'));
for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
  try {
    await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
  } catch (e) {
    console.error(`Migration ${file} failed: ${e.message}`);
    process.exit(1);
  }
}
await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
  ('${A}', 'a@example.com', '{"display_name":"Alex"}'),
  ('${B}', 'b@example.com', '{}');`);

// ── Profiles (trigger + isolation) ──────────────────────────────────────────────────────────────
expectEqual('profile created by trigger', (await db.query(`select display_name from public.profiles where id = '${A}'`)).rows[0]?.display_name, 'Alex');
await as(A, async () => expectEqual('A sees only own profile', await count('select * from public.profiles'), 1));
await as(B, async () => {
  const r = await db.query(`update public.profiles set display_name = 'hacked' where id = '${A}' returning id`);
  expectEqual('B cannot update A profile', r.rows.length, 0);
});

// ── Analysis sessions ───────────────────────────────────────────────────────────────────────────
await as(A, async () => {
  await expectOk('A inserts own analysis (user_id from default auth.uid())', () =>
    db.query(`insert into public.analysis_sessions (id, model_provider, status, portrait_location) values ($1, 'on-device', 'processing', 'device')`, [ANALYSIS_A]),
  );
  await expectOk('A completes analysis with result', () =>
    db.query(`update public.analysis_sessions set status = 'completed', analysis_result = $2::jsonb where id = $1`, [ANALYSIS_A, RESULT]),
  );
  await expectError('A cannot insert a row for B', () =>
    db.query(`insert into public.analysis_sessions (user_id, model_provider) values ($1, 'on-device')`, [B]), /row-level security/);
  await expectError('completed requires result', () =>
    db.query(`insert into public.analysis_sessions (model_provider, status) values ('on-device', 'completed')`), /analysis_sessions_completed_has_result/);
  await expectError('image path must follow convention', () =>
    db.query(`insert into public.analysis_sessions (model_provider, original_image_path, portrait_location, status) values ('remote', 'someone/else/original.jpg', 'cloud', 'processing')`), /image_path_convention/);
  await expectError('cloud portrait needs a path once processing', () =>
    db.query(`insert into public.analysis_sessions (model_provider, portrait_location, status) values ('remote', 'cloud', 'processing')`), /cloud_has_path/);
  await expectOk('cloud portrait may lack a path while uploading', () =>
    db.query(`insert into public.analysis_sessions (model_provider, portrait_location, status) values ('remote', 'cloud', 'uploading')`));
  await expectError('result must be a versioned object', () =>
    db.query(`insert into public.analysis_sessions (model_provider, analysis_result) values ('on-device', '[1,2]')`), /result_shape/);
});
await as(B, async () => {
  await expectOk('B inserts own analysis', () =>
    db.query(`insert into public.analysis_sessions (id, model_provider, status, analysis_result) values ($1, 'on-device', 'completed', $2::jsonb)`, [ANALYSIS_B, RESULT]));
  expectEqual('B cannot read A analyses', await count(`select * from public.analysis_sessions where user_id = '${A}'`), 0);
  expectEqual('B sees exactly own analyses', await count('select * from public.analysis_sessions'), 1);
  expectEqual('B cannot update A analysis', (await db.query(`update public.analysis_sessions set status = 'failed' where id = $1 returning id`, [ANALYSIS_A])).rows.length, 0);
  expectEqual('B cannot delete A analysis', (await db.query(`delete from public.analysis_sessions where id = $1 returning id`, [ANALYSIS_A])).rows.length, 0);
  await expectError('B cannot move own row to A', () =>
    db.query(`update public.analysis_sessions set user_id = $2 where id = $1`, [ANALYSIS_B, A]), /row-level security|violates/);
});

// ── Palettes & favourites: cannot attach to another user's analysis ──────────────────────────────
await as(B, async () => {
  await expectError('B cannot attach palette to A analysis', () =>
    db.query(`insert into public.color_palettes (analysis_id, name, colors) values ($1, 'Stolen', '[{"name":"Navy","hex":"#172A46"}]')`, [ANALYSIS_A]), /row-level security|foreign key/);
  await expectError('B cannot favourite against A analysis', () =>
    db.query(`insert into public.favorite_colors (analysis_id, name, hex) values ($1, 'Navy', '#172A46')`, [ANALYSIS_A]), /row-level security|foreign key/);
  await expectOk('B saves palette on own analysis', () =>
    db.query(`insert into public.color_palettes (analysis_id, name, colors) values ($1, 'Mine', '[{"name":"Navy","hex":"#172A46"}]')`, [ANALYSIS_B]));
  await expectError('hex must be #RRGGBB uppercase', () =>
    db.query(`insert into public.favorite_colors (name, hex) values ('Navy', '172a46')`), /hex/);
  await expectOk('favourite upsert works (update policy)', async () => {
    await db.query(`insert into public.favorite_colors (name, hex) values ('Navy', '#172A46') on conflict (user_id, hex) do update set name = excluded.name`);
    await db.query(`insert into public.favorite_colors (name, hex) values ('Navy Blue', '#172A46') on conflict (user_id, hex) do update set name = excluded.name`);
  });
  await expectError('empty palette rejected', () =>
    db.query(`insert into public.color_palettes (name, colors) values ('Empty', '[]')`), /colors_check|check constraint/);
});
await as(A, async () => expectEqual('A cannot read B palettes', await count('select * from public.color_palettes'), 0));

// ── Outfit previews & saved outfits ─────────────────────────────────────────────────────────────
let previewA;
await as(A, async () => {
  const r = await db.query(
    `insert into public.outfit_previews (analysis_id, outfit_id, outfit_name, garment_color, mode, provider) values ($1, 'clean-shirt--navy', 'Navy Shirt', '#172A46', 'drape', 'template') returning id`,
    [ANALYSIS_A],
  );
  previewA = r.rows[0].id;
  passed++;
  await expectError('client cannot fabricate a real AI preview', () =>
    db.query(`insert into public.outfit_previews (analysis_id, outfit_id, outfit_name, garment_color, mode, provider, generation_status, is_demo) values ($1, 'clean-shirt--navy', 'Navy Shirt', '#172A46', 'ai', 'fashn', 'queued', false)`, [ANALYSIS_A]), /row-level security/);
  await expectOk('client may record a demo AI preview without image', () =>
    db.query(`insert into public.outfit_previews (analysis_id, outfit_id, outfit_name, garment_color, mode, provider, generation_status, is_demo) values ($1, 'clean-shirt--navy', 'Navy Shirt', '#172A46', 'ai', 'mock', 'completed', true)`, [ANALYSIS_A]));
  await expectError('client cannot update previews (no grant)', () =>
    db.query(`update public.outfit_previews set generation_status = 'completed' where id = $1`, [previewA]), /permission denied/);
  await expectOk('A saves own preview', () => db.query(`insert into public.saved_outfits (outfit_preview_id) values ($1)`, [previewA]));
  await expectOk('saved upsert works (update policy)', () =>
    db.query(`insert into public.saved_outfits (outfit_preview_id) values ($1) on conflict (user_id, outfit_preview_id) do update set created_at = excluded.created_at`, [previewA]));
});
await as(B, async () => {
  await expectError('B cannot save A preview', () => db.query(`insert into public.saved_outfits (outfit_preview_id) values ($1)`, [previewA]), /row-level security|foreign key/);
  expectEqual('B cannot see A previews', await count('select * from public.outfit_previews'), 0);
});
await as('service', async () => {
  await expectOk('service role (Edge Function) can write a real AI preview', () =>
    db.query(
      `insert into public.outfit_previews (id, user_id, analysis_id, outfit_id, outfit_name, garment_color, mode, provider, generation_status, image_path)
       values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', $1, $2, 'clean-shirt--navy', 'Navy Shirt', '#172A46', 'ai', 'fashn', 'completed', $3)`,
      [A, ANALYSIS_A, `${A}/${ANALYSIS_A}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.png`],
    ));
  await expectError('AI preview image path must follow convention', () =>
    db.query(
      `insert into public.outfit_previews (user_id, analysis_id, outfit_id, outfit_name, garment_color, mode, provider, generation_status, image_path)
       values ($1, $2, 'clean-shirt--navy', 'Navy Shirt', '#172A46', 'ai', 'fashn', 'completed', 'elsewhere.png')`,
      [A, ANALYSIS_A],
    ), /image_path_convention/);
});

// ── Storage policies ────────────────────────────────────────────────────────────────────────────
await as(A, async () => {
  await expectOk('A uploads portrait into own analysis folder', () =>
    db.query(`insert into storage.objects (bucket_id, name) values ('portraits', $1)`, [`${A}/${ANALYSIS_A}/original.jpg`]));
  await expectError('A cannot upload into B folder', () =>
    db.query(`insert into storage.objects (bucket_id, name) values ('portraits', $1)`, [`${B}/${ANALYSIS_B}/original.jpg`]), /row-level security/);
  await expectError('A cannot upload for an analysis that is not theirs', () =>
    db.query(`insert into storage.objects (bucket_id, name) values ('portraits', $1)`, [`${A}/${ANALYSIS_B}/original.jpg`]), /row-level security/);
  await expectError('A cannot upload arbitrary file names', () =>
    db.query(`insert into storage.objects (bucket_id, name) values ('portraits', $1)`, [`${A}/${ANALYSIS_A}/evil.html`]), /row-level security/);
  await expectError('A cannot write generated previews directly', () =>
    db.query(`insert into storage.objects (bucket_id, name) values ('outfit-previews', $1)`, [`${A}/${ANALYSIS_A}/x.png`]), /row-level security/);
  expectEqual('A can read own portrait', await count(`select * from storage.objects where bucket_id = 'portraits'`), 1);
});
await as(B, async () => {
  expectEqual('B cannot list A portraits', await count(`select * from storage.objects where bucket_id = 'portraits'`), 0);
  expectEqual('B cannot delete A portrait', (await db.query(`delete from storage.objects where bucket_id = 'portraits' returning id`)).rows.length, 0);
});

// ── Anonymous clients ───────────────────────────────────────────────────────────────────────────
await as('anon', async () => {
  for (const table of ['profiles', 'analysis_sessions', 'color_palettes', 'favorite_colors', 'outfit_previews', 'saved_outfits']) {
    await expectError(`anon cannot read ${table}`, () => db.query(`select * from public.${table}`), /permission denied/);
  }
  expectEqual('anon cannot read portraits', await count(`select * from storage.objects`), 0);
  await expectError('private helpers are not callable', () => db.query(`select private.set_updated_at()`), /permission denied/);
});

// ── Cascades on delete ──────────────────────────────────────────────────────────────────────────
await as(B, async () => {
  await db.query(`delete from public.analysis_sessions where id = $1`, [ANALYSIS_B]);
  expectEqual('palette survives analysis deletion (detached)', (await db.query(`select analysis_id from public.color_palettes`)).rows[0]?.analysis_id, null);
});
await as(A, async () => {
  await db.query(`delete from public.analysis_sessions where id = $1`, [ANALYSIS_A]);
  expectEqual('previews cascade with their analysis', await count('select * from public.outfit_previews'), 0);
  expectEqual('saved outfits cascade with their preview', await count('select * from public.saved_outfits'), 0);
});
await db.exec(`delete from auth.users where id = '${B}'`);
expectEqual('account deletion removes all user rows', await count(`select * from public.color_palettes where user_id = '${B}'`), 0);
expectEqual('account deletion removes profile', await count(`select * from public.profiles where id = '${B}'`), 0);

// ── Report ──────────────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✗ ${failures.length} RLS scenario(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.error(`✓ ${passed} passed`);
  process.exit(1);
}
console.log(`✓ All ${passed} RLS/schema scenarios passed`);
