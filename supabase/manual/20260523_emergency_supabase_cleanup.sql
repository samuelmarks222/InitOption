-- Emergency Supabase cleanup for an overloaded project.
-- Run ONE block at a time in the Supabase SQL editor. If a block times out,
-- reduce the LIMIT value from 100 to 25 and run it again.

-- 1) Quick size check. This should be fast.
select
  schemaname,
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  pg_size_pretty(pg_relation_size(relid)) as table_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size
from pg_catalog.pg_statio_user_tables
order by pg_total_relation_size(relid) desc
limit 20;

-- 2) Stop new hidden trade-result notification bloat.
create or replace function public.notify_trade_result(p_trade_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return null;
end;
$$;

grant execute on function public.notify_trade_result(uuid) to authenticated;

-- 3) Let Supabase-confirmed Google/email accounts count as verified without
-- writing extra auth metadata from the browser.
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

-- 4) Delete hidden trade-result notifications in tiny batches.
-- Run repeatedly until it returns DELETE 0.
with doomed as (
  select id
  from public.notifications
  where type = 'trade_result'
  order by created_at
  limit 100
)
delete from public.notifications n
using doomed
where n.id = doomed.id;

-- 5) Delete old expired notifications in tiny batches.
-- Run repeatedly until it returns DELETE 0.
with doomed as (
  select id
  from public.notifications
  where expires_at is not null
    and expires_at < now() - interval '1 day'
  order by expires_at
  limit 100
)
delete from public.notifications n
using doomed
where n.id = doomed.id;

-- 6) Delete trade-result email delivery rows in tiny batches.
-- Run repeatedly until it returns DELETE 0.
with doomed as (
  select id
  from public.notification_email_deliveries
  where notification_type = 'trade_result'
  order by created_at
  limit 100
)
delete from public.notification_email_deliveries d
using doomed
where d.id = doomed.id;

-- 7) Delete old verification-code rows in tiny batches.
-- Run repeatedly until it returns DELETE 0.
with doomed as (
  select id
  from public.email_verification_codes
  where created_at < now() - interval '7 days'
     or expires_at < now() - interval '1 day'
  order by created_at
  limit 100
)
delete from public.email_verification_codes c
using doomed
where c.id = doomed.id;

-- 8) Optional: delete old copied/social trade rows only if you do not need
-- this history. Do NOT run this if you want to keep full user trade history.
with doomed as (
  select id
  from public.trades
  where trade_context in ('copied', 'manual_copy')
    and closed_at is not null
    and closed_at < now() - interval '30 days'
  order by closed_at
  limit 100
)
delete from public.trades t
using doomed
where t.id = doomed.id;

-- 9) After cleanup is done and the project is stable, run these separately.
-- If either times out, skip it and try again later.
analyze public.notifications;
analyze public.notification_email_deliveries;
analyze public.email_verification_codes;
