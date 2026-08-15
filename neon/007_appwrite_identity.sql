-- Migration: Appwrite identity binding
-- Adds an appwrite_user_id column to public.users so authenticateRequest can map an
-- Appwrite user (JWT $id) to the canonical UUID primary key used across all tables.
-- Email-based adoption (see api/_lib/clerkWebhook.ts) binds legacy Firebase-era
-- accounts on first sign-in; this column makes the mapping stable across requests.
--
-- Apply:  psql "$DATABASE_URL" -f neon/007_appwrite_identity.sql
-- (or run the full pipeline:  node neon/apply_schema.mjs)

alter table public.users
  add column if not exists appwrite_user_id text;

create unique index if not exists users_appwrite_user_id_idx
  on public.users (appwrite_user_id)
  where appwrite_user_id is not null;
