# Dashboard reference alignment

The latest supplied reference is `quotex.com_en_demo-trade(Nest Hub Max).png`,
1568 × 980. The earlier 54px-header / 64px-navigation / 188px-order-panel compact
layout did not match its proportions. The follow-up changes use scoped desktop
rules in `src/components/trading/styles/referenceLayout.css` imported by `Trade`.

## Panel geometry

Measurements from Chromium rendering the actual header, navigation, asset strip,
and trading-panel components in an isolated fixture with mocked contexts:

| Region | x | y | Width | Height |
| --- | ---: | ---: | ---: | ---: |
| Header | 0 | 0 | 1568 | 78 |
| Navigation rail | 0 | 78 | 98 | 902 |
| Asset strip | 98 | 78 | 1190 | 74 |
| Right order form | 1298 | 90 | 258 | 438 |
| Buy button | 1316 | 390 | 222 | 54 |
| History card | 1298 | 540 | 258 | 428 |

The order form and history are separate rounded cards with a 12px gap. History
retains its independent vertical scrolling. Time/investment controls are 58px
high at the reference viewport. The navigation utility settings control is kept
above Join us and Help. The chart sentiment rail is 60px wide, with toolbar
positions derived from that shared width.

At 1280 × 800 and 1024 × 768, the component fixture had no document-level
horizontal overflow. Header/nav/tab sizes scale down, promotion is hidden below
1400px, and form/action heights reduce to preserve chart and history space.
New layout overrides only apply at desktop widths (1024px and above).

## Scope and verification limits

- Keep platform branding instead of substituting the reference site's logo.
- Balances, payout rates, asset selection, notifications and trade history remain
  actual application state. Do not manufacture the reference's displayed trades,
  sentiment percentages, account balance, or historical candles.
- User-selected chart themes/colors and all workspace destinations remain intact.
- The browser fixture used no market data and a placeholder chart region. It
  verifies component geometry, not production authentication, Canvas chart
  appearance, settlement, funding, or a live-feed visual match.
- The temporary browser tooling/fixtures were outside the repository; no runtime
  dependencies, production fixture routes, or fabricated market data were added.
- Exact authenticated, end-to-end pixel parity has **not** been established.
  Compare the actual dashboard at 1568 × 980 after deployment before claiming it.
