# Neon Migration Notes (Phase 1)

Source of truth for the database port lives in **`neon/schema.sql`**, a concatenation of
`supabase/migrations/*.sql`. Because Neon speaks upstream PostgreSQL, the schema is largely
portable — **but the following Supabase-specific constructs must be adapted manually.**

## Supabase-specific constructs → Neon/Clerk equivalents

| Supabase feature in current schema/code | Neon/Clerk replacement | Notes |
|---|---|---|
| `auth.uid()` in RLS policies | `current_setting('request.jwt.claim.sub')` or a session var like `app.current_user_id` set by your API middleware from Clerk | See `lib/db.ts` → `withUser(clerkUserId, fn)` which runs `SET LOCAL app.current_user_id = $1`. Replace every `auth.uid()` with `current_setting('app.current_user_id')::uuid` (cast to match `users.id`). |
| `current_setting('request.jwt.claim...', true)` | `current_setting('app.current_user_id'[, true])` | Set the session var at the start of each API request. |
| `auth.users` table / `auth.users_in_public` | Clerk user directory | Do **not** import `auth.users`. User identity now comes from Clerk's `clerk_user_id` (mapped 1:1 to your `profiles.id`). Migrate existing users by upserting their Clerk ID into `profiles.clerk_user_id`. |
| `create trigger ... on_auth_user_create` hooks | Application-level / migration insert on Clerk webhook (`user.created`) | Move "create profile row when user signs up" logic to a Clerk webhook handler (`/api/webhooks/clerk`). |
| Supabase **Realtime** (`realtime` extension, broadcast triggers) | Pusher channels (`supabase.channel(...)`) | See Phase 4. Remove the `realtime` extension and its broadcast triggers. |
| Supabase **Storage** buckets (`id`, `avatars`, `branding`, `guides_media`) | Cloudinary | See Phase 3. Remove bucket tables; keep only the metadata columns (`logo_url`, etc.) pointing at Cloudinary HTTPS URLs. |
| Supabase **Edge Functions** / `_realtime`, `_auth`, `_storage` system schemas | Vercel serverless functions (`/api/*`) | Already present in this repo's `api/` dir; route them as normal API endpoints. |
| `supabase_functions` / `net._()` (ip4) | plain Postgres | `net._()` is a Supabase internal helper; replace with standard `inet` casts. |

## RLS adaptation pattern (Clerk)

Before (Supabase):
```sql
create policy "allow select on profiles" on public.profiles
  for select using (id = auth.uid());
```

After (Neon + Clerk):
```sql
create policy "allow select on profiles" on public.profiles
  for select using (id::text = current_setting('app.current_user_id', true));
```

API middleware (TypeScript):
```ts
import { withUser } from "../_lib/db.js";
await withUser(clerkUserId, async (client) => {
  const rows = await client.query("select * from profiles where id = $1", [userId]);
});
```

## Data migration (Supabase → Neon)

Recommended one-time approach using your **Supabase service_role** key:

```bash
# 1) Dump schema + data from Supabase (free, no paid tier needed)
supabase db dump --db-url "postgresql://postgres:[SERVICE_ROLE_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  --schema-only --file neon/schema.sql
supabase db dump --db-url "postgresql://..." --data-only --file neon/data.sql \
  --exclude-table auth.users --exclude-table realtime.* --exclude-table storage.*

# 2) Apply to Neon (neonctl or SQL editor)
neonctl sql --database-name <db> --file neon/schema.sql
neonctl sql --database-name <db> --file neon/data.sql
```

> `auth.users`, `storage.*`, `realtime.*` and `supabase_functions` are Supabase-internal
> tables — exclude them. User identity moves to Clerk; user rows you need (profiles, balances)
> live in `public.*` and are migrated via the `data` dump.

## Call-site translation reference

The codebase has ~**329** `supabase.from()`, **39** `.rpc()`, **31** `.auth.*`, **12** `storage.from()`,
**11** `.channel()` call sites (see audit in repo root).

| Supabase (client) | Neon replacement (api-side, `lib/db.ts`) |
|---|---|
| `supabase.from("t").select(...).eq(...)` | `await client.query("select ... from t where k = $1", [v])` |
| `supabase.from("t").insert({...})` | `await client.query("insert into t (...) values ($1,$2)", [...])` |
| `supabase.from("t").update({...}).eq(...)` | `await client.query("update t set k = $1 where id = $2", [...])` |
| `supabase.rpc("fn", { p_a: x })` | `await rpc("fn", { p_a: x })` (see `lib/db.ts`) |
| `supabase.auth.getUser()` | Clerk `currentUser` / session token |
| `supabase.storage.from("b").upload(...)` | Cloudinary `uploadSecure` |
| `supabase.channel(...).on("postgres_changes",...).subscribe()` | Pusher `channel.bind(...)` |
