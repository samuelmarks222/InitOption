import { convertUsdToCurrency } from "./currency.js";

const roundToTwo = (value: number) => Math.round(value * 100) / 100;

export const MOBILE_MONEY_CURRENCY = "KES";
export const MPESA_CHANNEL_CODE = "63902";
export const MPESA_METHOD_LABEL = "M-PESA Mobile Money";

const MPESA_DEPOSIT_RATE = 135;
const MPESA_WITHDRAWAL_RATE = 124;

export const convertUsdToKesDepositAmount = (amountUsd: number) => {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return 0;
  }

  return roundToTwo(amountUsd * MPESA_DEPOSIT_RATE);
};

export const convertUsdToKesWithdrawalAmount = (amountUsd: number) => {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return 0;
  }

  return roundToTwo(amountUsd * MPESA_WITHDRAWAL_RATE);
};

/** @deprecated Use convertUsdToKesDepositAmount or convertUsdToKesWithdrawalAmount instead */
export const convertUsdToKesAmount = (amountUsd: number) => {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return 0;
  }

  return roundToTwo(convertUsdToCurrency(amountUsd, MOBILE_MONEY_CURRENCY));
};

export const normalizeKenyanPhoneNumber = (value: string | null | undefined) => {
  const digits = String(value ?? "").replace(/\D+/g, "");

  if (!digits) {
    return null;
  }

  if (/^254[17]\d{8}$/.test(digits)) {
    return digits;
  }

  if (/^0[17]\d{8}$/.test(digits)) {
    return `254${digits.slice(1)}`;
  }

  if (/^[17]\d{8}$/.test(digits)) {
    return `254${digits}`;
  }

  return null;
};

export const maskKenyanPhoneNumber = (value: string | null | undefined) => {
  const normalized = normalizeKenyanPhoneNumber(value);
  if (!normalized) return "";
  return `${normalized.slice(0, 6)}*****${normalized.slice(-2)}`;
};
