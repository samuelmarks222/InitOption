create table if not exists public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  reviewer_name text not null default 'Init Option trader',
  reviewer_uid text,
  avatar_url text,
  country text,
  rating integer not null default 5 check (rating between 1 and 5),
  review_text text not null check (char_length(trim(review_text)) between 3 and 1000),
  status text not null default 'approved' check (status in ('approved', 'pending', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_reviews enable row level security;

drop policy if exists "Anyone can read approved reviews" on public.customer_reviews;
drop policy if exists "Users can create reviews" on public.customer_reviews;
drop policy if exists "Admins can manage customer reviews" on public.customer_reviews;

create policy "Anyone can read approved reviews"
on public.customer_reviews
for select
to anon, authenticated
using (
  status = 'approved'
  or auth.uid() = user_id
  or public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'content_marketing_manager'::public.app_role)
);

create policy "Users can create reviews"
on public.customer_reviews
for insert
to anon, authenticated
with check (
  status = 'approved'
  and (user_id is null or auth.uid() = user_id)
);

create policy "Admins can manage customer reviews"
on public.customer_reviews
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'content_marketing_manager'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'content_marketing_manager'::public.app_role)
);

create or replace function public.set_customer_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_customer_reviews_updated_at on public.customer_reviews;
create trigger set_customer_reviews_updated_at
before update on public.customer_reviews
for each row
execute function public.set_customer_reviews_updated_at();
