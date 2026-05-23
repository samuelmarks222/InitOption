-- Keep auth and notification paths light while Supabase is under pressure.

create index if not exists notifications_user_visible_created_idx
  on public.notifications(user_id, created_at desc)
  where type <> 'trade_result';

create index if not exists notification_email_deliveries_type_created_idx
  on public.notification_email_deliveries(notification_type, created_at desc);

create index if not exists email_verification_codes_created_idx
  on public.email_verification_codes(created_at desc);

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

do $$
declare
  v_deleted integer;
begin
  loop
    with doomed as (
      select ctid
      from public.notification_email_deliveries
      where notification_type = 'trade_result'
         or (
          status in ('sent', 'skipped', 'failed')
          and created_at < now() - interval '30 days'
        )
      limit 5000
    )
    delete from public.notification_email_deliveries d
    using doomed
    where d.ctid = doomed.ctid;

    get diagnostics v_deleted = row_count;
    exit when v_deleted = 0;
  end loop;

  loop
    with doomed as (
      select ctid
      from public.notifications
      where type = 'trade_result'
         or (
          expires_at is not null
          and expires_at < now() - interval '1 day'
        )
      limit 5000
    )
    delete from public.notifications n
    using doomed
    where n.ctid = doomed.ctid;

    get diagnostics v_deleted = row_count;
    exit when v_deleted = 0;
  end loop;

  loop
    with doomed as (
      select ctid
      from public.email_verification_codes
      where created_at < now() - interval '7 days'
         or expires_at < now() - interval '1 day'
      limit 5000
    )
    delete from public.email_verification_codes c
    using doomed
    where c.ctid = doomed.ctid;

    get diagnostics v_deleted = row_count;
    exit when v_deleted = 0;
  end loop;
end;
$$;

analyze public.notifications;
analyze public.notification_email_deliveries;
analyze public.email_verification_codes;
