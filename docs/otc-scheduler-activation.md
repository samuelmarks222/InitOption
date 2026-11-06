# Vercel scheduled OTC collection (optional supported-plan path)

**Approved no-upgrade alternative:** use the external HTTP scheduler setup in
[`otc-external-scheduler.md`](./otc-external-scheduler.md). That path does not require
a frequent Vercel cron. The supported-plan checklist below applies only if choosing
Vercel cron instead; do not configure both.


## What this change implements

- A protected `/api/otc/collect` alias to the existing Function. No new Function,
  third-party worker, self-invoking endless loop, or open browser is required.
- An **opt-in** one-minute Vercel cron configuration command. The default manifest
  deliberately does not install a frequent cron, so merging this work cannot
  silently break an existing Hobby deployment or authorize a paid plan.
- Catalog collection in four concurrent waves, ordered missing/oldest first,
  within an 18-second **soft launch budget**. In-flight DB work can exceed the
  budget; this is not a hard execution deadline or a performance guarantee.
- The durable ON/OFF switch is checked between waves. Turning it off prevents new
  waves; up to four already-running asset writes may finish.
- Separately persisted authenticated scheduler observations. Manual admin cycles
  cannot fabricate scheduled-run health or erase a scheduler failure. Completion
  and health updates are fenced by the same cycle lease token.
- Scheduler health requires recent scheduler receipt/completion (150s), two successful
  scheduled work cycles, no scheduled error, every catalog asset initialized, and
  every asset advanced within 120s. Missing jobs, failures, initialization and lag
  are distinct states. Partial cycles alone do not prove catalog freshness.

## Current activation status

The local implementation is ready for review, **not a running production schedule**.
No plan upgrade, secret/environment change, deployed manifest change or production
migration was performed. This code does not purchase or verify a hosting plan.
The last previously verified setup was Hobby; current plan/project selection must
be confirmed before activation. Frequent cron needs a supported Vercel plan.

The Vercel runtime still runs bounded requests, not a persistent 100ms process.
Active charts poll the same authoritative service. Unviewed assets advance from
persisted checkpoints when the scheduled job invokes that service. The logical
100ms price sequence is not a guarantee of 100ms HTTP delivery or an always-live
in-memory worker. No pre-initialization history is generated. No price is changed
based on positions, balances or outcomes.

## Operator activation checklist

1. Confirm the **correct Vercel project** is already on a plan supporting
   once-per-minute cron. If not, obtain explicit approval before changing billing.
   Do not run the enable command against an unapproved Hobby deployment.
2. Review/apply `neon/016_otc_scheduler_health.sql` using the application DB owner
   (after migrations 013/014). Runtime idempotent initialization includes the same
   DDL for installations where that existing mechanism is permitted. This migration
   only adds health columns; it does not create cron jobs or enable collection.
3. Confirm a strong server-only `CRON_SECRET` in the intended deployment. Do not
   paste it into chat, commit it, put it in a URL, or use a `VITE_` prefix. Vercel's
   scheduler must send `Authorization: Bearer <CRON_SECRET>`. No secret means 503;
   a wrong secret means 401, before scheduler health or pricing mutations.
4. From the repository root, inspect and then opt in locally:

   ```sh
   node scripts/configure-otc-scheduler.mjs --check
   node scripts/configure-otc-scheduler.mjs --enable --confirm-supported-plan
   git diff -- vercel.json
   ```

   This adds only `{"path":"/api/otc/collect","schedule":"* * * * *"}` to
   the existing cron jobs. It does not change financial cron schedules, Function
   count, hosting plan, environment secrets or the server-side enabled switch.
   `--confirm-supported-plan` is an operator acknowledgment, not plan detection.
5. Review/publish that manifest through the agreed PR/deployment workflow. The
   command edits a local file only; it does not deploy anything.
6. An authorized administrator can enable collection and request a cycle through
   the protected APIs documented in `vercel-otc.md`. The Asset Library control
   panel has been removed. Allow the scheduled service to run independently.
7. Query the protected status API after multiple minute boundaries. Verify **separate** scheduler
   timestamps, at least two consecutive successful scheduled work cycles, and all
   catalog assets within the freshness window. Do not infer unattended operation
   from a secret being configured, a manual cycle, or currently viewed assets.

## Capacity and monitoring

The current catalog has 141 assets. Four-way collection reduces serial waiting,
not DB/CPU cost. Real database latency, cold starts, locking and backlog determine
whether the configured Function budget can maintain the entire catalog. This has
not been load-tested against production. A soft budget can stop a cycle early;
the next invocation resumes with missing/oldest assets first.

If assets remain stale, do not call the service healthy. Measure scheduled
latency/results and DB utilization; approve an appropriate supported runtime/DB
capacity configuration before increasing limits. This change does not silently
increase the Function's 30-second duration, create more database connections than
four concurrent collection transactions (plus small control queries), or upgrade
billing. Live traffic and other Function instances have separate existing pools.

Health is recent evidence, not an uptime SLA or independent external alerting.
Possession of the trusted cron secret allows an operator to invoke the scheduled
endpoint manually; database observations alone cannot prove requests were sent by
an autonomous scheduler. Verify Vercel cron execution records and browser-closed
acceptance. No external alert delivery or paid monitoring is provisioned here.

## Rollback

- Disable background collection through the protected administrator API to stop new waves while retaining history.
- To remove only the OTC cron from the local manifest:

  ```sh
  node scripts/configure-otc-scheduler.mjs --disable
  ```

- Review/deploy the manifest change. Existing daily financial jobs are preserved.
- Retain health columns, price checkpoints and recorded history. Never reset market
  state, change timestamps, discard data or generate fake candles to hide lag.

## Local verification

Node tests cover opt-in cron configuration, idempotence/rollback, routing, bounded
parallelism, switch cancellation between waves, missing/manual versus scheduled
health, freshness, failures and obsolete-lease fencing. Embedded PostgreSQL tests
exercise real SQL with test assets; these are not real Vercel cron executions.
Backend tests cover collection authorization and scheduler health. Production cron execution, capacity and browser-closed recording remain
pending until the activation checklist is completed.
