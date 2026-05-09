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

  return (
    <div className="h-full w-full">
      <div className="relative flex h-full w-full flex-col items-start justify-between px-3 py-3">
        <div className="text-[11px] font-bold text-[#ff6a5f]">{lowerPercent}%</div>
        <div className="text-[11px] font-bold text-[#20c96b]">{higherPercent}%</div>
        <div className="absolute right-3 top-[18px] h-[calc(100%-36px)] w-[3px] bg-[#0d1320]">
          <div className="absolute left-0 top-0 w-full bg-[#ff6a5f]" style={{ height: `${lowerPercent}%` }} />
          <div className="absolute left-0 bottom-0 w-full bg-[#20c96b]" style={{ height: `${higherPercent}%` }} />
        </div>
      </div>
    </div>
  );
};
