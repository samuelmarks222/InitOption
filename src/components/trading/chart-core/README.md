# Lightweight Charts migration (not yet connected to production UI)

This is a staged replacement, not a finished trading chart. The installed
`lightweight-charts` 5.1 package supplies the renderer. `LightweightChart`
creates one responsive dark chart with native navigation and attribution;
`LightweightSeriesController` uses the v5 `addSeries` API for candlestick,
OHLC bar, Heikin Ashi and area series. It uses `setData` for replacements and
`update` for live bars, retains logical range on type switching and preserves
it across prepended pages. It inserts whitespace (not fabricated prices) at
missing intervals and uses original closes for the current price line. The
integration must pass the actual asset's precision/minimum price increment.
The controller owns no feeds or trading data; Heikin Ashi is display-only.

`CandleStore` consumes provider-supplied closed OHLC pages and live quotes. It
never generates missing data. Each store is scoped to one source, symbol and
interval. It rejects conflicting history, stale ticks, and history/live bucket
overlap when there is no authoritative snapshot cursor. These failures must be
surfaced by the future adapter, not silently repaired.

Inspection and required follow-up:

- `TradingChart.tsx` is currently a chart-free shell with pooled price feed;
  its asset/timeframe controls and `onPriceUpdate` connect into `Trade.tsx`.
  `useTrading.ts` also uses protected OTC quotes for entry/settlement. Do not
  replace or transform those original price paths.
- `createMarketDataFeed` pools by symbol and reconnects. The default internal
  OTC transport polls `/api/otc?action=ticks`; its optional WebSocket sends a
  symbol subscription and receives snapshot/tick messages with session and
  sequence. External mode uses its configured WebSocket. The internal source
  is explicitly synthetic: its recorded history is not external exchange data.
- `requestOTCHistory` reads paginated recorded OTC OHLC from `/api/otc` with an
  exclusive `before` boundary. The external feed has no historical OHLC API in
  this repository. Wire only the existing infrastructure and preserve source
  provenance, never claim recorded synthetic OTC prices are external prices.
- Implement history/live snapshot reconciliation, backfill after reconnect,
  pagination, loading/error state and interval/asset switches. Handle race
  conditions and missing data explicitly, without manufacturing prices.
- Integrate the existing `DrawingOverlay` with the active series, including
  listener cleanup and coordinate invalidation on switch/resize/pan; connect
  existing indicator calculations and separate panes to the original OHLC.
  Preserve drawings, indicator settings, chart-type controls and preferences.
- Expose current OHLC/time information and native navigation controls in the
  trading UI. Validate resize, scale formatting and accessibility on devices.
- Test all chart types against actual authorized historical and live data,
  including reconnect, navigation, trading safety, drawings, indicators and
  mobile performance. Unit fixtures and mocked chart APIs do not demonstrate
  production data accuracy or visual correctness.

No code in this directory is wired into the trading screen yet. The existing
shell and its original price flow remain unchanged. The TradingView attribution
notice is in `notices/lightweight-charts-NOTICE.txt`; the visible attribution logo
is enabled for future chart use.
