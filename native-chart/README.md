# Zero-dependency native Canvas chart

This is the **dependency-free implementation** requested after the previous
bundled/compatibility implementation. It is independent of the dashboard and of
`financial-chart/`. It does not import their renderer, types, adapters or code.

## Run without npm, installation, or a build step

Requires Node.js 22+ (tests use Node's built-in WebSocket client):

```sh
node native-chart/server.mjs
```

Open port **8091**. The chart connects automatically. The server binds to
`0.0.0.0`; HTTP and browser WebSockets use the same host, including HTTPS preview
proxies. To use another port: `PORT=9000 node native-chart/server.mjs`.

### Deliverables

- **`chart.html`**: complete, readable standalone HTML, local CSS and inline native
  JavaScript. No imports, frameworks, financial chart libraries, CDN assets,
  transpilation, generated bundle, or unresolved template placeholders.
- **`server.mjs`**: HTTP delivery, bounded snapshot history, 100 ms streaming,
  monotonic epoch-microsecond clock, heartbeat, connection limit and cleanup.
- **`simulation.mjs`**: Arithmetic Brownian motion, adjustable drift/volatility,
  randomly changing 2–8 second trend/consolidation regimes, and soft
  support/resistance drift forces.
- **`websocket.mjs`**: original RFC 6455 text transport using `node:http`, TCP
  sockets and `node:crypto`. No `ws` package. Validates the upgrade, masked frames,
  fragmented messages, UTF-8, control frames and bounded client messages. Handles
  ping/pong, closing, and outbound slow consumers.

## Data and rendering contract

Each streamed tick has exactly two fields:

```json
{"t":"1793790000123456","p":"100.12345678"}
```

`t` is epoch **microseconds**, encoded as a decimal string. The server anchors
`process.hrtime.bigint()` to epoch time and guarantees increasing timestamps.
The 100 ms interval is an event-loop schedule, not a hard real-time timing
promise. Event-loop delays remain reflected in actual tick timestamps.

`p` is a decimal string with configurable precision (default 8 places). Original
text is retained for the quote; numeric comparisons/projections use JavaScript
IEEE-754 numbers. This is not an arbitrary-precision accounting engine.

The first message is an explicitly tagged simulation snapshot:

```json
{"type":"snapshot","mode":"simulation","precision":8,"ticks":[]}
```

The actual array contains retained simulated ticks. By default the server creates
3000 synthetic warm-up ticks (5 minutes), using the same Brownian model, so the
chart starts populated. Set `WARMUP_TICKS=0` to begin completely empty. All warm-up
and streamed values are **simulated**, never actual exchange prices; the banner
remains visible. This read-only service must not settle real-money trades.

The frontend has a fixed-capacity circular tick queue. Invalid, duplicate and
out-of-order timestamps are rejected, not replaced with arrival times. Incoming
prices synchronously set OHLC and the latest quote. First tick opens a candle,
high/low accumulate actual extrema, and latest tick sets close. Reversals are
immediate. The laser line tracks the actual latest tick, including in HA mode.
No tick means hold price. RAF coalesces paints only—no price interpolation,
body/wick easing, sine waves or client-side random motion.

All fifteen intervals from 5s through 4h use epoch-aligned timestamp boundaries.
Changing interval reconstructs OHLC from the same retained raw queue, not a new
feed. Canvas dimensions/zoom count are independent of interval. Historical
navigation retains a market-time anchor on interval/type changes. Buffer eviction
corrects the first partially retained candle. Missing intervals are not invented.
Area locks to 5s and restores the prior interval; Heikin-Ashi uses recursive math.

The renderer draws only visible candles. Vertical bounds are their min low and
max high plus exactly **10%** of the visible range at each end (a minimal span
handles flat prices). Offscreen candles, the laser line and SMA do not alter that
scale. It includes gridlines, decimal price/time axes, bullish/bearish candles,
thin wicks, dashed laser line, crosshair inspection, SMA 20, wheel zoom,
shift-wheel pan, pointer drag, two-finger pinch, fit/resume and responsive DPR
backing-store resizing. DPR is capped at 4 to bound canvas memory. Values are
not modified by paints or gestures. Date labels use UTC.

## Configuration

| Environment variable | Default | Meaning |
|---|---:|---|
| `PORT` | 8091 | HTTP and WS port |
| `PRICE` | 100 | Initial simulated price |
| `DRIFT` | 0 | Baseline price units/second |
| `VOLATILITY` | .06 | Price units/sqrt(second) |
| `PRECISION` | 8 | Decimal places, 0–10 |
| `SUPPORT` / `RESISTANCE` | 98 / 102 | Soft drift-force boundaries |
| `BOUNDARY_STRENGTH` | .08 | Boundary mean-reversion force |
| `TICK_DEPTH` | 50000 | Server retention, max 1000000 |
| `WARMUP_TICKS` | 3000 | Generated initial simulation history; must not exceed depth |
| `CHART_ORIGIN` | unset | Optional exact allowed browser Origin, e.g. https://chart.example |

Frontend retention defaults to 50000 ticks in `new TickStore()`; align that
capacity with a larger server depth before increasing `TICK_DEPTH`. At 10 Hz the
default is about 83 minutes. Supporting 4h aggregation does not imply retaining
multiple complete 4h candles; increase both capacities for longer lookbacks.
Support/resistance affect drift; they are not guaranteed hard price bounds.

## Test with Node built-ins only

```sh
node --test native-chart/*.test.mjs
```

Tests cover precise reversals, bounded raw history and eviction, all intervals,
5s/4h boundaries, 20000-tick reconstruction, recursive HA, Area restore,
disconnection hold, visible-only 10% scaling, DPR 2/mobile-size resizing,
real native WebSocket streaming/microsecond payloads, HTTP delivery, malformed
handshakes, masking, fragmented UTF-8/TCP splitting, interleaved ping,
invalid text, message-size limits and slow consumers.

## Scope and deployment

Existing dashboard layout, trading controls, balances, indicators and drawings
are unchanged. This is a standalone chart/simulation deliverable, not a silent
swap of live market feeds or a real-money trading backend. Existing legacy repo
financial packages are not used by this implementation; they need not be installed
to run it. Older companion implementations remain unchanged for compatibility.

For public deployment, use a TLS reverse proxy with WebSocket upgrade support,
configure an allowed Origin, external connection/rate limiting, monitoring and
the platform's authentication policy. This custom transport has automated protocol
checks, but has **not** undergone independent security review/Autobahn conformance
or full-load soak testing. Canvas tests use mocks; physical mobile/multi-touch,
visual browser/device QA and sustained-load acceptance remain necessary before
claiming production sign-off. No claim of universal flicker-free operation or
hard real-time scheduling is made.
