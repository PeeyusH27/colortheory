-- Row Level Security
-- ---------------------------------------------------------------------------------------------
-- Every user-owned table: RLS on, no access for `anon`, and per-operation policies for
-- `authenticated` scoped to `user_id = auth.uid()`.
--
-- `(select auth.uid())` instead of `auth.uid()` lets Postgres evaluate the function once per
-- statement instead of once per row (Supabase performance guidance).
--
-- The service role (used only inside Edge Functions) bypasses RLS by design; it is never shipped
-- in the app.
-- ---------------------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.analysis_sessions enable row level security;
alter table public.color_palettes enable row level security;
alter table public.favorite_colors enable row level security;
alter table public.outfit_previews enable row level security;
alter table public.saved_outfits enable row level security;

-- Explicit grants (Supabase is making default table grants opt-in). anon gets nothing.
revoke all on public.profiles, public.analysis_sessions, public.color_palettes, public.favorite_colors,
  public.outfit_previews, public.saved_outfits from anon;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.analysis_sessions to authenticated;
grant select, insert, update, delete on public.color_palettes to authenticated;
grant select, insert, update, delete on public.favorite_colors to authenticated;
-- No UPDATE on previews: status and image paths of AI previews are server-controlled.
grant select, insert, delete on public.outfit_previews to authenticated;
grant select, insert, update, delete on public.saved_outfits to authenticated;

-- profiles ----------------------------------------------------------------------------------------
create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

create policy "profiles: update own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
-- No delete policy: profiles are removed by the auth.users cascade (account deletion).

-- analysis_sessions --------------------------------------------------------------------------------
create policy "analysis_sessions: read own" on public.analysis_sessions
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "analysis_sessions: insert own" on public.analysis_sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "analysis_sessions: update own" on public.analysis_sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "analysis_sessions: delete own" on public.analysis_sessions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- color_palettes -----------------------------------------------------------------------------------
create policy "color_palettes: read own" on public.color_palettes
  for select to authenticated using ((select auth.uid()) = user_id);

-- The composite FK already forces analysis_id to be one of the caller's sessions; the EXISTS
-- check makes the intent explicit and returns an RLS error instead of an FK error.
create policy "color_palettes: insert own" on public.color_palettes
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      analysis_id is null
      or exists (select 1 from public.analysis_sessions s where s.id = analysis_id and s.user_id = (select auth.uid()))
    )
  );

create policy "color_palettes: update own" on public.color_palettes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "color_palettes: delete own" on public.color_palettes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- favorite_colors -----------------------------------------------------------------------------------
create policy "favorite_colors: read own" on public.favorite_colors
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "favorite_colors: insert own" on public.favorite_colors
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      analysis_id is null
      or exists (select 1 from public.analysis_sessions s where s.id = analysis_id and s.user_id = (select auth.uid()))
    )
  );

-- Needed for UPSERT (ON CONFLICT (user_id, hex) DO UPDATE).
create policy "favorite_colors: update own" on public.favorite_colors
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "favorite_colors: delete own" on public.favorite_colors
  for delete to authenticated using ((select auth.uid()) = user_id);

-- outfit_previews -----------------------------------------------------------------------------------
create policy "outfit_previews: read own" on public.outfit_previews
  for select to authenticated using ((select auth.uid()) = user_id);

-- Clients may record drape previews and *demo* AI results (no image). Real AI previews are
-- inserted by the generate-outfit Edge Function with the service role, so a client cannot
-- fabricate a "generated" image record.
create policy "outfit_previews: insert own drape or demo" on public.outfit_previews
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (mode = 'drape' or (mode = 'ai' and is_demo and image_path is null))
    and (
      analysis_id is null
      or exists (select 1 from public.analysis_sessions s where s.id = analysis_id and s.user_id = (select auth.uid()))
    )
  );

create policy "outfit_previews: delete own" on public.outfit_previews
  for delete to authenticated using ((select auth.uid()) = user_id);

-- saved_outfits ---------------------------------------------------------------------------------------
create policy "saved_outfits: read own" on public.saved_outfits
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "saved_outfits: insert own" on public.saved_outfits
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.outfit_previews p where p.id = outfit_preview_id and p.user_id = (select auth.uid()))
  );

-- Needed for UPSERT (ON CONFLICT (user_id, outfit_preview_id) DO UPDATE).
create policy "saved_outfits: update own" on public.saved_outfits
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "saved_outfits: delete own" on public.saved_outfits
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Private helpers are never callable through the API.
revoke execute on all functions in schema private from public, anon, authenticated;
