import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";

interface TradeDeskShortcutProps {
  ariaLabel?: string;
  onClick?: () => void;
  to?: string;
}

const shortcutClassName =
  "group relative flex h-[60px] w-[58px] flex-col items-center justify-center overflow-hidden rounded-[8px] border px-2 py-[7px] text-center transition-transform duration-200 hover:-translate-y-[1px] active:scale-[0.98]";

const shortcutStyle: CSSProperties = {
  background:
    "linear-gradient(180deg, #34394a 0%, #23283b 58%, color-mix(in srgb, #1e2131 88%, #34394a) 100%)",
  borderColor: "rgba(143, 164, 210, 0.28)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
  color: "#ffffff",
};

const TradeDeskContent = () => (
  <>
    <span
      className="pointer-events-none absolute inset-0 opacity-95"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.12), transparent 42%)",
      }}
    />
    <span
      className="relative flex h-[26px] w-[38px] items-center justify-center overflow-hidden rounded-[7px] border"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))",
        borderColor: "rgba(255,255,255,0.18)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.13)",
      }}
    >
      <span className="absolute left-[7px] right-[7px] top-[9px] h-px bg-white/20" />
      <span className="absolute left-[8px] top-[14px] h-[7px] w-[3px] rounded-full bg-[#9ca9c6]" />
      <span className="absolute left-[15px] top-[11px] h-[10px] w-[3px] rounded-full bg-[#f6f8ff]" />
      <span className="absolute left-[22px] top-[13px] h-[8px] w-[3px] rounded-full bg-[#9ca9c6]" />
      <svg className="absolute inset-0" viewBox="0 0 36 29" fill="none" aria-hidden="true">
        <path
          d="M8 18.5L14.3 13.2L19.1 16.5L27.6 9.5"
          stroke="rgba(248,250,255,0.88)"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
    <span
      className="relative mt-[6px] text-[10px] font-black tracking-[0.16em]"
      style={{ color: "#ffffff", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
    >
      TRADE
    </span>
    <span
      className="relative mt-0.5 text-[5px] font-bold uppercase tracking-[0.24em]"
      style={{ color: "rgba(236,241,255,0.72)" }}
    >
      Desk
    </span>
  </>
);

const wrapShortcut = (children: ReactNode) => (
  <div className="flex h-[70px] w-full items-start justify-center overflow-visible pt-[10px]">{children}</div>
);

export const TradeDeskShortcut = ({ ariaLabel = "Open trade desk", onClick, to }: TradeDeskShortcutProps) => {
  if (to) {
    return wrapShortcut(
      <Link to={to} aria-label={ariaLabel} className={shortcutClassName} style={shortcutStyle}>
        <TradeDeskContent />
      </Link>,
    );
  }

  return wrapShortcut(
    <button
      type="button"
      aria-label={ariaLabel}
      className={shortcutClassName}
      style={shortcutStyle}
      onClick={onClick}
    >
      <TradeDeskContent />
    </button>,
  );
};
