import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonRequestBody } from "./_lib/sasapay.js";
import { query, queryOne, rpc } from "./_lib/db.js";
import { authenticateRequest, clerkUserIdToUuid } from "./_lib/clerkWebhook.js";

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

const getTurnoverSnapshot = async (userId: string) => {
  const deposits = await query(
    'select welcome_bonus, deposit_bonus, promo_bonus from deposit_requests where user_id = $1 and status = $2',
    [userId, "approved"],
  );

  const bonusTotal = deposits.reduce(
    (sum, deposit) =>
      sum +
      Number(deposit.welcome_bonus ?? 0) +
      Number(deposit.deposit_bonus ?? 0) +
      Number(deposit.promo_bonus ?? 0),
    0,
  );

  const trades = await query(
    'select amount from trades where user_id = $1 and status = any($2) and tournament_participant_id is null',
    [userId, ["won", "lost", "expired"]],
  );

  const completedTurnover = trades.reduce((sum, trade) => sum + Number(trade.amount ?? 0), 0);
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

const clearActiveBonusRows = async ({ userId }: { userId: string }) => {
  await query(
    "update deposit_requests set deposit_bonus = $1, promo_bonus = $2, updated_at = $3, welcome_bonus = $4 where user_id = $5 and status = $6",
    [0, 0, new Date().toISOString(), 0, userId, "approved"],
  );
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
  const nowIso = new Date().toISOString();

  const profile = await queryOne(
    "select id, balance, kyc_status, reserved_withdrawal_balance from profiles where id = $1",
    [userId],
  );

  if (!profile) {
    throw new Error("Profile not found");
  }

  const settings = await queryOne(
    "select require_kyc_withdrawal from platform_settings order by updated_at desc limit 1",
  );

  const requireKyc = Boolean(settings?.require_kyc_withdrawal ?? true);
  if (requireKyc && !["verified", "approved"].includes(String(profile.kyc_status ?? "").toLowerCase())) {
    throw new Error("Account verification is required before withdrawal");
  }

  const pending = await queryOne(
    "select id from withdrawal_requests where user_id = $1 and status = $2 limit 1",
    [userId, "pending"],
  );

  if (pending?.id) {
    throw new Error("You already have a pending withdrawal request");
  }

  const balance = Number(profile.balance ?? 0);
  const reservedBalance = Number(profile.reserved_withdrawal_balance ?? 0);
  const availableBalance = Math.max(0, balance - reservedBalance);
  const turnover = await getTurnoverSnapshot(userId);
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

  const inserted = await query(
    `insert into withdrawal_requests (
       admin_note, amount, audit_log, destination, method, status, user_id
     ) values ($1, $2, $3, $4, $5, $6, $7) returning id, status`,
    [
      forfeitedBonusAmount > 0
        ? `User chose to withdraw without bonus. Active bonus forfeited: $${formatUsd(forfeitedBonusAmount)}.`
        : null,
      amount,
      [
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
      "pending",
      userId,
    ],
  );
  const insertedRow = inserted[0];

  const requestId = asString(insertedRow?.id);
  if (!requestId) {
    throw new Error("Withdrawal request could not be created.");
  }

  const nextBalance = balance - amount - forfeitedBonusAmount;
  await query(
    "update profiles set balance = $1, updated_at = $2 where id = $3",
    [nextBalance, nowIso, userId],
  );

  try {
    if (forfeitedBonusAmount > 0) {
      await clearActiveBonusRows({ userId });
    }
  } catch (error) {
    await query("update profiles set balance = $1, updated_at = $2 where id = $3", [balance, nowIso, userId]);
    await query("delete from withdrawal_requests where id = $1", [requestId]);
    throw error;
  }

  return {
    amount,
    bonus_turnover: turnover,
    destination,
    forfeited_bonus_amount: forfeitedBonusAmount,
    method,
    request_id: requestId,
    status: asString(insertedRow?.status) || "pending",
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
    const clerkUserId = await authenticateRequest(request.headers);

    if (!clerkUserId) {
      sendJson(response, 401, { error: "Missing or invalid Bearer token." });
      return;
    }

    const userId = clerkUserIdToUuid(clerkUserId);

    if (body.action === "cancel") {
      const requestId = body.requestId;
      if (!requestId) {
        sendJson(response, 400, { error: "Cancellation requires a requestId." });
        return;
      }

      const rpcResponse = await rpc("cancel_withdrawal", {
        p_request_id: requestId,
      });
      void rpcResponse;

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
      userId,
    });

    sendJson(response, 200, payload);
  } catch (error) {
    console.error("Withdrawal request creation failed", error);
    sendJson(response, 500, {
      error: getErrorMessage(error) || "Failed to submit withdrawal request.",
    });
  }
}
