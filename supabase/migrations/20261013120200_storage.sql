-- Private storage for portraits and generated previews
-- ---------------------------------------------------------------------------------------------
-- Path conventions (also enforced by CHECK constraints on the tables):
--   portraits        {user_id}/{analysis_id}/original.jpg
--   outfit-previews  {user_id}/{analysis_id}/{preview_id}.png
--
-- Both buckets are PRIVATE: objects are only reachable through RLS-checked requests or short-lived
-- signed URLs. Nothing here is public.
-- ---------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('portraits', 'portraits', false, 10485760, array['image/jpeg']),
  ('outfit-previews', 'outfit-previews', false, 15728640, array['image/png', 'image/jpeg', 'image/webp']),
  -- Optional licensed/original garment photos for true virtual try-on: {template_id}/{color_id}.png.
  -- No policies at all: only the generate-outfit Edge Function (service role) reads it.
  ('garment-references', 'garment-references', false, 15728640, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- portraits ------------------------------------------------------------------------------------------
create policy "portraits: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'portraits' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Upload only into {own uid}/{own analysis id}/original.jpg. The analysis row must exist first,
-- so stray uploads that belong to no session are rejected.
create policy "portraits: upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'portraits'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 2
    and storage.filename(name) = 'original.jpg'
    and exists (
      select 1
      from public.analysis_sessions s
      where s.id::text = (storage.foldername(name))[2]
        and s.user_id = (select auth.uid())
    )
  );

create policy "portraits: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portraits' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- No UPDATE policy: portraits are immutable (uploads use x-upsert: false).

-- outfit-previews -------------------------------------------------------------------------------------
create policy "outfit previews: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'outfit-previews' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "outfit previews: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'outfit-previews' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- No INSERT/UPDATE policy: generated images are written only by the generate-outfit Edge Function
-- (service role), which is what makes a stored "AI preview" trustworthy.
