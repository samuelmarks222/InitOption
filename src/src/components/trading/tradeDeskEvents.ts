export type TradeDeskDirection = "higher" | "lower";

export type TradeDeskDirectionFocusDetail = {
  direction: TradeDeskDirection;
};

export const TRADE_DESK_DIRECTION_FOCUS_EVENT = "trade-desk:direction-focus";
export const TRADE_DESK_DIRECTION_SUBMIT_EVENT = "trade-desk:direction-submit";

export const dispatchTradeDeskDirectionFocus = (direction: TradeDeskDirection) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<TradeDeskDirectionFocusDetail>(TRADE_DESK_DIRECTION_FOCUS_EVENT, {
      detail: { direction },
    }),
  );
};

export const dispatchTradeDeskDirectionSubmit = (direction: TradeDeskDirection) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<TradeDeskDirectionFocusDetail>(TRADE_DESK_DIRECTION_SUBMIT_EVENT, {
      detail: { direction },
    }),
  );
};
