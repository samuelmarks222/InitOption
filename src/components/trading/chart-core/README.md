# Lightweight Charts migration (in progress)

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

`useTradingPriceChart` connects the price renderer to the existing pooled feed,
uses its observed snapshot and the recorded OTC history endpoint, incrementally
updates candles, and pages older history as the viewport approaches the left
edge. The existing drawing overlay is mounted for the main chart. The UI labels
the default synthetic OTC source, and shows unavailable/reconnecting states.
The original `onPriceUpdate` path remains separate from chart transformations.

Inspection and required follow-up:

- `TradingChart.tsx` has asset/timeframe controls and `onPriceUpdate` connects
  into `Trade.tsx`.
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
- Verify history/live snapshot reconciliation and gap handling after reconnect
  against each deployed transport. Surface missing data without manufacturing
  prices. The external feed still has no historical endpoint in this repository.
- Validate the existing `DrawingOverlay` across switch/resize/pan and mobile;
  connect existing indicator calculations and separate panes to original OHLC.
  Chart style preferences and indicator plots are not yet connected.
- Expose current OHLC/time information and native navigation controls in the
  trading UI. Validate resize, scale formatting and accessibility on devices.
- Test all chart types against actual authorized historical and live data,
  including reconnect, navigation, trading safety, drawings, indicators and
  mobile performance. Unit fixtures and mocked chart APIs do not demonstrate
  production data accuracy or visual correctness.

The TradingView attribution notice is in `notices/lightweight-charts-NOTICE.txt`;
the visible attribution logo is enabled. Do not treat this work as a completed
chart migration or as a real-market data verification.
