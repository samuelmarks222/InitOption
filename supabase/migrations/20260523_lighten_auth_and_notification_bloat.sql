-- Keep auth and notification paths light while Supabase is under pressure.
-- Intentionally avoids index creation and cleanup deletes because overloaded
-- Supabase projects can time out on those operations in the SQL editor.

create or replace function public.is_email_verified_internal(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_confirmed_at timestamptz;
  v_email_confirmed_at timestamptz;
  v_platform_verified_at text;
begin
  select
    u.confirmed_at,
    u.email_confirmed_at,
    nullif(trim(u.raw_user_meta_data ->> 'platform_email_verified_at'), '')
  into
    v_confirmed_at,
    v_email_confirmed_at,
    v_platform_verified_at
  from auth.users u
  where u.id = p_user_id;

  return v_platform_verified_at is not null
    or v_email_confirmed_at is not null
    or v_confirmed_at is not null;
end;
$$;

-- Trade-result notifications are hidden in the app and can grow very quickly.
-- Keep the trade ledger itself, but stop creating duplicate notification rows.
create or replace function public.notify_trade_result(p_trade_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade public.trades%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_trade
  from public.trades
  where id = p_trade_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Trade not found';
  end if;

  if v_trade.status = 'open' or v_trade.closed_at is null then
    raise exception 'Trade is still open';
  end if;

  return null;
end;
$$;

grant execute on function public.notify_trade_result(uuid) to authenticated;
