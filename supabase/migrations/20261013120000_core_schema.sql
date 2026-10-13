-- ColorTheory core schema
-- ---------------------------------------------------------------------------------------------
-- Design notes
-- * auth.users is the identity source of truth. Every user-owned row carries `user_id`, which
--   DEFAULTS to auth.uid() — the app never sends it — and RLS checks it on every operation.
-- * Relationships between user-owned tables use COMPOSITE foreign keys (child.parent_id, user_id)
--   → parent(id, user_id). A row can therefore only reference a parent owned by the same user,
--   even if a client crafts an insert by hand.
-- * JSONB is used only for genuinely flexible payloads (palette colour arrays, the versioned
--   analysis result). Ownership, status and relationships are real columns with constraints.
-- * Images never live in Postgres; tables store private Storage object paths only.
-- ---------------------------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- updated_at maintenance ------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- profiles --------------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 80),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 512),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Create a profile for every new auth user. SECURITY DEFINER because the trigger runs as the
-- auth service; search_path is pinned so it cannot be hijacked.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- analysis_sessions -----------------------------------------------------------------------------
create table public.analysis_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  original_image_path text,
  portrait_location text not null default 'device'
    check (portrait_location in ('device', 'cloud', 'deleted')),
  status text not null default 'pending'
    check (status in ('pending', 'uploading', 'processing', 'completed', 'failed', 'cancelled')),
  analysis_result jsonb,
  model_provider text not null check (model_provider in ('mock', 'on-device', 'remote')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Target for composite foreign keys from child tables.
  constraint analysis_sessions_id_user_key unique (id, user_id),
  -- Storage path convention: {user_id}/{analysis_id}/original.jpg
  constraint analysis_sessions_image_path_convention check (
    original_image_path is null
    or original_image_path = user_id::text || '/' || id::text || '/original.jpg'
  ),
  -- A cloud portrait must have a path, except while the upload is in flight.
  constraint analysis_sessions_cloud_has_path check (
    portrait_location <> 'cloud' or original_image_path is not null or status in ('pending', 'uploading')
  ),
  constraint analysis_sessions_completed_has_result check (status <> 'completed' or analysis_result is not null),
  constraint analysis_sessions_result_shape check (
    analysis_result is null
    or (jsonb_typeof(analysis_result) = 'object' and (analysis_result ->> 'schemaVersion') = '1')
  ),
  -- Results are ~10–20 KB; cap well above that to stop abuse.
  constraint analysis_sessions_result_size check (analysis_result is null or pg_column_size(analysis_result) <= 262144)
);

create index analysis_sessions_user_created_idx on public.analysis_sessions (user_id, created_at desc);
-- Supports the orphan/stale cleanup job.
create index analysis_sessions_unfinished_idx on public.analysis_sessions (created_at) where status <> 'completed';

create trigger analysis_sessions_set_updated_at
  before update on public.analysis_sessions
  for each row execute function private.set_updated_at();

-- color_palettes ----------------------------------------------------------------------------------
create table public.color_palettes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  analysis_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  kind text not null default 'analysis' check (kind in ('analysis', 'custom')),
  colors jsonb not null check (jsonb_typeof(colors) = 'array' and jsonb_array_length(colors) between 1 and 40),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Deleting an analysis keeps the palette but detaches it (PG15+ column-list SET NULL).
  constraint color_palettes_analysis_fk foreign key (analysis_id, user_id)
    references public.analysis_sessions (id, user_id) on delete set null (analysis_id)
);

create index color_palettes_user_created_idx on public.color_palettes (user_id, created_at desc);
create index color_palettes_analysis_idx on public.color_palettes (analysis_id) where analysis_id is not null;

create trigger color_palettes_set_updated_at
  before update on public.color_palettes
  for each row execute function private.set_updated_at();

-- favorite_colors -----------------------------------------------------------------------------------
create table public.favorite_colors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  analysis_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  hex text not null check (hex ~ '^#[0-9A-F]{6}$'),
  created_at timestamptz not null default now(),
  constraint favorite_colors_user_hex_key unique (user_id, hex),
  constraint favorite_colors_analysis_fk foreign key (analysis_id, user_id)
    references public.analysis_sessions (id, user_id) on delete set null (analysis_id)
);

create index favorite_colors_analysis_idx on public.favorite_colors (analysis_id) where analysis_id is not null;

-- outfit_previews -----------------------------------------------------------------------------------
-- One row per preview of an outfit: a "drape" (Mode A, no image) or an AI try-on (Mode B).
create table public.outfit_previews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  analysis_id uuid,
  outfit_id text not null check (outfit_id ~ '^[a-z0-9-]+--[a-z0-9-]+$'),
  outfit_name text not null check (char_length(outfit_name) between 1 and 160),
  garment_color text not null check (garment_color ~ '^#[0-9A-F]{6}$'),
  mode text not null default 'drape' check (mode in ('drape', 'ai')),
  image_path text,
  provider text not null check (char_length(provider) between 1 and 40),
  provider_job_id text check (provider_job_id is null or char_length(provider_job_id) <= 200),
  generation_status text not null default 'not_requested'
    check (generation_status in ('not_requested', 'queued', 'processing', 'completed', 'failed')),
  error_code text check (error_code is null or char_length(error_code) <= 60),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outfit_previews_id_user_key unique (id, user_id),
  -- Previews are derived from a portrait, so they go when the analysis goes.
  constraint outfit_previews_analysis_fk foreign key (analysis_id, user_id)
    references public.analysis_sessions (id, user_id) on delete cascade,
  -- Storage path convention: {user_id}/{analysis_id}/{preview_id}.png
  constraint outfit_previews_image_path_convention check (
    image_path is null
    or (analysis_id is not null and image_path = user_id::text || '/' || analysis_id::text || '/' || id::text || '.png')
  ),
  constraint outfit_previews_ai_has_analysis check (mode <> 'ai' or analysis_id is not null),
  constraint outfit_previews_completed_ai_has_image check (
    mode <> 'ai' or generation_status <> 'completed' or image_path is not null or is_demo
  )
);

create index outfit_previews_user_created_idx on public.outfit_previews (user_id, created_at desc);
create index outfit_previews_analysis_idx on public.outfit_previews (analysis_id) where analysis_id is not null;
-- Daily AI-preview quota lookups.
create index outfit_previews_ai_quota_idx on public.outfit_previews (user_id, created_at) where mode = 'ai' and not is_demo;

create trigger outfit_previews_set_updated_at
  before update on public.outfit_previews
  for each row execute function private.set_updated_at();

-- saved_outfits -------------------------------------------------------------------------------------
create table public.saved_outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  outfit_preview_id uuid not null,
  created_at timestamptz not null default now(),
  constraint saved_outfits_user_preview_key unique (user_id, outfit_preview_id),
  constraint saved_outfits_preview_fk foreign key (outfit_preview_id, user_id)
    references public.outfit_previews (id, user_id) on delete cascade
);

-- Comments surface in the Supabase table editor and generated docs.
comment on table public.analysis_sessions is 'One colour analysis. Portrait image lives in the private "portraits" bucket.';
comment on column public.analysis_sessions.analysis_result is 'Versioned ColorAnalysisResult JSON (schemaVersion = 1).';
comment on table public.outfit_previews is 'Drape (Mode A) or AI try-on (Mode B) preview. AI rows are written only by the generate-outfit Edge Function.';
