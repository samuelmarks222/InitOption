// Build a Neon-ready schema from supabase/migrations/*.sql.
// Transformations (deterministic, idempotent):
//   1. auth.uid()                  -> current_setting('app.current_user_id', true)::uuid
//   2. auth.users                  -> public.users        (Clerk-populated mirror table)
//   3. Drop supabase Realtime publication registration statements
//   4. Drop storage.buckets/objects sections (served by Cloudinary instead)
//   5. Prepend public.users table + custom GUC declaration
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";
const OUT = "neon/adapted_schema.sql";

const REPLACEMENTS = [
  { from: "auth.uid()", to: "current_setting('app.current_user_id', true)::uuid" },
  { from: "auth.users", to: "public.users" },
  { from: "auth.role()", to: "'authenticated'::text" },
  { from: "auth.jwt()", to: "current_setting('app.clerk_user_metadata', true)::jsonb" },
];

const HEADER = `-- Neon-ready schema (generated from supabase/migrations/*.sql)
-- DO NOT EDIT BY HAND — regenerate via: node neon/build_schema.mjs
--
-- Supabase-specific runtime identity (auth.uid) is mapped to a Clerk user id
-- carried through a PostgreSQL custom GUC set per-request by the API layer:
--   SET LOCAL app.current_user_id = '<clerk_user_id>';
--   current_setting('app.current_user_id', true)  -- validates the GUC exists at runtime
-- Clerk users are mirrored into public.users by /api/webhooks/clerk (user.created/updated/deleted).
-- public.users is the auth table this schema now references.
`;

function stripStorageSections(content) {
  // The branding migration bundles platform_settings (KEEP) with a trailing
  // Supabase-storage block (DROP): insert into storage.buckets ... + its
  // drop/create policy statements on storage.objects. The storage bucket
  // is served by Cloudinary in the new stack, and storage.objects does not
  // exist on Neon, so drop everything from the first storage.buckets insert
  // to end-of-file.
  const marker = "insert into storage.buckets";
  const idx = content.indexOf(marker);
  if (idx === -1) return content;
  return content.slice(0, idx) + "-- (removed: Supabase storage bucket + policies -> Cloudinary)\n";
}

function stripSupabaseRealtime(content) {
  // Remove all Supabase Realtime publication statements — they error on Neon.
  //   1. Bare lines:  ALTER PUBLICATION supabase_realtime ADD TABLE ...;
  //   2. Wrapped DO $$ ... $$ (plain $$ or $tag$ ... $tag$) blocks containing realtime alter
  // Remove the comment banner lines too.
  return content
    .replace(/-- Enable realtime for[^\n]*\n/g, "")
    .replace(/ALTER PUBLICATION supabase_realtime ADD TABLE[^;]*;/g, "")
    // Match DO $$ ... $$ (plain $$ delimiters) blocks containing a realtime alter
    .replace(/do\s+\$\$\s*\n(?:[^]|]+|\$(?!\$\$))+?\$\$/gs, (m) =>
      /supabase_realtime/.test(m) ? "" : m
    )
    // Match DO $tag$ ... $tag$ blocks containing a realtime alter
    .replace(/do\s+\$(\w+)\s*\n(?:[^]|]+|\$(?!\$\1))+?\$(\w+)\s*;/gs, (m) =>
      /supabase_realtime/.test(m) ? "" : m
    );
}

const rolesBlock = `
-- Supabase exposes roles (authenticated/anon/service_role) at runtime.
-- CREATE EXTENSION / CREATE ROLE are non-transactional, so apply_schema.mjs runs
-- them in autocommit before the transactional schema load. They gate policies/grants.
create extension if not exists pgcrypto;
create role authenticated;
create role anon;
create role service_role;
-- app.current_user_id session variable carries the Clerk user id per-request:
--   SET LOCAL app.current_user_id = '<clerk_user_id>';
`;

const usersTable = `
-- Mirror of the Supabase auth.users table, populated by Clerk webhooks.
create table if not exists public.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb,
  email_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sign_in_at timestamptz,
  appwrite_user_id text
);

-- Appwrite identity binding (see api/_lib/clerkWebhook.ts). Existing databases apply
-- this via neon/007_appwrite_identity.sql (adds the column + unique partial index);
-- regenerated schemas get it here.
create unique index if not exists users_appwrite_user_id_idx
  on public.users (appwrite_user_id)
  where appwrite_user_id is not null;

-- Ensure the custom GUC exists for current_setting(..., true) reads.
select current_setting('app.current_user_id', true);
`;

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
let out = HEADER + rolesBlock + usersTable + "\n";

for (const name of files) {
  const text = readFileSync(join(MIGRATIONS_DIR, name), "utf8");
  let transformed = text;
  for (const { from, to } of REPLACEMENTS) {
    transformed = transformed.split(from).join(to);
  }
  // These two migrations are entirely / partially storage-related -> drop storage, keep the rest.
  if (name.includes("branding_bucket")) {
    transformed = stripStorageSections(transformed);
  } else if (name.includes("guide_media_storage_bucket")) {
    // Whole file is storage buckets -> skip entirely (Cloudinary handles guide media).
    out += `\n-- ===== (removed) ${name}: storage buckets -> Cloudinary =====\n`;
    continue;
  }
  transformed = stripSupabaseRealtime(transformed);
  out += `\n-- ===== MIGRATION: ${name} =====\n`;
  out += transformed;
  if (!/\n$/.test(out)) out += "\n";
}

mkdirSync("neon", { recursive: true });
writeFileSync(OUT, out);
console.log(`Wrote ${OUT} (${out.split("\n").length} lines)`);
