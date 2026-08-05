drop function if exists public.get_available_deposit_bonus_offers();

create or replace function public.get_available_deposit_bonus_offers()
returns table (
  id uuid,
  title text,
  description text,
  deposit_amount numeric,
  bonus_percent numeric,
  bonus_amount numeric,
  "position" integer,
  status text,
  is_new_user boolean,
  eligible boolean,
  already_used boolean,
  monthly_locked boolean,
  active_reservation boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_is_new_user boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;

  v_is_new_user := coalesce(v_profile.total_deposit, 0) <= 0;

  return query
  with offer_usage as (
    select
      o.id as offer_id,
      exists (
        select 1
        from public.deposit_bonus_redemptions r
        where r.user_id = auth.uid()
          and r.bonus_offer_id = o.id
          and r.status in ('reserved', 'credited')
      ) as already_used
    from public.deposit_bonus_offers o
    where o.status = 'active'
  )
  select
    o.id,
    o.title,
    o.description,
    o.deposit_amount,
    o.bonus_percent,
    round(o.deposit_amount * (o.bonus_percent / 100.0), 2) as bonus_amount,
    o.position as "position",
    o.status,
    v_is_new_user as is_new_user,
    not usage.already_used as eligible,
    usage.already_used,
    false as monthly_locked,
    false as active_reservation,
    case
      when usage.already_used then 'Already used on this account'
      else null
    end as reason
  from public.deposit_bonus_offers o
  join offer_usage usage on usage.offer_id = o.id
  where o.status = 'active'
  order by o.position asc, o.deposit_amount asc, o.created_at asc;
end;
$$;
