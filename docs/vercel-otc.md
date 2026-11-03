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

The frontend polls every 500ms after the previous response completes, retries with
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
