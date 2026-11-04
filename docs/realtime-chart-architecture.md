# Real-Time Trading Chart Architecture

This project now uses a stricter real-time candle pipeline built around three layers:

1. `src/components/trading/engine/marketDataFeed.ts`
   Frontend market-data adapter.
   Uses a real WebSocket feed when `VITE_MARKET_DATA_WS_URL` is configured.
   Reports unavailable when no URL is configured; never generates fallback ticks.

2. `src/components/trading/CandleAggregator.ts`
   Time-bound OHLC aggregator.
   Builds candles from ticks.
   Closes candles exactly on timeframe boundaries, even if the next tick has not arrived yet.
   Opens the next candle immediately with `open = last close`.
   Delivers OHLC updates synchronously for every valid tick; Canvas batches paints only.

3. `src/components/trading/TradingChart.tsx`
   Presentation layer.
   Loads previously observed ticks only (no generated history).
   Streams live ticks into the aggregator.
   Updates the Lightweight Charts series, overlays, price scale, and time scale.

## Tick Contract

Recommended backend tick payload:

```json
{
  "type": "tick",
  "symbol": "EUR/USD",
  "price": 1.08452,
  "timestamp": 1763923200.245,
  "sequence": 94832014
}
```

Rules:

- `timestamp` should be exchange/feed time in Unix seconds.
- `sequence` should be monotonic per symbol so out-of-order ticks can be ignored safely.
- Price normalization belongs in the market-data gateway, not in the chart client.

## Candle Rules

For every timeframe bucket:

- `open` = first tick in the bucket
- `high` = max price seen in the bucket
- `low` = min price seen in the bucket
- `close` = latest tick in the bucket

Boundary behavior:

- A candle closes when `now >= candle.time + timeframeSeconds`
- If no new tick has arrived yet, the next candle still opens immediately
- The new candle is flat until the next live tick updates it
- Gaps are filled with flat candles based on the last close

## Production Backend Shape

Recommended server-side architecture for a scalable binary-options platform:

1. Market-data gateway
   Connect to exchange, LP, or internal OTC pricing engines.
   Normalize symbols, timestamps, and sequence IDs.

2. Tick fan-out layer
   Publish normalized ticks over WebSockets by symbol.
   Keep subscriptions symbol-scoped to reduce client bandwidth.

3. Historical snapshot service
   Return the latest closed candles plus the current in-progress candle seed.
   The frontend should not have to reconstruct long history from raw ticks.

4. Aggregation service
   Aggregate ticks into 1-second base candles server-side.
   Derive larger timeframes from the 1-second stream or stored minute/hour bars.

5. Persistence and replay
   Store ticks for audit/replay when needed.
   Store candles for fast history queries.

## Performance Notes

- Keep tick parsing allocation-light.
- Batch chart updates to RAF, not one paint per tick.
- Ignore out-of-order ticks by `sequence` or stale timestamps.
- Load history from candles, not raw tick replays.
- Derive higher timeframes from lower timeframe candles instead of recomputing from scratch on every tick.

## Current Repo Mapping

- Supported chart timeframes live in `src/components/trading/engine/priceEngine.ts`
- Live feed selection lives in `src/components/trading/engine/marketDataFeed.ts`
- Boundary-safe candle aggregation lives in `src/components/trading/CandleAggregator.ts`
- Chart rendering and UI wiring live in `src/components/trading/TradingChart.tsx`

## Native chart replacement (November 2026)

The trading dashboard and its oscillator panes now use the independent Canvas 2D
renderer in `engine/native/chart.ts`, not the Lightweight Charts renderer. The
older introductory description of a Lightweight Charts presentation layer above
is superseded by this section. The dependency's **type declarations only** are
retained at the adapter boundary so the existing SVG drawing, beacon, trade marker,
and indicator integrations can keep their coordinate contracts.

Modules:
- `native/timeframes.ts`: all fifteen supported intervals, epoch-aligned buckets.
- `native/marketData.ts`: sorted/deduplicated OHLC history, lower-interval
  aggregation, recursive Heikin-Ashi calculations (including the initial candle).
- `native/realtime.ts`: synchronous OHLC ingestion, timed closes, explicit
  zero-volume carry-forward intervals, batched visual callbacks and cleanup.
- `native/scales.ts`: invertible logical/time and price coordinates.
- `native/chart.ts`: device-pixel-ratio-aware candles, OHLC bars, area, line and
  histogram rendering, grid, axes, price lines, pointer crosshair, wheel zoom,
  horizontal drag/scroll, price-axis pan/zoom and touch pinch zoom.
- `native/compat.ts`: adapter exports for existing presentation components.

Chart type/appearance changes preserve the current logical viewport. Timeframe
views are retained per asset and timeframe when revisiting an interval. Drawing
objects and indicator settings stay in their existing contexts, outside series
lifecycle management. Empty intervals carry the last known price with zero volume;
they do not assert that any trades occurred while the feed was disconnected.

### Verification and outstanding integration work

`npm run build` passes. Minimal JSX syntax corrections in AssetSelector and
ChatDialog were necessary to unblock that build; neither component was redesigned.

The new native-engine/renderer tests and existing aggregator/timeframe contract
checks pass (31 tests). The complete chart test configuration currently reports
39 passed / 3 failed. The three remaining failures concern legacy deterministic
simulation tests: two reference the unsupported `1s` interval, and one expects
bidirectional synthetic drift. Those failures also occur on the baseline commit.
The new aggregation additionally fixes the previous 5m-vs-1m OHLC mismatch.

Run targeted validation:

```sh
npx vitest run --config vitest.chart.config.ts \
  src/test/nativeChartEngine.test.ts src/test/nativeChartRenderer.test.ts \
  src/test/realtimeCandleAggregator.test.ts src/test/priceEngineTimeframes.test.ts
npm run build
```

Not a production acceptance sign-off: Canvas calls are mocked in renderer tests.
Authenticated browser testing of all drawing tools, indicator settings, trade
placement, mobile gestures, and live WebSocket reconnects is still required.
Repository-wide TypeScript checking also reports existing errors outside the new
native engine.

### Follow-up: real-feed isolation and reconnect safety

`VITE_MARKET_DATA_WS_URL` selects the real socket; without it the pre-existing
explicitly simulated/demo feed is still used. The real-socket path now **never
calls the deterministic history generator or replay seeder**. It starts empty
when actual history is unavailable rather than drawing invented market prices.

`native/observedHistory.ts` stores a bounded, in-memory history of received ticks
as 5-second OHLC bars, isolated by socket source and symbol. All fifteen supported
intervals derive their observed history and active seed from these same bars.
Revisiting timeframes reuses this history. This is session history, not an exchange
historical-data service: missing periods stay absent in the store. The live
aggregator's zero-volume carry-forward intervals still represent a last-known
price, not recovered trades.

Socket reconnects preserve sequence/timestamp cursors. Feed recreation also checks
source-specific observed-history cursors to suppress repeated sequenced ticks.
Batch messages are sorted by exchange timestamp, then sequence. Manual disconnects
remove listeners before closing the socket, preventing an old close callback from
clearing a replacement connection. Constructor failures report an error and retry
with the existing bounded exponential backoff; pending retries are canceled on
manual disconnect. Sequence IDs must remain monotonic per source/symbol, as in the
existing tick contract.

The boundary timer no longer advances the last-exchange-tick timestamp to local
wall-clock time. Slightly delayed valid ticks within the new candle therefore
remain eligible; ticks belonging to a closed candle are still rejected by the live
aggregator. Invalid OHLC seed candles are rejected explicitly.

Follow-up tests cover cache bounds and source isolation, OHLC reaggregation for
all fifteen intervals, cursor persistence, reordered batches, stale socket events,
constructor failures, manual cleanup, invalid seeds, and delayed boundary ticks.
Run the earlier targeted command with these additional test files:

```sh
npx vitest run --config vitest.chart.config.ts \
  src/test/nativeChartEngine.test.ts src/test/nativeChartRenderer.test.ts \
  src/test/realtimeCandleAggregator.test.ts src/test/priceEngineTimeframes.test.ts \
  src/test/observedHistory.test.ts src/test/webSocketFeed.test.ts
```

Production real-history loading **before this session**, recovery of unobserved
exchange ticks, and correction of previously closed candles still require a server
history/replay contract. The existing socket protocol only provides tick
subscribe/unsubscribe messages. A renderer cannot reconstruct unobserved market
highs/lows, and this implementation does not claim to do so. Authenticated browser
acceptance testing and repository-wide existing TypeScript errors remain open.

## Additional chart behavior and confirmed winning notifications

### Rendering and interval separation

- `native/tickRendering.ts` projects each received candle directly into the series.
  Japanese candles and OHLC bars receive exact OHLC; Area receives the exact close.
  The Canvas renderer now eases the active candle presentation over 90ms (see below),
  without modifying these committed values. Heikin-Ashi uses proper recursive
  mathematical OHLC through `native/animation.ts` before presentation easing.
- Every valid tick commits synchronously. Indicators consume the latest raw OHLC
  once per animation frame, including wick-only updates. With no tick, the committed
  price holds; any pending presentation transition finishes, then rendering stops.
  Empty interval candles carry the last price with zero volume; the first actual
  tick sets that interval's open/high/low before updating its close.
- Writers are owned by the chart series, not feed subscriptions, so reconnecting
  or changing a timeframe cannot disable a retained series writer.
- `native/viewportAnimation.ts` eases live-follow movement separately from candle
  formation. User viewport changes interrupt following; historical navigation is
  not forced back to live. Candle duration remains controlled by interval buckets,
  not by requestAnimationFrame or notification timers.
- The aggregator and chart seed/backfill paths use the existing synchronized server
  clock. Successful clock synchronization reschedules boundary timers; a temporary
  sync failure retains the last valid offset. The chart starts periodic clock
  synchronization with `/api/time`.

### Area mode

`native/chartMode.ts` manages chart type and timeframe in one reducer transition.
Area (`line` in the existing UI's internal identifiers) always uses `5s`. Both the
mobile and desktop timeframe buttons are disabled in Area mode; other timeframe
options are not rendered. Timeframe actions are rejected by the reducer too, not
just hidden in the UI. Switching away restores the previous non-Area timeframe.
Drawing and indicator contexts, chart settings, and trading controls are retained.

### Winning notifications

The Trade page queues two compact designs: an emerald **TRADE WON** card and a
more prominent amber **BIG WIN!** card. Both show the asset, UP/DOWN direction,
investment, net profit, and gross payout in the trader's preferred currency.
Manual dismiss and independent 6-second / 8.5-second expiry are supported. At most
two cards are displayed concurrently on desktop and one on mobile; queued cards
start their expiry only when shown. Mobile cards sit near the top, away from the
bottom trade-entry controls. Motion-reduction preferences disable celebration animations.

The previous speculative popup call at local expiry has been removed. The trading
provider now checks settlement mutation errors and requires a matching returned
row whose persisted status is `won` or `lost` and which has a closing timestamp.
Only after successful settlement processing is that confirmed row queued for the
result UI. Notification amounts come from that row, not the locally predicted
payout rate. Accounting uses the same acknowledged payout. Losses and malformed,
open, or pending results cannot create winning cards. Provider queue/result IDs
and page notification IDs prevent duplicate announcements during processing.
Result queues are cleared when the active user changes.

**Admin configuration:** Platform Settings → Winning notifications → Big-win net
profit threshold (USD). The default is $500 net profit. This field is stored in
`platform_settings.website_content.tradingDefaults.bigWinProfitThreshold`, using
the existing settings save mechanism; no database migration is needed. It affects
presentation only, not trade payout rates or settlement classification. Settings
publication updates the local website-content cache for subsequent page loads.

### Validation

The targeted acceptance set passes **78 tests** across ten files:

```sh
npx vitest run --config vitest.chart.config.ts \
  src/test/chartAnimationAndMode.test.tsx src/test/chartClockAndViewport.test.ts \
  src/test/winningNotifications.test.tsx src/test/settlementConfirmation.test.tsx \
  src/test/nativeChartEngine.test.ts src/test/nativeChartRenderer.test.ts \
  src/test/realtimeCandleAggregator.test.ts src/test/priceEngineTimeframes.test.ts \
  src/test/observedHistory.test.ts src/test/webSocketFeed.test.ts
npm run build
```

Tests include the actual trading provider with mocked persistence: a blocked
settlement does not announce a provisional win, a confirmed loss never creates a
winning card, failed settlement attempts remain silent, and the confirmed payout
is used rather than a predicted return. Timing checks explicitly verify no early
close at 4,999 ms or 14,399,999 ms, and correct rollover at 5,000 / 14,400,000 ms.

The production build passes. The complete chart configuration reports 86 passed
and the same three legacy deterministic/demo simulation failures documented
above. Repository-wide TypeScript checking is not clean on the baseline.
Authenticated desktop/mobile browser testing, real server settlement execution,
and live-feed visual performance acceptance are still required; mocked Canvas and
persistence tests do not constitute a production sign-off. This work does not
replace the existing settlement backend or provide the missing pre-session
exchange history/replay service.

## True tick movement validation (current patch)

- Production build passes; focused chart/socket/settlement suite: 82 tests pass.
- Full chart suite: 90 pass, 3 legacy simulation tests fail (two obsolete 1s
  timeframe references and one synthetic two-sided-motion assertion). These are
  not reasons to restore simulated live movement.
- Repository-wide TypeScript checking still reports existing compatibility/API
  errors; a passing Vite build is not a clean type-check or browser acceptance.
- Main-chart generated seeding, replay and silent simulated fallback are removed.
  Legacy deterministic utility exports still exist, and DynamicAssetContext and
  PairInfoModal still use generated values. This is not an application-wide
  real-market-data certification.
- Shared timeframe-independent transport, designated OTC routing, and a verified
  real historical/recovery API remain outstanding. Observed cache cannot recreate
  ticks missed during outages or before the session.

## Standalone companion and shared transport

See `financial-chart/README.md` for the self-contained HTML deliverable, modular
Node 100ms Brownian simulation service, adapter/history protocol, tick-buffer and
incremental aggregation API, configuration, tests and deployment prerequisites.
The existing dashboard live factory now pools transport by URL/symbol/category,
not timeframe, fans each observed tick to all active views, rejects simulation
source tags and deduplicates identical timestamp/price messages without sequences.
The companion's history adapter is not yet wired into dashboard history loading;
a verified production provider contract is still required. Live outages never
silently activate the separate simulation service.


## Internal OTC dashboard integration

The dashboard now defaults to a server-owned, explicitly platform-generated OTC
source. See `server/otc/README.md` for the native WebSocket service, startup,
production hosting requirements, per-symbol registry, shared transport/history,
entry/expiry receipts, persistence/recovery tests and financial security boundary.
Development runs that service on the Vite server; production requires a persistent
Node deployment and routing/configuration. A static dashboard deploy alone cannot
run it. Existing client-driven trade persistence/balance flows are not converted
into a server-authoritative ledger by pricing receipts.


## Vercel-only default transport

The former persistent-Node deployment requirement is superseded for the dashboard
by `api/otc.ts`, a same-origin serverless endpoint using the existing private
PostgreSQL connection. See `docs/vercel-otc.md`. Atomic database state owns the
shared Brownian process; HTTP batches contain 100ms ticks, and stored 5s bars
hydrate history. No browser simulation, local pricing file, persistent process,
WebSocket server, or separate application host is required in this mode. The
legacy standalone service remains explicitly opt-in. Financial ledger enforcement
is still separate unfinished work; changing transport does not make it secure.

## Sparse-history viewport and explicit timeframe axes

The dashboard now uses `native/viewport.ts` to keep readable candle spacing and
place the live candle near the right edge even when a timeframe has only one or
a few received bars. Empty logical space is permitted to the left; it is not
converted into fake historical candles. Overscroll constraints preserve that
space instead of forcing the range back to index zero. Manual historical views
remain bounded without automatic jumps to live.

The native time scale receives the selected interval explicitly. With only one
bar, a 15m/30m/4h axis no longer silently extrapolates using a guessed 60 seconds.
Sparse histories display a count/availability note. The initial five-minute OTC
warm-up naturally produces few bars at longer intervals; this change does not
retroactively fabricate an earlier price path or alter stored OHLC.

Regression coverage includes desktop/mobile sparse viewport placement, bounded
panning, 5s through 4h one-bar time mapping, coordinate round-trips, and retained
raw OHLC in the Canvas renderer. Authenticated visual/device acceptance remains
separate from mocked Canvas checks.

## Independent professional viewport zoom

Horizontal and vertical zoom are independent (superseding the earlier combined
zoom behavior). Neither operation changes stored OHLC, candle timestamps, or
interval durations. All series, drawings, indicators and trade overlays continue
to use the shared time/price coordinate APIs.

- Wheel on the plot and +/- buttons change only the time viewport.
- Ctrl+wheel and wheel over the price axis change only the price viewport.
- Horizontal drag navigates history; right-axis drag scales the price domain.
- Double-click price axis restores price autoscale without changing time.
- Double-click plot restores automatic price fitting and fits loaded history.
- Touch pinch changes the time viewport around the finger midpoint.
- Pointer zoom keeps its time/price anchor. Button zoom keeps the latest candle
  anchored when it is in view; historical views use plot center.
- Axis ticks and gridlines use nice, domain-aligned steps, not a fixed six-column
  overlay. Time zoom recalculates time ticks; price zoom recalculates price ticks.

Manual vertical scaling persists across time zoom and ticks. With automatic
vertical fitting enabled, newly exposed historical highs/lows can naturally
expand the price domain so their candles remain visible. Oscillators preserve
their indicator-specific units while following the main time viewport. No third-
party runtime or price interpolation is introduced.

## Tick stability and visible interval duration

Same-size Canvas backing-store assignments are now skipped: assigning width or
height, even to its existing value, clears the bitmap/context. Price-scale option
updates therefore no longer introduce an avoidable blank frame before repaint.
Actual resize and DPR changes still resize the backing store.

Automatic price fitting now retains its domain while received OHLC remains inside
it, rather than recentering/scaling on every tick. It expands with headroom in
bounded steps if actual data exceeds the domain. It does not continuously contract;
explicit autoscale/live reset, instrument/timeframe changes, major viewport moves,
or indicator removal allow refitting. Manual two-axis zoom remains independent and
is not cancelled by incoming data. Trading quotes and authoritative OHLC remain
exact; active candle presentation now uses the bounded transition described below.

The main chart presentation floor is `abs(price) * 0.0001 * sqrt(intervalSeconds/5)`
(before the normal scale margins), rather than the same tiny singleton-price floor
for every interval. This is a visual minimum span, **not** estimated volatility,
generated history, or a different price path. Actual OHLC ranges dominate when
larger. It avoids over-magnifying sparse long-interval candles; it does not guarantee
that a longer-interval candle always moves fewer pixels under manual zoom.

A synchronized-clock badge displays selected candle duration, time until the next
UTC-aligned boundary, and interval progress; reconnecting streams show a waiting
state. It is informational only and never drives prices or candle closes. All
intervals consume the same server ticks: a 4h close can change on every tick just
like 5s, but a 4h candle remains open for four hours. The badge is independent of
trade expiry. Tests assert fixed anchor coordinates under contained updates,
guarded expansion, manual zoom retention, no redundant backing-store clears,
sparse 5s/4h scale differences without OHLC mutation, identical per-symbol live
closes, distinct rollover times, and countdown/progress behavior.


## Server archive browsing and empty-window protection

`/api/otc?action=history&symbol=...&seconds=...&before=...&limit=...` serves
backward, exclusive-boundary pages aggregated from persisted 5s bars. It does not
advance the pricing model, take the market writer lock, or generate history.
Server aggregation preserves first open, maximum high, minimum low, last close
and summed volume. Valid intervals are the existing 5s–4h intervals; limit is
bounded to 1000 (the dashboard requests 300). The handler is inside the existing
system Function, not an additional Vercel Function.

The dashboard loads an archive page after hydration and requests more near the
left edge or on zoom-out. It corrects the oldest overlapping partial snapshot
bucket using the complete server-aggregated closed bar, merges by timestamp,
keeps the current/live candle separate, shifts logical indexes by the number of
prepended bars, and guards requests against asset/timeframe switches. Loading,
retry, earliest-recorded, and window-cap states are visible. The cache is bounded
to 12 source/interval entries and the existing 7200-bar chart window; the window
cap explicitly suggests using a larger timeframe to browse farther. This is not
unlimited browser history. Independent API pages can retrieve older retained data.
Navigation clamps fully empty past/future windows against actual series data.

Raw pricing ticks retain their existing 24h limit. Persisted 5s bars now have a
separate default 30-day limit, pruned on the existing cadence, so raw-tick pruning
no longer discards all older chart history. Thirty days can mean up to 518400
5s bars per active symbol; production database storage/query load needs monitoring.
History queries have a 15s statement timeout. No claim of load-tested capacity
or unlimited retention is made. Previously pruned history is unrecoverable;
new instruments still have only their recorded/generated history since bootstrap.
Startup remains the existing five-minute server warm-up, not fabricated older
candles. Earliest-recorded boundaries are disclosed instead of generating client
history or presenting synthetic backfill as previously recorded prices.

## Shared frame geometry and input batching

The independent React `LivePriceAxisOverlay` was removed. It computed its own
price Y before the native renderer's autoscale and independently clamped it to a
host-height margin, allowing its badge/line to drift from the drawn candle. The
native renderer now computes the last-point price Y once per visible series per
frame, after autoscale. The same rounded Y goes to the latest body/line point,
active price segment, and native axis badge. The segment starts at the latest
candle's rounded center X and ends at the actual plot/axis boundary; it is hidden
when that candle is horizontally offscreen instead of starting at a fixed pad.
Explicit user-created price lines still span the plot as before.

`frameMath.ts` keeps projection/zoom math modular. World coordinates, logical
ranges, pan accumulation and price values retain floating-point precision.
Rounding is confined to final Canvas drawing coordinates, including body edges,
wicks, paths, grid/text positions and badge positioning. CSS-pixel coordinates
are transformed for DPR once; neither source OHLC nor public coordinate APIs
are rounded or interpolated.

One native rAF scheduler owns navigation and painting. Input handlers enqueue
small ordered intents; consecutive pan deltas coalesce without integer rounding.
A frame computes the target logical range, applies the range once, emits the
latest crosshair event once, and paints. Crosshair row lookup uses binary search
rather than a full series scan. Wheel steps use a 1.12 candle-spacing multiplier
(the reciprocal for logical span), preserving the cursor time anchor; Ctrl+wheel
still operates only on price. Pinch/axis drags join the same pipeline. Pending
intents and scheduled work are cleared on disposal; explicit double-click resets
discard pending gestures. Tick/OHLC commits remain synchronous and uninterrupted.

Tests assert one active-price mapping shared by line/badge, integer drawing
arguments, latest-candle line origin, fractional pan accumulation, no synchronous
range/crosshair notifications from input events, one batched notification/paint,
exponential wheel accumulation, and cancellation on disposal. rAF follows browser
and display scheduling; fixed 60/120 FPS is not guaranteed under load or tab
throttling. Authenticated visual/physical-device acceptance remains pending.


## Recorded-only history and all-asset collection (current policy)

Generated/mixed analysis candles are no longer permitted. The generated-history
module was removed, server history reads are recorded-only, and browser history
validation/merge rejects prior synthetic-bootstrap provenance. Config metadata
from the retired profile is ignored. Source OTC ticks remain platform-generated
prices, but historical chart bars must be aggregates of that same persisted tick
stream—not a second historical model or external data substituted for OTC prices.

A protected, bounded all-catalog collector is available at `action=collect`,
using the existing writer and least-advanced checkpoints for fair resumption.
It does not depend on chart subscriptions. It is not enabled as a scheduled job:
frequent supported scheduling, secrets/configuration, actual collection freshness,
all-asset initialization and production capacity remain operational prerequisites.
See `docs/vercel-otc.md` for activation and monitoring. The five-minute warm-up
mentioned in earlier historical notes is superseded by a zero default for new
markets. No history before actual initialization is promised. Archive fetches can
begin during connection rather than waiting for live hydration; cached per-asset
history is retained, and live hydration returns following views to the live edge.

## Smooth live candle presentation

At the user's request, the native Canvas renderer now animates same-bar updates
for Candlestick (including Heikin-Ashi) and OHLC Bar series over 90ms. Linear,
bounded interpolation of the presentation OHLC avoids overshoot, and a reversal
retargets from the current visual state rather than queuing obsolete ticks.
The active close, native price segment and chart badge share a single animated
price coordinate. During this brief transition the chart badge is a presentation
value, not an executable quote. Trading controls, series data, history, indicators,
price-coordinate APIs and settlement retain the exact committed tick values.

Only an already-painted live bar animates. Initial data, history replacement and
bar rollover snap to their exact values; old closed bars do not animate. Reduced
motion preferences and `candleAnimation: false` on chart or series disable easing.
The existing single requestAnimationFrame scheduler runs only while an onscreen
transition is unfinished, and removal cancels it. It does not synthesize new ticks,
change timestamps, backfill history, or hide the feed's underlying polling latency.

## Transparent right price scale while browsing history

The native renderer previously clipped series at the plot's right boundary,
80 CSS pixels before the Canvas edge. Historical candles panned into that price
scale gutter were discarded, making it look like a background panel hid them.
Series now paint through the transparent gutter to the Canvas edge. The bounded
binary-search paint window and autoscale input include those newly visible bars;
price labels are painted afterward for readability without a full-height fill.

Public time/price coordinate mappings, visible-range APIs, axis zoom gestures,
OHLC/timestamps and recorded history remain unchanged. Price lines still terminate
at the original price-axis boundary, and the current-price badge retains its
localized background. Active candles in the gutter continue presentation easing.
Regression coverage checks historical bars across several pan ranges at 800px
/DPR 1 and 360px/DPR 2, full-width clipping, label paint order, absence of a
full-height axis fill and unchanged OHLC. Authenticated visual verification remains
pending; no production deployment is claimed.

## Phone zoom controls and pinch anchoring

The +/- controls now render on phones instead of being hidden below 640px.
Phone buttons have 44px touch targets; larger screens retain compact 24px controls.
Both use the same existing 1.12 exponential horizontal zoom pipeline as before.

Two-finger zoom previously used the new midpoint as its original anchor. When
one finger remained stationary, this incorrectly moved the time beneath that
finger. Native pinch handling now queues scaling at the previous midpoint then
translates to the new midpoint in the same animation-frame navigation batch.
Scaling is still gated by handleScale/pinch settings, and does not change the
price domain, candle values, timestamps, timeframe, or recorded history.
Regression tests check multiple queued pinch moves in both directions, anchored
time, inverse zoom recovery, unchanged OHLC/price coordinates, and accessible
mobile +/- actions. Authenticated physical-device verification remains pending.
