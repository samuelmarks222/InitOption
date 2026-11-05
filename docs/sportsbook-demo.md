# Fieldbook: phase 1 foundation

The root route is a sportsbook demonstration, separate from the existing InitOption trading routes. All fixtures, scores, odds and the jackpot prize are fictional. No sportsbook authentication, bet submission, payments or settlement is enabled. The forms are visual previews: they do not send or save credentials. The slip is in memory and persists across Fieldbook routes until reload; its return figures are illustrative, not financial calculations.

## Application structure

- `src/components/sportsbook/` contains the responsive application shell and design tokens/styles.
- `src/fieldbook/core/` centralizes routes, demo configuration, feature content and the typed API request boundary. There are **no Fieldbook API endpoints yet**.
- `src/fieldbook/sportsbook/` contains demo data, reusable odds and slip components, and global slip state.
- `src/fieldbook/accounts/`, `casino/`, `jackpots/`, `wallet/`, and `administration/` establish feature boundaries. Feature pages have explicit empty/unavailable states pending later phases.
- `api/_lib/fieldbookDb.ts` reuses the existing server-only PostgreSQL pool and `DATABASE_URL`; it is not exposed to the browser. The demo does not query the database.

Routes are `/` and `/fieldbook/{live,upcoming,casino,live-casino,virtual-sports,jackpots,promotions,login,register,my-bets,wallet,administration}`. Unknown Fieldbook pages show a not-found state. Existing trading routes are untouched; they are not sportsbook services.

## Database migration

`neon/017_fieldbook_foundation.sql` is a **Neon/PostgreSQL** migration, not a Supabase migration. It references the existing `public.users` identity mirror and existing `public.profiles` instead of duplicating them. It creates a separate `fieldbook` schema for betting-domain entities, with foreign keys, indexes, checks, and RLS enabled. `PUBLIC`, `anon`, and `authenticated` receive no schema or table access; there are no client policies or endpoints. Future migrations should extend this schema, not create parallel tables. The migration deliberately does not seed users, real odds or promotions.

After backing up the database and applying the repository's existing Neon schema, set `DATABASE_URL` **server-side only** in `.env` or the environment and run:

```sh
node neon/apply_fieldbook_migration.mjs
```

The runner takes a database advisory lock and records its version atomically; repeat runs skip the applied migration. It has **not** been run against a hosted database by this change. It requires database privileges to create the schema/tables and references the existing `anon` and `authenticated` roles. The pool adapter follows the existing repository configuration and should be reviewed for TLS and least-privilege deployment before production.

## Verification

```sh
npm run build
npx vitest run src/components/sportsbook/Sportsbook.test.tsx
node --test neon/017_fieldbook_foundation.test.mjs
```

The migration test uses PGlite with a minimal identity-table fixture; it does not substitute for testing against the intended deployed PostgreSQL environment.

## Safety and remaining work

This schema is a foundation only. Transactions are records, **not a double-entry ledger**. Responsible gambling limits are not enforced, roles/permissions are not wired to authorization, and there are no sportsbook services for account identity, wallet operations, betting, settlement, audit enforcement, jackpots, licensed games or provider feeds. There is no live WebSocket feed. Before real-money use, implement and independently test those systems, server-side authorization and transaction invariants, reliable migrations/backups, KYC/AML, jurisdiction and age controls, responsible gambling enforcement, licensed integrations, and operational security. Never use demo values as real event data or use this foundation to move money.
