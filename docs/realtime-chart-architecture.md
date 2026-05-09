# Real-Time Trading Chart Architecture

This project now uses a stricter real-time candle pipeline built around three layers:

1. `src/components/trading/engine/marketDataFeed.ts`
   Frontend market-data adapter.
   Uses a real WebSocket feed when `VITE_MARKET_DATA_WS_URL` is configured.
   Falls back to the deterministic local feed for local/demo environments.

2. `src/components/trading/CandleAggregator.ts`
   Time-bound OHLC aggregator.
   Builds candles from ticks.
   Closes candles exactly on timeframe boundaries, even if the next tick has not arrived yet.
   Opens the next candle immediately with `open = last close`.
   Batches visual updates to animation frames so heavy tick rates do not force re-render storms.

3. `src/components/trading/TradingChart.tsx`
   Presentation layer.
   Seeds history.
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
