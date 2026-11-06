# Trading chart rebuild boundary

The trading chart renderer, chart-only aggregation/viewport code and standalone
chart demos have been removed. The trading workspace keeps its existing layout,
indicator catalog/settings/calculations, drawing tool catalog and persisted drawing
state. Their visual overlays cannot be plotted or edited on a canvas until a new
chart renderer supplies coordinate and series APIs. The chart area explicitly
shows that it is unavailable rather than presenting fabricated prices.

The temporary `TradingChart` workspace shell retains desktop/mobile tool entry
points and uses the existing market-data feed to pass received prices to the trade
desk independently of a chart. It does not draw candles, generate history, or
manufacture chart coordinates. Shared OTC services, quote transport, price engine,
observed history and interval utilities remain because they are used by trading,
market feeds, pair information, and indicators. Standalone simulation transport
is retained as `npm run market:simulation`, but no longer serves a chart UI.

Future work should reconnect the preserved drawing and indicator integrations to
the replacement renderer and verify actual quote freshness, trade settlement,
mobile tools, drawing persistence, indicator settings, and multi-pane behavior.
This removal is not a new chart engine or a production trading sign-off.
