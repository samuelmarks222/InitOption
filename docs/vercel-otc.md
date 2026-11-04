# OTC pricing on Vercel, without a separate application host

## Deployment configuration

The dashboard now defaults to native HTTP requests to **`/api/otc` on the same
website**. Do not enter a placeholder OTC hostname. A persistent Node/WebSocket
service, background timer, cron generator, or local pricing volume is not needed.

Vercel environment settings:

```dotenv
VITE_MARKET_DATA_MODE=internal-otc
VITE_OTC_TRANSPORT=http
VITE_OTC_API_URL=/api/otc
DATABASE_URL=<the existing server-side PostgreSQL connection>
```

`DATABASE_URL` is already used by this application's API. Keep it encrypted and
server-only; never name it `VITE_DATABASE_URL`, embed it in browser code, or paste
it in chat. `VITE_OTC_WS_URL` and `VITE_OTC_HTTP_URL` are ignored in HTTP mode.
Remove any old `VITE_OTC_TRANSPORT=websocket` setting. Rebuild/redeploy after
changing Vite variables.

The endpoint lazily creates its three pricing tables using an idempotent,
transaction-locked bootstrap. The existing database role must own/create the
private tables and bypass their RLS as their owner. If the deployment role does
not have DDL permission, an authorized database administrator must first apply:

```sh
DATABASE_URL=... node neon/apply_schema.mjs neon/013_otc_serverless.sql
```

Do not grant browser/public roles access to these tables. The generic browser DB
API's table allowlist intentionally does not include them. Production database
credentials were **not** available in this coding workspace, so live schema
installation and production deployment have not been verified here.

After deploying, verify:

- `/api/otc?action=health` reports healthy PostgreSQL storage.
- `/api/otc?symbol=AAPL` returns a snapshot of platform-generated ticks and candles.
- The browser makes sequential requests with `after=<cursor>` and receives batches.
- The existing dashboard chart displays the **Platform-generated OTC prices** badge.

If health returns 503, fix the server-side database connection/permissions; no
random browser fallback or separate OTC hostname is necessary. Local `npm run dev`
serves this same API through Vite and requires `DATABASE_URL` in the shell or a
local environment file. Vite's private variable is not included in client defines.

## Serverless architecture

`api/_lib/otcHandler.ts`, dispatched by the existing `api/system.ts` Function, uses the existing `pg` PostgreSQL adapter. The pricing engine itself
uses native JavaScript/Node crypto and the existing Brownian model. The native
Canvas renderer and dashboard UI are preserved, with no added charting framework.
PGlite is a **test-only development dependency**, not production pricing storage.

The database is the sole authority for each symbol:

- `otc_markets`: private random secret, immutable-at-creation model configuration,
  session identity, complete model checkpoint and generation cursor.
- `otc_ticks`: original decimal tick price keyed by `(symbol, slot)`.
- `otc_bars`: server-aggregated 5-second OHLC/volume for efficient history hydration.

A slot is a globally aligned 100ms interval; its timestamp is transmitted as epoch
microseconds. Each request locks the symbol's state row **FOR UPDATE**, advances
from its persisted checkpoint, bulk-inserts new ticks/bars, and commits the new
checkpoint atomically. `ON CONFLICT DO NOTHING` plus the row lock serializes first
initialization and concurrent cold workers. Failure rolls back all three tables.
Different symbols do not share the same row lock.

The private per-market HMAC random stream is indexed by slot/draw. Model parameters,
regime duration/drift, price and cursor are checkpointed. Producing ten ticks in
one request or several smaller requests gives identical results. Neither user
positions, investment amounts, account balances, browser clocks nor client-supplied
prices affect the process. Prices are **internal synthetic OTC instruments**, not
exchange quotes. Secrets are never included in public responses.

### Timing and inactivity

This is **lazy server-side generation**, not an always-running clock process.
When nobody requests an asset, its next slots are not physically written yet.
On the next request, the server deterministically advances the same process to the
requested server time. The first session includes five minutes of explicitly
synthetic warm-up history. Browser code does not generate prices or interpolate
between them.

A request generates at most 5000 slots (about 8.3 minutes). This bounds CPU/SQL work
per Function invocation. After long inactivity, several sequential calls may be
needed. Tick responses mark `catchingUp`; the frontend withholds incomplete
history, requests another batch and hydrates only when caught up. Price requests
return retryable 409 while catching up rather than using an old price as current.
Large idle gaps can take time and incur database/function costs; instantaneous
recovery is not promised.

The frontend targets a 100ms start-to-start polling cadence, never overlaps requests, and retries with
backoff, aborts timeouts and shares one request loop per URL/symbol within the tab.
It processes every returned 100ms tick synchronously; Canvas RAF batches paints
only. Several ticks may arrive in one network response. **This does not promise
10 network updates per second or permanent native WebSockets on Vercel.** Adding
another user does not create a new price path, but does create additional reads.

### History and limits

Snapshots contain at most 3001 recent raw ticks plus up to 20000 actual stored 5s
bars. Those bars reconstruct all supported intervals, including 4h, without
sending an entire day's ticks to the browser. The store retains approximately 24h
of ticks and bars; cleanup is transactional and periodic while advancing. A newly
initialized instrument has only its warm-up history, not a fabricated full day.
Prices beyond retention are unavailable and must not settle trades by substitution.

At continuous activity, 10Hz means **864,000 tick rows per asset per day**. Plan
PostgreSQL storage, connection pooling, indexes, backups, rate limiting and Vercel
invocation costs accordingly. There is no universal throughput/free-tier guarantee.
The default retention must not be shortened below unsettled trade recovery needs.
Dedicated database backups/archival and operational recovery remain necessary.

## Routes and trading behavior

- `GET /api/otc?action=ticks&symbol=AAPL[&after=<slot>]`
- `GET /api/otc?action=price&symbol=AAPL[&at=<epoch-seconds>]`
- `GET /api/otc?action=health`

Legacy HTTP `/otc/price`, `/otc/history`, `/otc/health` paths rewrite to the same
Function on Vercel. `/otc/ticks` WebSocket is not used in the default deployment.

Entry and expiry helpers use the same database-backed endpoint. Expiry returns
the final stored tick at or before the specified time. Future requests return
425; missing/pruned history returns 409. Database failures return 503. Entry is
blocked if a valid quote cannot be obtained; existing expiry retry/pending behavior
remains. Tick display, chart history and price receipts refer to the same data.

**Remaining financial boundary:** trade inserts, settlement persistence and balance
updates still use the application's existing client-driven backend flow. This
patch does not implement authenticated server-enforced trade creation, receipt
verification, atomic balances, or tamper-proof settlement/audit enforcement. Those,
algorithm version governance, abuse controls, production load/security review and
real-device acceptance remain prerequisites for real-money production sign-off.

## Tests

```sh
node --test server/otc/serverless.test.mjs
npx vitest run --config vitest.chart.config.ts src/test/internalOTCHttpFeed.test.ts
npm run build
```

The SQL tests use the actual PostgreSQL engine compiled to WASM (PGlite), covering
persistence across independent engine instances, concurrent callers, slot identity,
checkpoint/batch equivalence, rollback, expiry stability, schema consistency and
catch-up progress. PGlite uses one connection; this is not a substitute for a
multi-connection Neon/Vercel production concurrency/load test. Frontend tests cover
same-origin batching, pooling, non-overlapping requests, history hydration,
catch-up withholding, failure/retry and no client price generation.


## API deployment type checking

The Vercel build runs `npm run typecheck:otc-api` before the frontend build.
This checks the OTC entry point and its dependencies with ES2020 libraries and
JSON-module imports disabled, independently of the frontend TypeScript project.
The asset catalog is read server-side from the file explicitly included in the
Function bundle; it does not require `resolveJsonModule`. The pricing engine's
`.d.mts` declaration defines its transaction executor, asset registry and response
contract. Compile-only negative tests ensure required options stay required.
The API uses an ES2020-compatible own-property check, not `Object.hasOwn`.


## Vercel Hobby function budget

OTC is dispatched inside the existing `api/system.ts` Function, rather than as
an additional Function. Rewrites preserve `/api/otc` and all documented legacy
HTTP paths; frontend URLs and environment settings do not change. Pricing code
lives in the non-entry-point `api/_lib/otcHandler.ts` helper. Catalog file inclusion
and the 30-second duration setting belong to `api/system.ts`.

`npm run check:vercel-functions` counts deployable source entry points, excluding
underscore helpers and TypeScript declarations. The current count is **12**.
This guard runs before Vercel's API typecheck and frontend build, and rejects
future additions that exceed the Hobby budget. The actual deployed Function
count must still be confirmed after Vercel packages the next deployment.


### Candle cadence and order diagnostics

Successful HTTP polls now target the 100ms source interval (measured with the
monotonic browser clock), rather than waiting 500ms after each response. This
reduces coalescing of multiple source ticks into a single Canvas paint without
interpolating prices, smoothing OHLC, or replaying stale ticks as live prices.
Slow network/database responses still arrive in batches and cannot guarantee
100ms screen updates. Connections remain pooled per URL/symbol within a browser;
this is **not** cross-user pooling. At low latency this can issue up to 10 requests
per second per active symbol/browser, so production database contention and
Vercel request usage must be monitored. This is not a production load-test result.

Both OTC price services provide `quotedAt`. Freshness validation compares the
receipt timestamp to that server timestamp instead of the device wall clock;
expiry requests retain the strict at/before-expiry and 500ms tolerance checks.
Demo countdown/retry scheduling uses the existing synchronized clock, as live
countdowns already do. The client requests a fresh quote for execution and never
substitutes a cached chart price when pricing is unavailable.

Demo entry quote failures now show an error rather than silently returning false.
The order panel also shows an opening state, serializes in-flight submissions,
and reports thrown handler failures. Live entry quote errors include the pricing
failure reason. These changes do not repair or certify the existing financial
ledger: authenticated production placement/persistence must still be verified,
and server-side atomic financial accounting remains a separate requirement.

The signal/desk path also now correctly adapts its object-based order to the
positional dashboard handlers. Previously the panel sent positional arguments to
an object-based context function, the provider forwarded an object to positional
handlers, and an unset `currentAsset` silently prevented execution. Orders now
validate their explicit symbol/parameters without requiring the selected chart.
Account selection and demo balance follow the page props on subsequent renders
instead of staying frozen at mount. Regression tests cover the adapter, malformed
orders, fresh demo balances, and demo/live/tournament routing after account switches.

Validation for this change: 140 targeted tests passed across 17 files; production
build, both API typechecks, and the 12/12 Function budget guard passed. The broad
application typecheck is not clean (existing unrelated typing errors remain).
Authenticated production trade execution and real-network cadence/load are not
verified by these mocked transport/context checks.


### Retained history pages and independent zoom

The existing `/api/otc` handler now accepts `action=history` with `seconds`, an
exclusive aligned Unix-seconds `before`, and `limit` (1–1000). It returns ordered
closed candles, `hasMore`, and the earliest stored 5s timestamp. This read-only
archive path aggregates server bars without creating ticks or accepting client
prices. It uses the same private DB connection/schema and existing system Function.
No additional environment variable, host, migration, or Function is required.

Raw ticks remain retained for 24h; candle bars now default to 30 days via the
server module's independent `barRetention` option. Existing already-deleted data
cannot be restored. First-instrument warm-up is now zero; see the recorded-only policy below. Browser windows
remain bounded to 7200 candles, with a visible limit message and a recommendation
to use a larger interval for longer coverage. It is not honest to promise unlimited
history or candles predating the pricing system. Database storage/query usage for
longer retention must be monitored before assuming production capacity.

Zoom controls now follow independent time/price domains: wheel/buttons/pinch for
time, Ctrl+wheel/right-axis gestures for price, and axis/plot double-click resets.
The previous combined two-axis zoom behavior is superseded.

### Current policy: recorded ticks only; background collector activation required

Generated analysis history has been removed at the user's direction. History
reads query persisted tick-derived bars only and do not initialize a market or
create an earlier price path. Clients reject `generated: true` and non-recorded
provenance, and discard old generated/mixed browser-cache entries. Existing
`historyBootstrapV1` config metadata is ignored; recorded tables are not deleted.
New serverless markets start at observation time (`warmup: 0` by default), not
with a fabricated five-minute past. Existing retained tick-derived bars remain.
The source is still the platform's explicitly synthetic internal OTC engine, not
an external exchange feed. No external prices are being represented as OTC history.

`GET /api/otc?action=collect` is an authenticated collection entry point within
the existing system Function. It requires an exact Authorization Bearer token
matching private `CRON_SECRET`; no secret means 503, bad/missing token means 401,
and query-string credentials are not accepted. Never put this secret in a VITE
variable or browser code. It uses the same asset-specific checkpoint, private
randomness, row lock, tick sequence and bar writes as live requests, without a
parallel candle generator. No user position or balance is consulted.

The collector attempts all configured symbols, missing assets first then oldest
checkpoint first, using a 10-second soft work-start budget. Long database calls
can exceed that soft budget, and Functions still have their existing timeout.
A bounded-backlog/budget-limited cycle returns 202 with `result.complete: false`,
processed cursors and remaining count inside `result`; collection errors return
503 with their per-asset error details, and a fully current cycle returns 200.
Disabled or already-running cycles return 200 with `skipped: true` and a reason. Repeated
calls resume from database checkpoints. Scheduler operators must inspect these
results and collection lag, not assume 202 means all assets are current. A durable
60-second lease prevents overlapping collection cycles; the per-asset serialized
tick writer still protects races with live requests. A timed-out cycle can be
resumed after its lease expires. Capacity/load must be measured for all
141 assets, 100ms source slots, database storage, and the required freshness target.

**Activation is pending.** No cron has been added to `vercel.json`, and no billing,
secret or hosting setting has been changed. The connected team was last verified
as Hobby: daily cron cannot meet frequent background collection. A supported
frequent scheduler is required (e.g. an approved Pro cron configuration, or an
approved scheduler supported by the existing infrastructure). Once provisioned,
it must call the protected entry point regularly even with zero visitors, and
monitor lag/failures. The existing daily jobs are unrelated and not a substitute.
Use the actual deployment URL, for example a scheduler-managed request equivalent
to `curl --fail "$APP_URL/api/otc?action=collect" -H "Authorization: Bearer $CRON_SECRET"`.
Note that curl success on 202 still requires inspecting `result.complete`; 200
with `skipped: true` is not evidence any work was done.

Stored history now begins loading after feed setup rather than waiting for a
live status, retains per-asset/timeframe cache isolation, and merges live hydration
with the archive. Normal network latency cannot be eliminated. An asset with no
recorded ticks cannot truthfully have past candles; display loading/empty/earliest
states rather than invent history. A 4h candle needs a real observation interval
to accumulate. All-asset prepopulation and continuous operation cannot be claimed
until a scheduler is enabled and observed successfully across all assets.

### Admin: enable background history for the entire OTC catalog

The admin **Asset Library** now includes **Background history collection**.
**Enable all assets & collect now** persists a global server-side setting and
requests one initial collection cycle for every symbol in `server/otc/assets.json`,
without opening charts. It does not modify `assets_config` trading availability,
payouts, live chart prices, or recorded history. The pricing catalog can differ
from the broader asset library; only supported OTC engine symbols are collected.
**Run one cycle** is a bounded manual action, not an always-running worker.
Disabling preserves recorded data and does not stop live ticks for viewed assets;
an already-running cycle may finish after disable.

Private migration `neon/014_otc_collection_control.sql` stores the singleton
setting, modifying administrator, last cycle/result/error, and expiring worker
lease. The existing Function lazily applies the identical idempotent DDL under its
schema lock. The table is RLS-protected, revoked from PUBLIC and is not added to
the browser database allowlist. It starts **disabled**, with no inferred enablement.

Admin routes on the existing `/api/otc` Function:
- GET `action=collection-settings`: saved setting and checkpoint/cycle health.
- POST `action=collection-settings`, JSON `{ "enabled": true|false }`: global switch.
- POST `action=collection-run`: one cycle, only if globally enabled and not leased.

All admin operations require a remotely verified Appwrite session and a server-side
`user_roles.role = 'admin'` lookup. Missing authentication is 401, non-admin is 403,
and non-boolean settings are 400. This privileged route does not use the legacy
unverified identity fallback when Appwrite is unconfigured. CRON_SECRET cannot
administer settings, and no scheduler secret is sent to the browser.

The protected scheduler `action=collect` now honors the same durable enable switch
and lease. The admin page polls **status only** every 30 seconds, never collection.
Status shows initialized/missing catalog assets, checkpoints within 60 seconds,
maximum initialized-asset lag, last cycle result, and errors. Viewed assets can
advance checkpoints too: freshness is not proof that the scheduler is running.
"Recent cycle" is historical evidence of one finished invocation, not a claim of
continuous operation. Configured CRON_SECRET is explicitly not scheduler proof.

No scheduler, environment secret, plan upgrade or production DB change was made
by this code change. After deployment, an administrator can enable and initialize
all catalog assets; sustained unattended history still needs an approved frequent
scheduler and measured all-asset capacity/freshness. No pre-recording candles are
fabricated and source slots filled from the persisted OTC engine checkpoint are
not represented as external exchange observations.

### Live feed freeze recovery

The same-origin HTTP transport now bounds both response fetch and JSON decoding
with a 10-second timeout. Aborted/timed-out responses cannot later overwrite a
recovered stream. Repeated non-advancing cursors for 10 seconds (or an authoritative
server timestamp over 10 seconds ahead of its newest tick without catchingUp)
trigger reconnecting state and a fresh snapshot request, not a false live state.
An empty initial snapshot is not considered a live price.

Each chart/history/status/error consumer is isolated so a failing view cannot
starve other subscribers. Quote subscribers are isolated too, with one warning
per failing subscriber rather than a log flood. Foreground visibility and online
restoration wake idle polling immediately without overlapping an in-flight poll;
listeners and timeouts are removed when the shared stream is disposed.

These changes add no browser-generated prices, candle history, countdown overlay,
or pricing/status banner. Catch-up history still waits for the authoritative
server backlog to complete; server/database outages cannot be repaired by client
animation. Source ticks remain 100ms logical steps, not a guaranteed 100ms HTTP
arrival rate. Tests cover hung fetches, late responses, stagnant cursors, empty
snapshots, callback failures, connectivity/visibility recovery and cleanup.

**24/7 unattended all-asset recording remains a separate deployment requirement.**
The admin enable switch is not a scheduler. No frequent cron, worker, billing or
hosting change was made by this recovery fix. See the activation-pending section
above. The reported production freeze's exact cause has not been established from
live runtime responses; this is local transport hardening, not proof that the
production collector is running continuously.

### Opt-in Vercel scheduler implementation

See [OTC scheduler activation](otc-scheduler-activation.md) for the new protected
cron alias, guarded local configuration command, migration 016, four-way collection,
separate scheduled-run health, capacity caveats and rollout/rollback checklist.
This supersedes the earlier collector implementation details but does **not** mean
that a frequent schedule has been activated or a hosting upgrade approved.

## No-upgrade external scheduling

The approved external-trigger setup, secure cron-job.org configuration, smoke test,
browser-closed verification and rollback are documented in
[OTC external scheduler](./otc-external-scheduler.md). This is not yet activated in
production and does not remove Function/database limits.
