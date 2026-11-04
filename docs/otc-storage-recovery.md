# Neon OTC storage recovery (manual, backup-first)

## Evidence and scope

On 2026-11-04 the operator reported Neon's 1024 MB project limit exceeded.
`otc_ticks` occupied 957 MB (599 MB table + 358 MB indexes); candles occupied
27 MB. All 159 open trades were AAPL expiries on October 8. The operator's
read-only check found zero valid expiry ticks, with current AAPL ticks ranging
from November 4 00:01:28.3 to 04:35:33.4 UTC. These observations are not a backup
or authorization to fabricate settlement prices. Recheck against the live DB.

This change is local until reviewed and deployed. It does not itself free production
storage or settle trades. A 15-minute raw window replaces the 24-hour default;
recorded 5s candles retain the existing independent 30-day policy. Production pruning
preserves existing ticks in the conservative six-slot expiry window of every open
trade (all contexts). Prices, engine checkpoints, timestamps and trade outcomes are
unchanged. Explicit historical price requests can read these protected older ticks;
missing expiry prices still fail rather than substituting a candle or current price.

The raw-window bound is per asset relative to its committed logical checkpoint, not
wall time: a lagging engine must still advance through its backlog. Up to one batch
and the existing 60-second pruning cadence add transient overhead. Protected ticks,
dead tuples/index bloat, candles, other databases/branches and provider accounting
mean this is **not a guaranteed total-project storage ceiling**. Normal DELETE frees
space for reuse after vacuum, not necessarily disk quota immediately. Candle growth
across 141 assets may itself exceed this plan eventually. Monitor and obtain explicit
approval before changing candle retention, adding resources or deleting other data.

## 1. Stop writers without requiring a DB write

- Disable AND SAVE the cron-job.org job. Do not repeatedly test it.
- Deploy the recovery code with production server variable
  `OTC_PRICING_PAUSED=true`. This is not a `VITE_` variable.
- Wait for the new production deployment to be ready and prior in-flight Functions
  to drain (at least two minutes). Block old deployment access if it is still used.
- This switch returns maintenance 503 before schema initialization for tick/price,
  scheduled collect and manual collection-run requests. Admin settings and read-only
  health/history are not collection triggers. It does not pause financial services
  or guarantee that unrelated app writes stop. Arrange maintenance access controls
  for trading/trade mutations during backup and recovery.
- The switch is intentionally operator-only, does not change positions/outcomes,
  and works when the database cannot save the Admin OFF setting. A non-secret
  maintenance response is expected; do not mistake it for restored live pricing.

## 2. Export and verify BEFORE deletion

Use a trusted local machine and PostgreSQL client tools. Export the production
DB to encrypted storage **outside this repository and outside the full Neon project**.
Do not create a backup table/branch in the same storage-limited project. A full DB
export is preferred; at minimum preserve otc_ticks, otc_bars, otc_markets and trades.
`otc_markets` contains secret pricing state. Never upload that export to chat/GitHub.

With PostgreSQL connection parameters securely loaded into standard PG* environment
variables (no connection URL/password in shared shell history), an example full export:

```sh
pg_dump --format=custom --file=/secure/external-location/initoption-before-cleanup.dump
pg_restore --list /secure/external-location/initoption-before-cleanup.dump
```

Confirm pg_dump exited successfully, the archive is stored safely, and all required
tables/data sections are present. Verify by restoring to an isolated local PostgreSQL
instance when possible; an archive listing alone does not prove full restorability.
Do not proceed if the dump failed or backup completeness cannot be established.
Neon point-in-time restore availability/accounting is plan-dependent and is not
assumed to replace this export.

## 3. Guarded one-time reclamation

Only after steps 1/2, open `scripts/sql/recover-otc-tick-storage.sql`. It is deliberately
NOT a numbered migration and is not invoked by API startup/build/deploy.

- Its backup acknowledgement defaults to **false** and aborts. Change only that
  acknowledgement to true after personally verifying the external backup.
- Run the whole SQL file once in the correct production database as its owner.
- It locks engine state, trade mutations and tick writes while checking evidence.
- It refuses cleanup if ANY currently open trade has a retained expiry-window tick.
  If refused, preserve that evidence through a separately reviewed recovery plan;
  do not bypass the check or change outcomes to force success.
- It truncates ONLY `public.otc_ticks`, without CASCADE, leaving recorded bars,
  checkpoints/secrets/sessions and every trade/financial table untouched.
- TRUNCATE is transactional, takes exclusive locks, and removes all raw tick replay
  and exact-price history from the active DB. The external backup preserves the old
  data; bars are not a lossless tick backup. If the transaction errors, run ROLLBACK
  before other commands. Do not try VACUUM FULL/REINDEX at the full limit.
- Neon's size display/restrictions may update asynchronously. If truncation itself
  is denied by the quota, stop and use Neon support/provider recovery guidance;
  do not drop unrelated tables or assume a new branch supplies free storage.

Check table size after completion and inspect the Neon project usage display.
Do not re-enable writers while the project is still refusing writes.

## 4. Resume carefully, without claiming instant recovery

1. Keep the scheduler disabled. Remove `OTC_PRICING_PAUSED` (or set it to false)
   and redeploy the same recovery code only after headroom is confirmed.
2. Run one collector test. Confirm real processed assets, no errors and advancing
   cursors; also inspect raw table size. A new snapshot can be empty until the first
   post-cleanup tick commits; the feed must retry, never invent old ticks.
3. If the test works, enable the single external job; verify several browser-closed
   timed runs. Do not enable Vercel minute cron as well.
4. Backlog remains: the deterministic engine resumes its existing checkpoint, not
   a new market/reset clock. Check lag trends and measured throughput. Stop if the
   collector cannot catch up or storage approaches its limit. Do not claim that
   storage recovery alone fixes active-chart motion or 141-asset capacity.
5. Monitor pg_total_relation_size for ticks AND bars, dead tuples, provider usage,
   freshness and error rates. A shorter raw window needs timely settlement; only
   existing expiry ticks are protected, and no absent prices can be recreated by
   retaining data. Resolve the 159 October trades separately under an approved
   reconciliation process, without fabricated wins/losses or silent balance edits.

## Rollback

If collection fails, pause pricing and disable the external job again. Do not simply
redeploy the old 24-hour retention and refill the database. Restore deleted history
only from the verified backup into an isolated environment with sufficient capacity
first; financial/engine tables must not be overwritten blindly. No production backup,
cleanup, restore, secret/env edit or browser-closed verification was executed by this
repository change.
