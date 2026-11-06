import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ChartZoomControls({ onZoom, disabled = false }: { onZoom: (direction: "in" | "out") => void; disabled?: boolean }) {
  const { t } = useTranslation();
  const controls = [
    { direction: "out" as const, label: t("tradingChart.zoomOut"), Icon: Minus },
    { direction: "in" as const, label: t("tradingChart.zoomIn"), Icon: Plus },
  ];
  return (
    <div className="pointer-events-none absolute bottom-2 left-1/2 z-[56] flex -translate-x-1/2">
      <div className="pointer-events-auto inline-flex items-center gap-[3px] rounded-[4px] bg-transparent">
        {controls.map(({ direction, label, Icon }) => (
          <button
            key={direction}
            type="button"
            onClick={() => onZoom(direction)}
            disabled={disabled}
            className="flex h-11 w-11 items-center justify-center rounded-[4px] border border-white/6 bg-[#2a3040]/96 text-[#b8c1d2] shadow-[0_6px_14px_rgba(0,0,0,0.22)] transition-colors hover:bg-[#333a4b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8fa4d2] sm:h-6 sm:w-6"
            title={label}
            aria-label={label}
          >
            <Icon className="h-4 w-4 sm:h-3 sm:w-3" strokeWidth={2.6} />
          </button>
        ))}
      </div>
    </div>
  );
}
