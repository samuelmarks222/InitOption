import type { ReactNode } from "react";

const iconWrap = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    {children}
  </svg>
);

export const INDICATOR_ICONS: Record<string, ReactNode> = {
  sma: iconWrap(
    <path d="M3 20Q8 14 12 12T18 6T22 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  ),
  ema: iconWrap(
    <path d="M3 20Q9 13 12 14T18 7T22 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />,
  ),
  bollinger: iconWrap(
    <>
      <path d="M3 9Q8 6 12 9T18 11T22 8" stroke="currentColor" strokeWidth="1.5" opacity="0.6" fill="none" />
      <path d="M3 15Q8 18 12 15T18 13T22 16" stroke="currentColor" strokeWidth="1.5" opacity="0.6" fill="none" />
      <path d="M3 12Q8 12 12 12T18 12T22 12" stroke="currentColor" strokeWidth="2" fill="none" />
    </>,
  ),
  rsi: iconWrap(
    <>
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <path d="M3 16Q8 8 12 10T18 14T22 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>,
  ),
  macd: iconWrap(
    <>
      <path d="M3 18Q8 14 12 12T16 6T22 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M3 20Q8 17 12 10T18 8T22 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <rect x="20" y="12" width="2" height="4" fill="currentColor" opacity="0.6" />
      <rect x="16" y="10" width="2" height="6" fill="currentColor" opacity="0.4" />
      <rect x="12" y="8" width="2" height="8" fill="currentColor" opacity="0.5" />
      <rect x="8" y="13" width="2" height="3" fill="currentColor" opacity="0.4" />
    </>,
  ),
  stochastic: iconWrap(
    <>
      <path d="M3 18Q8 8 12 12T18 6T22 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M3 20Q8 10 12 14T18 8T22 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    </>,
  ),
  cci: iconWrap(
    <>
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <path d="M3 8Q8 14 12 10T18 18T22 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>,
  ),
  momentum: iconWrap(
    <>
      <path d="M3 18Q10 14 14 8L18 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M15 4H18V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>,
  ),
  roc: iconWrap(
    <>
      <path d="M3 18Q10 14 14 8L18 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="19" cy="5" r="3" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <text x="18" y="7" fontSize="5" fill="currentColor" fontWeight="bold">%</text>
    </>,
  ),
  williamsR: iconWrap(
    <>
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <path d="M3 8Q8 16 12 12T18 6T22 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>,
  ),
  awesome: iconWrap(
    <>
      <rect x="5" y="10" width="3" height="6" fill="currentColor" opacity="0.7" />
      <rect x="10" y="6" width="3" height="10" fill="currentColor" opacity="0.5" />
      <rect x="15" y="12" width="3" height="4" fill="currentColor" opacity="0.7" />
      <rect x="20" y="8" width="3" height="8" fill="currentColor" opacity="0.5" />
    </>,
  ),
  parabolic: iconWrap(
    <>
      <circle cx="4" cy="14" r="1.5" fill="currentColor" />
      <circle cx="8" cy="11" r="1.5" fill="currentColor" />
      <circle cx="12" cy="9" r="1.5" fill="currentColor" />
      <circle cx="16" cy="7" r="1.5" fill="currentColor" />
      <circle cx="20" cy="6" r="1.5" fill="currentColor" />
      <path d="M6 18Q12 16 16 12T20 8" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 2" fill="none" opacity="0.5" />
    </>,
  ),
  ichimoku: iconWrap(
    <>
      <path d="M3 8Q8 10 12 6T18 12T21 8" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M3 14Q8 16 12 12T18 18T21 14" stroke="currentColor" strokeWidth="1.4" fill="none" />
      <path d="M6 20Q10 4 14 8T20 4" stroke="currentColor" strokeWidth="1" opacity="0.5" strokeDasharray="3 2" fill="none" />
      <path d="M3 6Q12 10 12 14T21 10" stroke="currentColor" strokeWidth="1" opacity="0.5" strokeDasharray="3 2" fill="none" />
      <rect x="6" y="7" width="6" height="6" fill="currentColor" opacity="0.15" rx="1" />
    </>,
  ),
  supertrend: iconWrap(
    <>
      <path d="M4 18L10 14L14 10L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="4" cy="18" r="1.8" fill="currentColor" />
      <circle cx="10" cy="14" r="1.8" fill="currentColor" />
      <circle cx="14" cy="10" r="1.8" fill="currentColor" />
      <circle cx="20" cy="6" r="1.8" fill="currentColor" />
    </>,
  ),
  alligator: iconWrap(
    <>
      <path d="M3 16Q8 10 12 14T18 12T22 16" stroke="currentColor" strokeWidth="1.6" fill="none" opacity="0.7" />
      <path d="M3 12Q8 6 12 10T18 8T22 12" stroke="currentColor" strokeWidth="1.6" fill="none" opacity="0.85" />
      <path d="M3 8Q8 14 12 10T18 16T22 8" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </>,
  ),
  atr: iconWrap(
    <>
      <path d="M3 16Q8 10 12 12T18 6T22 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </>,
  ),
  keltner: iconWrap(
    <>
      <path d="M3 8Q8 6 12 8T18 6T22 8" stroke="currentColor" strokeWidth="1.4" opacity="0.6" fill="none" />
      <path d="M3 16Q8 18 12 16T18 18T22 16" stroke="currentColor" strokeWidth="1.4" opacity="0.6" fill="none" />
      <path d="M3 12Q8 12 12 12T18 12T22 12" stroke="currentColor" strokeWidth="2" fill="none" />
    </>,
  ),
  donchian: iconWrap(
    <>
      <line x1="3" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="1.8" />
      <line x1="3" y1="17" x2="21" y2="17" stroke="currentColor" strokeWidth="1.8" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 2" />
    </>,
  ),
  wma: iconWrap(
    <path d="M3 20Q10 10 12 12T18 7T22 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />,
  ),
  hma: iconWrap(
    <path d="M3 20Q8 16 12 10T18 5T22 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  ),
  volume: iconWrap(
    <>
      <rect x="4" y="10" width="3" height="10" rx="0.8" fill="currentColor" opacity="0.8" />
      <rect x="8" y="7" width="3" height="13" rx="0.8" fill="currentColor" opacity="0.6" />
      <rect x="12" y="12" width="3" height="8" rx="0.8" fill="currentColor" opacity="0.8" />
      <rect x="16" y="5" width="3" height="15" rx="0.8" fill="currentColor" opacity="0.6" />
      <rect x="20" y="9" width="3" height="11" rx="0.8" fill="currentColor" opacity="0.8" />
    </>,
  ),
  obv: iconWrap(
    <>
      <path d="M3 18L7 14L10 16L14 10L17 12L21 6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
    </>,
  ),
  volumeOsc: iconWrap(
    <>
      <rect x="4" y="12" width="3" height="6" fill="currentColor" opacity="0.7" />
      <rect x="8" y="8" width="3" height="10" fill="currentColor" opacity="0.5" />
      <rect x="12" y="14" width="3" height="4" fill="currentColor" opacity="0.7" />
      <rect x="16" y="6" width="3" height="12" fill="currentColor" opacity="0.5" />
      <rect x="20" y="10" width="3" height="8" fill="currentColor" opacity="0.7" />
    </>,
  ),
  adx: iconWrap(
    <>
      <path d="M3 18Q8 14 12 10T18 8T22 6" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M3 16Q8 10 12 8T18 4T22 3" stroke="currentColor" strokeWidth="1.2" opacity="0.5" fill="none" />
      <path d="M3 20Q8 18 12 14T18 12T22 10" stroke="currentColor" strokeWidth="1.2" opacity="0.5" fill="none" />
    </>,
  ),
  aroon: iconWrap(
    <>
      <path d="M3 18Q8 8 12 12T18 4T22 8" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M3 6Q8 16 12 12T18 20T22 16" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    </>,
  ),
  demarker: iconWrap(
    <>
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <path d="M3 14Q8 8 12 12T18 10T22 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>,
  ),
  bullsPower: iconWrap(
    <>
      <rect x="5" y="12" width="3" height="6" fill="currentColor" opacity="0.6" />
      <rect x="10" y="8" width="3" height="10" fill="currentColor" opacity="0.6" />
      <rect x="15" y="10" width="3" height="8" fill="currentColor" opacity="0.6" />
      <rect x="20" y="6" width="3" height="12" fill="currentColor" opacity="0.6" />
      <line x1="11.5" y1="5" x2="11.5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11.5 5L10 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11.5 5L13 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </>,
  ),
  bearsPower: iconWrap(
    <>
      <rect x="5" y="12" width="3" height="6" fill="currentColor" opacity="0.6" />
      <rect x="10" y="8" width="3" height="10" fill="currentColor" opacity="0.6" />
      <rect x="15" y="10" width="3" height="8" fill="currentColor" opacity="0.6" />
      <rect x="20" y="6" width="3" height="12" fill="currentColor" opacity="0.6" />
      <line x1="16.5" y1="5" x2="16.5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16.5 8L15 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M16.5 8L18 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </>,
  ),
  schaff: iconWrap(
    <>
      <path d="M3 14Q6 6 9 10T12 4T15 14T18 6T21 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </>,
  ),
  vortex: iconWrap(
    <>
      <path d="M3 18Q8 8 12 12T18 4T22 10" stroke="currentColor" strokeWidth="1.6" fill="none" />
      <path d="M3 6Q8 16 12 12T18 20T22 14" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </>,
  ),
  zigzag: iconWrap(
    <>
      <path d="M3 18L8 12L12 18L16 6L21 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>,
  ),
};
