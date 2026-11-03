# Dashboard-integrated platform-generated OTC pricing

This service is now connected to **the existing dashboard chart**, not a second
HTML page. The chart retains the original native Canvas renderer and the existing
React dashboard, settings, indicators, drawings and trading controls. No financial
rendering library or new server dependency is used.

## Run locally

```sh
npm ci
npm run dev
```

The Vite development server attaches the native OTC HTTP/WebSocket service to its
own HTTP server. Open the existing dashboard on port 8080 and select an asset.
The frontend defaults to `internal-otc` mode, connects to same-origin
`/otc/ticks`, subscribes by symbol, loads server history, then receives prices
at 100ms cadence. There is no client price generator or external-feed requirement.
The chart explicitly displays **Platform-generated OTC prices**.

The **server**, not a browser, owns nominal starting prices, Brownian parameters,
symbol identities, timestamps and sequences in `assets.json`. The catalog contains
141 existing library symbols. These are internal synthetic instruments, not a
claim to quote Apple shares, crypto exchanges or actual forex. Unlisted/custom
assets must first be provisioned in the server catalog; unknown symbols fail
rather than accepting a client's suggested base price. All users/subscribers of
a symbol receive the same stream, independent of timeframe, account type,
positions and balances. Once registered, a stream continues without viewers.

## Production deployment is required separately

A static Vite build **does not contain a running pricing server**. Merging this
change into a serverless/static dashboard deployment alone is not enough.
Deploy the long-lived Node service on a persistent Node/container host:

```sh
OTC_DATA_DIR=/persistent/otc PORT=8092 npm run otc:server
# Or build from the repository root:
docker build -f server/otc/Dockerfile -t initoption-otc .
docker run -p 8092:8092 -v otc-data:/data initoption-otc
```

Prefer reverse-proxying `/otc/*` from the dashboard origin to this service,
including the WebSocket upgrade. Otherwise configure these **dashboard build**
variables and rebuild/redeploy:

```dotenv
VITE_MARKET_DATA_MODE=internal-otc
VITE_OTC_WS_URL=wss://your-otc-service.example/otc/ticks
VITE_OTC_HTTP_URL=https://your-otc-service.example/otc/price
```

On that service, set `OTC_ORIGIN=https://your-dashboard.example` for exact browser
Origin checking and HTTP CORS. The public URLs are not secrets. Do not point a
production dashboard at an ephemeral development preview. Static/serverless
hosting cannot run this continuous in-memory WebSocket service as an ordinary
short-lived API handler. No production hosting configuration has been changed by
this patch.

Only **one pricing owner** may write each journal/stream. Do not run independent
replicas behind a round-robin proxy: they would create divergent markets. Scale
using a dedicated owner plus shared durable event transport/storage before adding
replicas. The sample service limits clients to 200, retains 50,000 ticks per
registered symbol, and bounds recovery input to two daily files of at most 512MB
each. High-volume deployments need journal segmentation/external archival and
capacity/load testing; they must not discard unexpired trade history.

## Protocol and pricing receipts

- WebSocket: `/otc/ticks`; send `{"type":"subscribe","symbol":"AAPL"}`.
- Snapshot: `{type, source:"internal-otc", session, symbol, precision, ticks}`.
- Tick: `{symbol,t:"epoch-microseconds",p:"decimal-price",sequence,source:"internal-otc"}`.
- History: `GET /otc/history?symbol=AAPL`.
- Current receipt: `GET /otc/price?symbol=AAPL`.
- Expiry receipt: `GET /otc/price?symbol=AAPL&at=<epoch-seconds>`.
- Health: `GET /otc/health`.

An expiry receipt uses the final server tick **at or before** the requested time,
with at most 0.5s staleness. Future expiry requests return 425. Unknown assets,
unavailable retained history or gaps fail explicitly. There is no nearest future
price, selected-tab price, random outcome or fallback substitution. Ten ticks per
second is an event-loop schedule, not a hard real-time promise.

Streams are bootstrapped once with 3000 explicitly synthetic warm-up ticks (five
minutes). Journals preserve observed sequences/price history across process
restarts. Append batches are flushed to disk, SHA-256 chained per daily file,
and validated during recovery. Corrupt/truncated logs fail closed; operator
recovery is required. These hash chains detect accidental modification; without
independently anchored hashes they are **not tamper-proof financial audit proof**.
Backups, retention policy, disk monitoring and independent audit remain required.

The frontend shares transport by URL/symbol, hydrates OHLC from snapshots, and
rebuilds timeframe arrays from received history. Asset quotes, tab sparklines and
pair-info history no longer use an independent deterministic price generator in
internal mode. Unobserved asset rows show a nominal catalog baseline, not a fresh
market quote; full 24h statistics are not fabricated. Availability/payout profile
logic remains the application's existing independent logic.

## Trading integration and remaining financial boundary

Live/tournament trade entry now requests an exact-symbol server price receipt.
Demo entry does the same. Expiry calculations request the exact-symbol historical
receipt, not the currently selected tab's latest price. Unavailable entry receipts
block opening; unavailable expiry receipts keep results pending. Existing official
settlement acknowledgement and win-notice logic is preserved.

**This does not make the entire financial ledger server-authoritative.** Existing
trade inserts, outcome persistence and balance updates still use the application's
existing client-driven API flow. Browser users could tamper with that flow unless
the authenticated backend enforces receipts, timestamps, payout rules, ownership
and atomic balance transactions. Moving that complete lifecycle into an
authenticated transaction service is still required before real-money production
sign-off. The price service is read-only and cannot enforce those transactions
by itself. It deliberately does not accept trades or select prices based on them.

## Validation

```sh
npm run otc:test
node --test native-chart/*.test.mjs
npx vitest run --config vitest.chart.config.ts src/test/internalOTCFeed.test.ts src/test/settlementConfirmation.test.tsx
npm run build
```

Tests cover shared identical prices despite client-supplied parameters, stream
continuity without viewers, symbol isolation, stable expiry receipts, restart
recovery/corruption rejection, native browser adapter pooling/reconnect/history,
invalid/duplicate data, server quote entry and existing settlement-notice rules.
Manual authenticated dashboard, mobile gestures/drawings/indicator persistence,
outage/power-loss recovery and production load/security review remain outstanding.
