interface TradeSentimentRailProps {
  asset: {
    symbol: string;
    change?: number;
    price: number;
  };
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getSymbolBias = (symbol: string) =>
  symbol
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0) % 15;

export const TradeSentimentRail = ({ asset }: TradeSentimentRailProps) => {
  const baseBias = getSymbolBias(asset.symbol) - 7;
  const driftBias = Math.tanh((asset.change ?? 0) / 4.5) * 26;
  const higherPercent = clamp(Math.round(50 + baseBias + driftBias), 4, 96);
  const lowerPercent = 100 - higherPercent;
  const gapHeight = 34;

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 top-[4.25rem] z-[35] hidden select-none sm:block sm:left-[4.9rem] sm:top-4">
      <div className="flex h-full w-[42px] flex-col items-center">
        <div className="rounded-xl border border-[#30374b] bg-[#1b2232]/94 px-2 py-1 shadow-[0_12px_30px_rgba(7,12,22,0.34)]">
          <span className="text-[12px] font-black leading-none tracking-[-0.03em] text-white">{lowerPercent}%</span>
        </div>

        <div className="relative my-3 min-h-0 flex-1 w-full">
          <div
            className="absolute inset-0 left-1/2 grid w-[14px] -translate-x-1/2 rounded-full bg-[#171d2b]/94 ring-1 ring-white/6"
            style={{ gridTemplateRows: `${lowerPercent}fr ${gapHeight}px ${higherPercent}fr` }}
          >
            <div className="flex min-h-0 items-start justify-center px-[4px] pt-[3px]">
              <div className="h-full w-[4px] rounded-full bg-[#ff7067] shadow-[0_0_16px_rgba(255,112,103,0.18)] transition-[height] duration-500" />
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute h-[14px] w-[14px] rounded-full border border-white/8 bg-[#20283a] shadow-[0_10px_22px_rgba(8,14,24,0.5)]">
                <div className="absolute inset-[4px] rounded-full bg-white/50" />
              </div>
            </div>

            <div className="flex min-h-0 items-end justify-center px-[4px] pb-[3px]">
              <div className="h-full w-[4px] rounded-full bg-[#18d87d] shadow-[0_0_16px_rgba(24,216,125,0.18)] transition-[height] duration-500" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#273b34] bg-[#162720]/94 px-2 py-1 shadow-[0_12px_30px_rgba(7,12,22,0.28)]">
          <span className="text-[12px] font-black leading-none tracking-[-0.03em] text-white">{higherPercent}%</span>
        </div>
      </div>
    </div>
  );
};
