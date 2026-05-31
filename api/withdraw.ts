import type { IncomingMessage, ServerResponse } from "node:http";
import { getHeaderValue } from "../src/lib/cryptoWebhook.js";
import { readJsonRequestBody } from "./_lib/sasapay.js";
import { getSupabaseAdminClient, getSupabaseUserClient } from "./_lib/supabaseAdmin.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;

type RequestPayload = {
  amount?: number;
  destination?: string;
  forfeitBonus?: boolean;
  method?: string;
};

const BONUS_TURNOVER_MULTIPLIER = 10;

const sendJson = (response: ApiResponse, statusCode: number, payload: Record<string, unknown>) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const asString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseBearerToken = (authorizationHeader: string) => {
  const trimmed = authorizationHeader.trim();
  if (!trimmed) return null;

  const [scheme, token] = trimmed.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const maybeMessage = "message" in error && typeof error.message === "string" ? error.message : null;
    const maybeDetails = "details" in error && typeof error.details === "string" ? error.details : null;
    const maybeHint = "hint" in error && typeof error.hint === "string" ? error.hint : null;
    return [maybeMessage, maybeDetails, maybeHint].filter(Boolean).join(" ");
  }
  return typeof error === "string" ? error : "";
};

const formatUsd = (value: number) => (Number.isFinite(value) ? value.toFixed(2) : "0.00");

const getTurnoverSnapshot = async (adminClient: ReturnType<typeof getSupabaseAdminClient>, userId: string) => {
  const depositsResponse = await adminClient
    .from("deposit_requests")
    .select("welcome_bonus,deposit_bonus,promo_bonus")
    .eq("user_id", userId)
    .eq("status", "approved");

  if (depositsResponse.error) {
    throw depositsResponse.error;
  }

  const bonusTotal = (depositsResponse.data ?? []).reduce(
    (sum, deposit) =>
      sum +
      Number(deposit.welcome_bonus ?? 0) +
      Number(deposit.deposit_bonus ?? 0) +
      Number(deposit.promo_bonus ?? 0),
    0,
  );

  const tradesResponse = await adminClient
    .from("trades")
    .select("amount")
    .eq("user_id", userId)
    .in("status", ["won", "lost", "expired"])
    .is("tournament_participant_id", null);

  if (tradesResponse.error) {
    throw tradesResponse.error;
  }

  const completedTurnover = (tradesResponse.data ?? []).reduce((sum, trade) => sum + Number(trade.amount ?? 0), 0);
  const requiredTurnover = Math.round(bonusTotal * BONUS_TURNOVER_MULTIPLIER * 100) / 100;
  const remainingTurnover = Math.max(0, requiredTurnover - completedTurnover);

  return {
    bonusTotal,
    completedTurnover,
    isComplete: bonusTotal <= 0 || remainingTurnover <= 0,
    remainingTurnover,
    requiredTurnover,
  };
};

const clearActiveBonusRows = async ({
  adminClient,
  userId,
}: {
  adminClient: ReturnType<typeof getSupabaseAdminClient>;
  userId: string;
}) => {
  const response = await adminClient
    .from("deposit_requests")
    .update({
      deposit_bonus: 0,
      promo_bonus: 0,
      updated_at: new Date().toISOString(),
      welcome_bonus: 0,
    })
    .eq("user_id", userId)
    .eq("status", "approved");

  if (response.error) {
    throw response.error;
  }
};

const createWithdrawalRequest = async ({
  amount,
  destination,
  forfeitBonus,
  method,
  userId,
}: {
  amount: number;
  destination: string;
  forfeitBonus: boolean;
  method: string;
  userId: string;
}) => {
  const adminClient = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const profileResponse = await adminClient
    .from("profiles")
    .select("id,balance,kyc_status,reserved_withdrawal_balance")
    .eq("id", userId)
    .maybeSingle();

  if (profileResponse.error) {
    throw profileResponse.error;
  }

  const profile = profileResponse.data;
  if (!profile) {
    throw new Error("Profile not found");
  }

  const settingsResponse = await adminClient
    .from("platform_settings")
    .select("require_kyc_withdrawal")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (settingsResponse.error) {
    throw settingsResponse.error;
  }

  const requireKyc = Boolean(settingsResponse.data?.require_kyc_withdrawal ?? true);
  if (requireKyc && !["verified", "approved"].includes(String(profile.kyc_status ?? "").toLowerCase())) {
    throw new Error("Account verification is required before withdrawal");
  }

  const pendingResponse = await adminClient
    .from("withdrawal_requests")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (pendingResponse.error) {
    throw pendingResponse.error;
  }

  if (pendingResponse.data?.id) {
    throw new Error("You already have a pending withdrawal request");
  }

  const balance = Number(profile.balance ?? 0);
  const reservedBalance = Number(profile.reserved_withdrawal_balance ?? 0);
  const availableBalance = Math.max(0, balance - reservedBalance);
  const turnover = await getTurnoverSnapshot(adminClient, userId);
  const needsBonusForfeit = turnover.bonusTotal > 0 && !turnover.isComplete;
  const forfeitedBonusAmount = needsBonusForfeit && forfeitBonus ? turnover.bonusTotal : 0;
  const availableAfterBonus = Math.max(0, availableBalance - forfeitedBonusAmount);

  if (needsBonusForfeit && !forfeitBonus) {
    throw new Error(
      `Bonus turnover requirement not met. Required volume: $${formatUsd(turnover.requiredTurnover)}, completed: $${formatUsd(turnover.completedTurnover)}.`,
    );
  }

  if (amount > availableAfterBonus) {
    const balanceLabel =
      forfeitedBonusAmount > 0
        ? `Your withdrawable balance after removing the active bonus is $${formatUsd(availableAfterBonus)}.`
        : `Your available balance is $${formatUsd(availableBalance)}.`;
    throw new Error(`Insufficient available balance. ${balanceLabel}`);
  }

  const insertResponse = await adminClient
    .from("withdrawal_requests")
    .insert({
      admin_note:
        forfeitedBonusAmount > 0
          ? `User chose to withdraw without bonus. Active bonus forfeited: $${formatUsd(forfeitedBonusAmount)}.`
          : null,
      amount,
      audit_log: [
        {
          action: "requested",
          amount,
          created_at: nowIso,
          forfeited_bonus_amount: forfeitedBonusAmount,
          method,
          status: "pending",
          turnover_multiplier: BONUS_TURNOVER_MULTIPLIER,
        },
      ],
      destination,
      method,
      status: "pending",
      user_id: userId,
    })
    .select("id,status")
    .maybeSingle();

  if (insertResponse.error) {
    throw insertResponse.error;
  }

  const requestId = asString(insertResponse.data?.id);
  if (!requestId) {
    throw new Error("Withdrawal request could not be created.");
  }

  const nextBalance = balance - amount - forfeitedBonusAmount;
  const profileUpdateResponse = await adminClient
    .from("profiles")
    .update({
      balance: nextBalance,
      updated_at: nowIso,
    })
    .eq("id", userId);

  if (profileUpdateResponse.error) {
    await adminClient.from("withdrawal_requests").delete().eq("id", requestId);
    throw profileUpdateResponse.error;
  }

  try {
    if (forfeitedBonusAmount > 0) {
      await clearActiveBonusRows({ adminClient, userId });
    }
  } catch (error) {
    await adminClient.from("profiles").update({ balance, updated_at: nowIso }).eq("id", userId);
    await adminClient.from("withdrawal_requests").delete().eq("id", requestId);
    throw error;
  }

  return {
    amount,
    bonus_turnover: turnover,
    destination,
    forfeited_bonus_amount: forfeitedBonusAmount,
    method,
    request_id: requestId,
    status: asString(insertResponse.data?.status) || "pending",
  };
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = (await readJsonRequestBody(request)) as RequestPayload & { action?: string; requestId?: string };
    const accessToken = parseBearerToken(getHeaderValue(request.headers, "authorization"));

    if (!accessToken) {
      sendJson(response, 401, { error: "Missing Bearer token." });
      return;
    }

    const userClient = getSupabaseUserClient(accessToken);
    const authResponse = await userClient.auth.getUser();

    if (authResponse.error || !authResponse.data.user?.id) {
      sendJson(response, 401, { error: "Invalid authentication token." });
      return;
    }

    if (body.action === "cancel") {
      const requestId = body.requestId;
      if (!requestId) {
        sendJson(response, 400, { error: "Cancellation requires a requestId." });
        return;
      }

      const adminClient = getSupabaseAdminClient();
      const rpcResponse = await adminClient.rpc("cancel_withdrawal", {
        p_request_id: requestId,
      });

      if (rpcResponse.error) {
        throw rpcResponse.error;
      }

      sendJson(response, 200, { result: "cancelled", request_id: requestId });
      return;
    }

    const amount = asNumber(body.amount ?? 0);
    const destination = asString(body.destination ?? null);
    const method = asString(body.method ?? null);

    if (!Number.isFinite(amount) || Number(amount) <= 0) {
      sendJson(response, 400, { error: "amount must be a positive number." });
      return;
    }

    if (Number(amount) < 10) {
      sendJson(response, 400, { error: "Minimum withdrawal is $10." });
      return;
    }

    if (!destination) {
      sendJson(response, 400, { error: "Withdrawal destination is required." });
      return;
    }

    if (!method) {
      sendJson(response, 400, { error: "Withdrawal method is required." });
      return;
    }

    const payload = await createWithdrawalRequest({
      amount: Number(amount),
      destination,
      forfeitBonus: body.forfeitBonus === true,
      method,
      userId: authResponse.data.user.id,
    });

    sendJson(response, 200, payload);
  } catch (error) {
    console.error("Withdrawal request creation failed", error);
    sendJson(response, 500, {
      error: getErrorMessage(error) || "Failed to submit withdrawal request.",
    });
  }
}
