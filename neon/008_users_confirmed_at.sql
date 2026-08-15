-- Migration: users.confirmed_at column
-- is_email_verified_internal (used by the deposit flow via create_notification_internal ->
-- queue_notification_email_internal_v2) reads u.confirmed_at alongside
-- u.email_confirmed_at. The Neon port of auth.users dropped confirmed_at, which made any
-- request that creates a notification raise:  column u.confirmed_at does not exist.
-- Restore the column (nullable) and backfill from email_confirmed_at so the existing
-- coalesce(u.email_confirmed_at, u.confirmed_at) logic behaves identically to upstream.
--
-- Apply:  psql "$DATABASE_URL" -f neon/008_users_confirmed_at.sql
-- (or run the full pipeline:  node neon/apply_schema.mjs)

alter table public.users
  add column if not exists confirmed_at timestamptz;

update public.users
   set confirmed_at = email_confirmed_at
 where confirmed_at is null
   and email_confirmed_at is not null;