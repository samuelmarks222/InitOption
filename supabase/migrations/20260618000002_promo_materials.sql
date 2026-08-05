-- Create promo_materials table for managing promotional banner materials
create table if not exists public.promo_materials (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  file_url text not null,
  file_size bigint not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.promo_materials enable row level security;

-- Create policies for admin access
create policy "Admin can view promo materials"
  on public.promo_materials
  for select
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

create policy "Admin can insert promo materials"
  on public.promo_materials
  for insert
  with check (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

create policy "Admin can update promo materials"
  on public.promo_materials
  for update
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

create policy "Admin can delete promo materials"
  on public.promo_materials
  for delete
  using (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Allow non-authenticated users to read promo materials for marketing purposes
create policy "Anyone can view promo materials"
  on public.promo_materials
  for select
  using (true);

-- Create index on created_at for sorting
create index if not exists idx_promo_materials_created_at 
  on public.promo_materials(created_at desc);
