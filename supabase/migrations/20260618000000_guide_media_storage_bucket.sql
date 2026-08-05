-- Create guide-media storage bucket for guide images and media files

insert into storage.buckets (id, name, public)
values ('guide-media', 'guide-media', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

drop policy if exists "guide_media_select" on storage.objects;
drop policy if exists "guide_media_insert" on storage.objects;
drop policy if exists "guide_media_update" on storage.objects;
drop policy if exists "guide_media_delete" on storage.objects;

create policy "guide_media_select"
on storage.objects
for select
using (bucket_id = 'guide-media');

create policy "guide_media_insert"
on storage.objects
for insert
with check (bucket_id = 'guide-media' and auth.uid() is not null);

create policy "guide_media_update"
on storage.objects
for update
using (bucket_id = 'guide-media' and auth.uid() is not null);

create policy "guide_media_delete"
on storage.objects
for delete
using (bucket_id = 'guide-media' and auth.uid() is not null);
