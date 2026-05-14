create or replace function public.is_email_verified_internal(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_confirmed_at timestamptz;
  v_platform_verified_at text;
begin
  select
    coalesce(u.email_confirmed_at, u.confirmed_at),
    nullif(trim(u.raw_user_meta_data ->> 'platform_email_verified_at'), '')
  into
    v_confirmed_at,
    v_platform_verified_at
  from auth.users u
  where u.id = p_user_id;

  return v_confirmed_at is not null or v_platform_verified_at is not null;
end;
$$;
