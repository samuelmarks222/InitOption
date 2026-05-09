alter table public.profiles
  add column if not exists kyc_status text default 'Pending',
  add column if not exists kyc_documents jsonb default '{}'::jsonb;

comment on column public.profiles.kyc_status is 'KYC review status for the user profile.';
comment on column public.profiles.kyc_documents is 'Uploaded KYC documents metadata for admin review.';

drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
on public.profiles
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role) or auth.uid() = id)
with check (public.has_role(auth.uid(), 'admin'::public.app_role) or auth.uid() = id);
