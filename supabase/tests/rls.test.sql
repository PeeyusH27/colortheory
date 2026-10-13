-- pgTAP version of the core RLS scenarios, for the full local Supabase stack:
--   npx supabase start
--   npx supabase test db
-- (The Docker-free equivalent with more cases is supabase/tests/rls.scenarios.mjs → `npm run test:rls`.)
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

-- Two users. Inserting into auth.users fires the profile trigger.
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('11111111-1111-4111-8111-111111111111', 'rls-a@example.com', '{"display_name":"Alex"}', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'rls-b@example.com', '{}', 'authenticated', 'authenticated');

select is(
  (select display_name from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  'Alex',
  'profile is created from sign-up metadata'
);

-- ── User A ──────────────────────────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select lives_ok(
  $$ insert into public.analysis_sessions (id, model_provider, status, analysis_result)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'on-device', 'completed', '{"schemaVersion":1}') $$,
  'A can create an analysis (user_id defaults to auth.uid())'
);

select throws_ok(
  $$ insert into public.analysis_sessions (user_id, model_provider) values ('22222222-2222-4222-8222-222222222222', 'on-device') $$,
  '42501', null,
  'A cannot create rows owned by B'
);

select throws_ok(
  $$ insert into public.outfit_previews (analysis_id, outfit_id, outfit_name, garment_color, mode, provider, generation_status, is_demo)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'clean-shirt--navy', 'Navy Shirt', '#172A46', 'ai', 'fashn', 'queued', false) $$,
  '42501', null,
  'clients cannot fabricate real AI previews'
);

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('portraits', '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/original.jpg', '11111111-1111-4111-8111-111111111111') $$,
  'A can upload a portrait into own analysis folder'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('portraits', '22222222-2222-4222-8222-222222222222/x/original.jpg', '11111111-1111-4111-8111-111111111111') $$,
  '42501', null,
  'A cannot upload into B''s folder'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('outfit-previews', '11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/x.png', '11111111-1111-4111-8111-111111111111') $$,
  '42501', null,
  'clients cannot write generated previews'
);

-- ── User B ──────────────────────────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);

select is((select count(*)::int from public.analysis_sessions), 0, 'B cannot see A analyses');
select is((select count(*)::int from public.profiles), 1, 'B sees only own profile');
select is((select count(*)::int from storage.objects where bucket_id = 'portraits'), 0, 'B cannot list A portraits');

select is(
  (with u as (update public.analysis_sessions set status = 'failed' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1) select count(*)::int from u),
  0,
  'B cannot update A analysis'
);

select is(
  (with d as (delete from public.analysis_sessions where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1) select count(*)::int from d),
  0,
  'B cannot delete A analysis'
);

select throws_ok(
  $$ insert into public.color_palettes (analysis_id, name, colors)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Stolen', '[{"name":"Navy","hex":"#172A46"}]') $$,
  '42501', null,
  'B cannot attach a palette to A analysis'
);

select throws_ok(
  $$ insert into public.favorite_colors (name, hex) values ('Navy', 'navy') $$,
  '23514', null,
  'hex values are validated'
);

-- ── anon ────────────────────────────────────────────────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok($$ select * from public.analysis_sessions $$, '42501', null, 'anon cannot read analyses');
select is((select count(*)::int from storage.objects where bucket_id = 'portraits'), 0, 'anon cannot read portraits');

select * from finish();
rollback;
