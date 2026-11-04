# Phone layout update

The latest phone reference supersedes the earlier desktop-only scope below.
Phone/tablet changes (below 1024px) retain the live chart, real account/notification
state and trade execution, without copying the reference's balance or trades.

- 48px header with inline account/balance, a mobile notification bell and deposit.
- A flex workspace containing chart then a full-width order form. Remove the
  fixed order dock, 430px form cap and guessed 250/262px chart-bottom reservation.
- Side-by-side 44px Timer/Investment fields, investment switch, payout row, and
  equal-width 44px Buy/Sell buttons. Investment +/- and duration are actual buttons.
- Bottom navigation reserves 56px plus the device safe area. History/workspace
  overlays and mobile notification popovers account for that same safe area.
- On short landscape screens the workspace scrolls, keeping both chart and form
  reachable. Desktop form dimensions and pricing/candle logic are unchanged.

Chromium checks used isolated real header/form components with mocked contexts
and an empty chart region (not an authenticated dashboard or market-data test):

| Viewport | Header | Chart | Order form | Bottom nav | Horizontal overflow |
| --- | ---: | ---: | ---: | ---: | --- |
| 430 × 932 | 48px | 630px | 198px | 56px | No |
| 393 × 852 | 48px | 550px | 198px | 56px | No |
| 320 × 568 | 48px | 266px | 198px | 56px | No |

Portrait checks found the order form ends exactly above bottom navigation. The
844 × 390 landscape fixture enables scrolling with a 240px chart; the form remains
reachable by scrolling. Safe-area CSS is implemented but physical iOS keyboard,
notch, device-font rendering and authenticated live-chart acceptance remain
unverified. Do not describe these component checks as exact production parity.

---

# Current refinement: balanced desktop density

The user subsequently requested smaller, more balanced controls rather than the
large reference-scale UI. This supersedes the exact-reference sizing recorded
below. The desktop layout now uses:

- 58–64px header; 76–84px expanded navigation rail.
- 52–56px asset strip with 40px tabs and a 38px add button.
- 216–232px order panel, retaining separate order/history cards.
- 44px Time/Investment fields and Buy/Sell buttons; 16px field text.
- More legible 25px navigation icons with 2.5px strokes, bold 11px labels,
  and consistent 8–14px spacing.
- 44px sentiment rail, with toolbar offsets derived from the same constant.
- Short desktop windows scroll the order form when needed, preserving history
  access and action-target sizes. Desktop-only overrides leave mobile sizing alone.

A subsequent targeted readability correction increases the desktop logo image
to 40px high (maximum 220px wide), and the text fallback to bold 24px. Navigation
labels remain white and wrap Tournaments at a deliberate word break instead of
splitting arbitrary trailing letters. Other panel/control dimensions stay compact.

No chart prices, tick handling, account data, trade execution or workspace
functionality is changed. The table below documents the **previous** large layout,
not measurements of this refinement. Authenticated visual verification of the
new layout remains pending.

---

# Previous reference-scale layout

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
