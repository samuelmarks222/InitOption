
import type { Tables } from "@/integrations/supabase/types";
import { api } from "@/integrations/api/client";
import {
  clearCryptoDepositCheckoutCache,
  loadCryptoDepositCheckoutCache,
  saveCryptoDepositCheckoutCache,
} from "@/lib/cryptoDepositCheckoutCache";
import { getAppwriteIdToken } from "@/integrations/appwrite/authService";

export type CryptoAttributionMode = "static" | "memo" | "dynamic_address";
export type CryptoInstructionStatus =
  | "awaiting_payment"
  | "payment_detected"
  | "confirming"
  | "credited"
  | "expired"
  | "cancelled";

export type CryptoPaymentMethodRecord = Tables<"crypto_payment_methods">;
export type CryptoDepositInstructionRecord = Tables<"crypto_deposit_instructions">;

export interface CryptoDepositInstructionPayload {
  address: string;
  amount: number;
  confirmations_required: number;
  created_at: string;
  deposit_request_id: string;
  hosted_checkout_url?: string | null;
  instruction_id: string;
  instruction_status: CryptoInstructionStatus;
  memo_label: string | null;
  memo_value: string | null;
  payment_method_id: string;
  promo_bonus: number;
  provider_name?: string | null;
  provider_order_id?: string | null;
  provider_pay_amount?: number | null;
  provider_pay_currency?: string | null;
  provider_payment_id?: string | null;
  provider_payment_status?: string | null;
}

export interface CryptoDepositInstructionWithMethod extends CryptoDepositInstructionRecord {
  payment_method: CryptoPaymentMethodRecord | null;
}

const AUTO_CRYPTO_DEPOSIT_MIGRATION_PATH = "supabase/migrations/20260323_auto_crypto_deposit_automation.sql";

const withAutoCryptoMigrationHint = (error: {
  details?: string | null;
  hint?: string | null;
  message?: string;
}) => {
  const combined = [error.message, error.details, error.hint].filter(Boolean).join(" ").toLowerCase();
  const needsMigrationHint = [
    "create_crypto_deposit_instruction",
    "process_crypto_deposit_detection",
    "crypto_deposit_instructions",
    "crypto_deposit_events",
    "crypto_deposit_address_pool",
  ].some((needle) => combined.includes(needle));

  if (!needsMigrationHint) {
    return error;
  }

  return new Error(
    `${error.message ?? "Automatic crypto deposit support is not available yet."} Run ${AUTO_CRYPTO_DEPOSIT_MIGRATION_PATH} before testing memo/dynamic-address deposits.`,
  );
};

export const isAutomatedCryptoMode = (mode: string | null | undefined): mode is Exclude<CryptoAttributionMode, "static"> =>
  mode === "memo" || mode === "dynamic_address";

export const cryptoMethodNeedsMemo = (method: Pick<CryptoPaymentMethodRecord, "attribution_mode">) =>
  method.attribution_mode === "memo";

export const cryptoMethodNeedsDynamicAddress = (method: Pick<CryptoPaymentMethodRecord, "attribution_mode">) =>
  method.attribution_mode === "dynamic_address";

export const isCryptoMethodReady = (
  method: Pick<CryptoPaymentMethodRecord, "attribution_mode" | "wallet_address">,
  availableAddressCount = 0,
) => {
  if (method.attribution_mode === "dynamic_address") {
    return availableAddressCount > 0;
  }

  return Boolean(method.wallet_address);
};

export const getCryptoAutomationSummary = (
  method: Pick<CryptoPaymentMethodRecord, "attribution_mode" | "memo_label" | "wallet_address">,
  availableAddressCount = 0,
) => {
  if (method.attribution_mode === "memo") {
    return {
      automated: true,
      label: `${method.memo_label || "Memo"} attribution`,
      ready: Boolean(method.memo_label || method.wallet_address),
    };
  }

  if (method.attribution_mode === "dynamic_address") {
    return {
      automated: true,
      label: "Unique address attribution",
      ready: availableAddressCount > 0,
    };
  }

  return {
    automated: false,
    label: "Manual/static fallback",
    ready: Boolean(method.wallet_address),
  };
};

export const getCryptoInstructionStatusCopy = (
  status: CryptoInstructionStatus | string,
  observedConfirmations = 0,
  requiredConfirmations = 0,
) => {
  if (status === "credited") {
    return "Credited automatically";
  }

  if (status === "confirming") {
    return `${observedConfirmations}/${requiredConfirmations} confirmations`;
  }

  if (status === "payment_detected") {
    return "Payment detected";
  }

  if (status === "expired") {
    return "Expired";
  }

  if (status === "cancelled") {
    return "Cancelled";
  }

  return "Waiting for payment";
};

export const mapCryptoDepositInstructionRecordToPayload = (
  instruction: Pick<
    CryptoDepositInstructionRecord,
    | "created_at"
    | "deposit_address"
    | "deposit_request_id"
    | "expected_amount_usd"
    | "id"
    | "instruction_status"
    | "memo_label"
    | "memo_value"
    | "payment_method_id"
    | "promo_bonus"
    | "required_confirmations"
  >,
): CryptoDepositInstructionPayload => {
  const payload: CryptoDepositInstructionPayload = {
    address: instruction.deposit_address,
    amount: Number(instruction.expected_amount_usd ?? 0),
    confirmations_required: Number(instruction.required_confirmations ?? 0),
    created_at: instruction.created_at,
    deposit_request_id: instruction.deposit_request_id,
    instruction_id: instruction.id,
    instruction_status: instruction.instruction_status as CryptoInstructionStatus,
    memo_label: instruction.memo_label ?? null,
    memo_value: instruction.memo_value ?? null,
    payment_method_id: instruction.payment_method_id,
    promo_bonus: Number(instruction.promo_bonus ?? 0),
  };

  const cachedCheckout = loadCryptoDepositCheckoutCache(payload.instruction_id);
  if (!cachedCheckout) {
    return payload;
  }

  return {
    ...payload,
    hosted_checkout_url: cachedCheckout.hosted_checkout_url ?? null,
    provider_name: cachedCheckout.provider_name ?? null,
    provider_order_id: cachedCheckout.provider_order_id ?? null,
    provider_pay_amount: Number.isFinite(Number(cachedCheckout.provider_pay_amount))
      ? Number(cachedCheckout.provider_pay_amount)
      : null,
    provider_pay_currency: cachedCheckout.provider_pay_currency ?? null,
    provider_payment_id: cachedCheckout.provider_payment_id ?? null,
    provider_payment_status: cachedCheckout.provider_payment_status ?? null,
  };
};

export const createCryptoDepositInstruction = async ({
  amount,
  applyDepositBonus = false,
  bonusOfferId = null,
  paymentMethodId,
  cryptoCurrency,
  cryptoNetwork,
  promoId = null,
}: {
  amount: number;
  applyDepositBonus?: boolean;
  bonusOfferId?: string | null;
  paymentMethodId: string;
  cryptoCurrency: string;
  cryptoNetwork: string;
  promoId?: string | null;
}): Promise<CryptoDepositInstructionPayload> => {
  void applyDepositBonus;

  const buildPayloadFromPartial = (data: Partial<CryptoDepositInstructionPayload>): CryptoDepositInstructionPayload => ({
    address: String(data.address ?? ""),
    amount: Number(data.amount ?? 0),
    confirmations_required: Number(data.confirmations_required ?? 0),
    created_at: typeof data.created_at === "string" && data.created_at ? data.created_at : new Date().toISOString(),
    deposit_request_id: String(data.deposit_request_id ?? ""),
    hosted_checkout_url: data.hosted_checkout_url ?? null,
    instruction_id: String(data.instruction_id ?? ""),
    instruction_status: (data.instruction_status ?? "awaiting_payment") as CryptoInstructionStatus,
    memo_label: data.memo_label ?? null,
    memo_value: data.memo_value ?? null,
    payment_method_id: String(data.payment_method_id ?? ""),
    promo_bonus: Number(data.promo_bonus ?? 0),
    provider_name: data.provider_name ?? null,
    provider_order_id: data.provider_order_id ?? null,
    provider_pay_amount: Number.isFinite(Number(data.provider_pay_amount))
      ? Number(data.provider_pay_amount)
      : null,
    provider_pay_currency: data.provider_pay_currency ?? null,
    provider_payment_id: data.provider_payment_id ?? null,
    provider_payment_status: data.provider_payment_status ?? null,
  });

  const accessToken = await getAppwriteIdToken();

  if (!accessToken) {
    throw new Error("Authentication required. Please sign in again.");
  }

  const response = await fetch("/api/crypto/create-payment", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      bonusOfferId,
      paymentMethodId,
      cryptoCurrency,
      cryptoNetwork,
      promoId,
    }),
  });

  let responseBody: { error?: string; instruction?: Partial<CryptoDepositInstructionPayload> } | null = null;
  try {
    responseBody = (await response.json()) as { error?: string; instruction?: Partial<CryptoDepositInstructionPayload> };
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    throw new Error(responseBody?.error || "Failed to create Plisio deposit.");
  }

  const payload = buildPayloadFromPartial((responseBody?.instruction ?? {}) as Partial<CryptoDepositInstructionPayload>);

  if (payload.instruction_id && payload.address) {
    clearCryptoDepositCheckoutCache(payload.instruction_id);
  }

  return payload;
};

export const recoverCryptoDepositCheckout = async ({
  instructionId,
}: {
  instructionId: string;
}): Promise<CryptoDepositInstructionPayload> => {
  const buildPayloadFromPartial = (data: Partial<CryptoDepositInstructionPayload>): CryptoDepositInstructionPayload => ({
    address: String(data.address ?? ""),
    amount: Number(data.amount ?? 0),
    confirmations_required: Number(data.confirmations_required ?? 0),
    created_at: typeof data.created_at === "string" && data.created_at ? data.created_at : new Date().toISOString(),
    deposit_request_id: String(data.deposit_request_id ?? ""),
    hosted_checkout_url: data.hosted_checkout_url ?? null,
    instruction_id: String(data.instruction_id ?? ""),
    instruction_status: (data.instruction_status ?? "awaiting_payment") as CryptoInstructionStatus,
    memo_label: data.memo_label ?? null,
    memo_value: data.memo_value ?? null,
    payment_method_id: String(data.payment_method_id ?? ""),
    promo_bonus: Number(data.promo_bonus ?? 0),
    provider_name: data.provider_name ?? null,
    provider_order_id: data.provider_order_id ?? null,
    provider_pay_amount: Number.isFinite(Number(data.provider_pay_amount))
      ? Number(data.provider_pay_amount)
      : null,
    provider_pay_currency: data.provider_pay_currency ?? null,
    provider_payment_id: data.provider_payment_id ?? null,
    provider_payment_status: data.provider_payment_status ?? null,
  });

  const accessToken = await getAppwriteIdToken();

  if (!accessToken) {
    throw new Error("Authentication required. Please sign in again.");
  }

  const response = await fetch("/api/crypto/create-payment", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      instructionId,
    }),
  });

  let responseBody: { error?: string; instruction?: Partial<CryptoDepositInstructionPayload> } | null = null;
  try {
    responseBody = (await response.json()) as { error?: string; instruction?: Partial<CryptoDepositInstructionPayload> };
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    throw new Error(responseBody?.error || "Failed to restore Plisio checkout.");
  }

  const payload = buildPayloadFromPartial((responseBody?.instruction ?? {}) as Partial<CryptoDepositInstructionPayload>);

  if (payload.instruction_id && payload.hosted_checkout_url) {
    saveCryptoDepositCheckoutCache({
      hosted_checkout_url: payload.hosted_checkout_url,
      instruction_id: payload.instruction_id,
      payment_method_id: payload.payment_method_id,
      provider_name: payload.provider_name ?? null,
      provider_order_id: payload.provider_order_id ?? null,
      provider_pay_amount: payload.provider_pay_amount ?? null,
      provider_pay_currency: payload.provider_pay_currency ?? null,
      provider_payment_id: payload.provider_payment_id ?? null,
      provider_payment_status: payload.provider_payment_status ?? null,
    });
  }

  return payload;
};

export const getLatestOpenCryptoDepositInstruction = async ({
  paymentMethodId,
  userId,
}: {
  paymentMethodId?: string | null;
  userId: string;
}): Promise<CryptoDepositInstructionWithMethod | null> => {
  let query = api.from("crypto_deposit_instructions")
    .select("*, payment_method:crypto_payment_methods(*)")
    .eq("user_id", userId)
    .in("instruction_status", ["awaiting_payment", "payment_detected", "confirming"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (paymentMethodId) {
    query = query.eq("payment_method_id", paymentMethodId);
  }

  const response = await query.maybeSingle();

  if (response.error) {
    throw withAutoCryptoMigrationHint(response.error);
  }

  return (response.data ?? null) as CryptoDepositInstructionWithMethod | null;
};
