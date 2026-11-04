# External OTC scheduler — no frequent Vercel cron

## Status and selected approach

Use **cron-job.org** as the external HTTP scheduler. Its open-source project is
https://github.com/pschlan/cron-job.org; account setup is at https://console.cron-job.org/.
Choose the free service only; confirm the current free scheduling/header/timeout
limits in its console before enabling. No purchase or upgrade is authorized.

This repository is prepared for an external trigger, **not activated in production**.
No scheduler account/job was created, no secret was provisioned, and no browser-closed
production test was performed. Access to that external service is not connected here.
A GitHub Actions timer is deliberately not used: its schedule is not a reliable
one-minute heartbeat. Do not install both external and Vercel minute schedules.

The external service only sends an authenticated HTTPS request. The existing engine
still runs in a bounded Vercel Function and persists in PostgreSQL. This avoids a
frequent *Vercel cron* requirement, not Function/database quotas, commercial-use
restrictions, or the need to verify hosting terms. It is not a persistent 100ms worker.

## Prerequisites

1. Review and deploy the collector changes through the agreed PR/merge workflow.
   This document does not authorize publishing them. The production rewrite must
   map `/api/otc/collect` to `/api/system?route=otc&action=collect`.
2. Apply `neon/016_otc_scheduler_health.sql` after 013/014, or verify that the existing
   runtime idempotent schema initialization succeeded with the deployed DB role.
3. In the production server environment set a strong random `CRON_SECRET` (32 random
   bytes or more). If already used by other jobs, reuse its existing value rather
   than rotating it blindly. Never use a `VITE_` variable, URL parameter, source
   file, screenshot, shared terminal history, or chat to transfer the secret.
   The scheduler operator is trusted with collector authority. Use protected
   account access and keep request headers/credentials private.
4. Leave the minute Vercel cron disabled. Existing daily financial cron jobs stay
   unchanged. Confirm with `node scripts/configure-otc-scheduler.mjs --check`.
5. In Admin enable all-asset background collection. This durable permission is
   separate from the scheduler; a successful HTTP 200 can mean it was skipped.

## Create the job in cron-job.org

After confirming the deployed prerequisites, create exactly one job:

| Setting | Value |
| --- | --- |
| Title | InitOption OTC collector |
| URL | `https://www.initoption.com/api/otc/collect` |
| Method | GET |
| Schedule | Every minute, all hours/days |
| Request header | `Authorization: Bearer <the existing server CRON_SECRET>` |
| Timeout | 30 seconds, if permitted by the free service |
| Redirects | Do not follow, if configurable; use the final HTTPS hostname |
| Failure notifications | Enable email notifications where available |
| Response-body saving | Disable where available |

Do not put the secret in the URL or use HTTP Basic authentication instead of the
Authorization header. Do not grant this provider database credentials or admin login.
If the free service cannot provide the required header, interval, or useful timeout,
stop rather than paying or silently choosing a shorter unsupported timeout. A client
timeout does not prove the Function stopped; the DB lease protects overlapping cycles.

A 200 or 202 response alone is insufficient:
- `skipped: true`: disabled or another cycle owns the lease; no new work proven.
- `skipped: false` with processed assets: real collection work.
- 202: partial catalog progress, not every asset caught up.
- 401: wrong secret; 503: missing secret, DB/collection failure; inspect server logs.
- HTML/404/redirect: wrong deployment/rewrite/domain; do not count as healthy.

## Explicit one-cycle smoke test

From a trusted local environment with `CRON_SECRET` already securely loaded:

```sh
OTC_ORIGIN=https://www.initoption.com node scripts/test-otc-scheduler.mjs --run
```

This invokes real work and records a scheduled-call observation. It never prints
credentials or raw response bodies, refuses redirects/non-HTTPS URLs, and reports
skips/errors as failures. It is **not** evidence that cron-job.org is running.

## Browser-closed acceptance test

1. Trigger one test in the scheduler console and inspect its job history/body privately.
2. Close all InitOption browser tabs. Leave the enabled job untouched for at least
   five minute boundaries; do not use the smoke test or manual collection meanwhile.
3. Inspect scheduler history: multiple independent timed calls, no auth/timeouts/errors.
4. Reopen Admin and inspect the separate scheduler receipt/completion timestamps,
   consecutive successes and every asset's freshness. At least two successful work
   cycles and all 141 assets within the configured 120s window are required by
   current health rules. One manually triggered call cannot prove autonomous operation.
5. Open NEAR: confirm its authoritative timestamps/sequences advance and fresh price
   requests succeed. Scheduling is not proof that the separate active-chart freeze
   has been diagnosed or repaired. Do not place real-money test trades.

If the service remains lagging, measure DB latency, cycle duration and remaining
assets. Do not promise 141 assets/minute or increase paid resources automatically.
Free scheduling and hosting have no guaranteed uptime. Review Function and database
usage regularly, including the host's permitted-use terms for this trading service.

## Stop / rollback

Disable the external job first, then disable collection in Admin. Already running
work can finish. Keep recorded candles/state. Revoke/rotate a compromised secret
across all legitimate consumers together; never expose it to confirm a diagnosis.
