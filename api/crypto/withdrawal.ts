import type { IncomingMessage, ServerResponse } from "node:http";
import type { Json } from "../../src/integrations/supabase/types.js";
import { readJsonRequestBody } from "../_lib/sasapay.js";
import { query, queryOne, rpc } from "../_lib/db.js";
import { authenticateRequest, clerkUserIdToUuid } from "../_lib/clerkWebhook.js";
import { requestPlisioPayout, buildPlisioCallbackUrl, normalizePlisioPayoutPayload } from "../_lib/plisio.js";

const appendAuditEntry = (
  value: Json | null,
  entry: Record<string, unknown>,
) => {
  const existing = (value as Record<string, unknown>[] ?? []);
  return [...existing, entry];
};

const requireFinanceUser = async (clerkUserId: string) => {
  const userId = clerkUserIdToUuid(clerkUserId);
  const roleRows = await query("select role from user_roles where user_id = $1", [userId]);

  const roles = new Set((roleRows ?? []).map((row) => String(row.role)));
  if (!roles.has("admin") && !roles.has("finance_manager")) {
    throw new Error("Only finance managers or super admins can approve/reject crypto withdrawals.");
  }
  return userId;
};

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;

type RequestPayload = {
  amount?: number;
  destination?: string;
  cryptoCurrency?: string;
  cryptoNetwork?: string;
  cryptoMemo?: string;
  forfeitBonus?: boolean;
  adminNote?: string;
  requestId?: string;
  action?: "approve" | "reject";
};

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
    "select welcome_bonus, deposit_bonus, promo_bonus from deposit_requests where user_id = $1 and status = $2",
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
    "select amount from trades where user_id = $1 and status = any($2) and tournament_participant_id is null",
    [userId, ["won", "lost", "expired"]],
  );

  const completedTurnover = trades.reduce((sum, trade) => sum + Number(trade.amount ?? 0), 0);
  const requiredTurnover = Math.round(bonusTotal * 10 * 100) / 100;
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

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const urlString = request.url ?? "";
  const path = typeof urlString === "string" ? urlString.replace(/^\/api/, "") : "";
  const method = request.method ?? "";

  try {
    if (method === "POST") {
      const body = (await readJsonRequestBody(request)) as RequestPayload;

      // Handle crypto withdrawal request
      if (path.endsWith("/crypto/withdrawal") || path === "/api/crypto/withdrawal") {
        const clerkUserId = await authenticateRequest(request.headers);
        if (!clerkUserId) {
          sendJson(response, 401, { error: "Missing or invalid Bearer token." });
          return;
        }

        const amount = asNumber(body.amount ?? 0);
        const destination = asString(body.destination ?? null);
        const cryptoCurrency = asString(body.cryptoCurrency ?? null);
        const cryptoNetwork = asString(body.cryptoNetwork ?? null);
        const cryptoMemo = asString(body.cryptoMemo ?? null);
        const forfeitBonus = body.forfeitBonus === true;

        if (!Number.isFinite(amount) || Number(amount) <= 0) {
          sendJson(response, 400, { error: "amount must be a positive number." });
          return;
        }

        if (Number(amount) < 10) {
          sendJson(response, 400, { error: "Minimum withdrawal is $10." });
          return;
        }

        if (!destination) {
          sendJson(response, 400, { error: "Withdrawal destination (wallet address) is required." });
          return;
        }

        if (!cryptoCurrency || !cryptoNetwork) {
          sendJson(response, 400, { error: "Crypto currency and network are required." });
          return;
        }

        const userId = clerkUserIdToUuid(clerkUserId);

        const settings = await queryOne(
          "select require_kyc_withdrawal from platform_settings order by updated_at desc limit 1",
        );

        const requireKyc = Boolean(settings?.require_kyc_withdrawal ?? true);
        const profile = await queryOne(
          "select id, balance, kyc_status, reserved_withdrawal_balance from profiles where id = $1",
          [userId],
        );

        if (!profile) {
          sendJson(response, 404, { error: "Profile not found" });
          return;
        }

        if (requireKyc && !["verified", "approved"].includes(String(profile.kyc_status ?? "").toLowerCase())) {
          sendJson(response, 400, { error: "Account verification is required before withdrawal" });
          return;
        }

        const pending = await queryOne(
          "select id from withdrawal_requests where user_id = $1 and status = $2 limit 1",
          [userId, "pending"],
        );

        if (pending?.id) {
          sendJson(response, 400, { error: "You already have a pending withdrawal request" });
          return;
        }

        const balance = Number(profile.balance ?? 0);
        const reservedBalance = Number(profile.reserved_withdrawal_balance ?? 0);
        const availableBalance = Math.max(0, balance - reservedBalance);

        const turnover = await getTurnoverSnapshot(userId);
        const needsBonusForfeit = turnover.bonusTotal > 0 && !turnover.isComplete;
        const forfeitedBonusAmount = needsBonusForfeit && forfeitBonus ? turnover.bonusTotal : 0;
        const withdrawableBalance = Math.max(0, availableBalance - forfeitedBonusAmount);

        if (needsBonusForfeit && !forfeitBonus) {
          sendJson(response, 400, {
            error: `Bonus turnover requirement not met. Required volume: $${formatUsd(turnover.requiredTurnover)}, completed: $${formatUsd(turnover.completedTurnover)}.`,
          });
          return;
        }

        if (amount > withdrawableBalance) {
          const balanceLabel = forfeitedBonusAmount > 0
            ? `Your withdrawable balance after removing the active bonus is $${formatUsd(withdrawableBalance)}.`
            : `Your available balance is $${formatUsd(availableBalance)}.`;
          sendJson(response, 400, {
            error: `Insufficient available balance. ${balanceLabel}`,
          });
          return;
        }

        const methodLabel = `CRYPTO ${cryptoCurrency.toUpperCase()} (${cryptoNetwork.toUpperCase()})`;
        const nowIso = new Date().toISOString();
        const merchantRef = `CRYPTO_${userId.replace(/-/g, "")}_${Date.now()}`;

        const inserted = await query(
          `insert into withdrawal_requests (
             amount, destination, method, status, user_id,
             crypto_currency, crypto_network, crypto_wallet_address, crypto_memo,
             merchant_ref, provider_name, audit_log, next_retry_at
           ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           returning id, status`,
          [
            amount,
            destination,
            methodLabel,
            "pending",
            userId,
            cryptoCurrency.toUpperCase(),
            cryptoNetwork.toUpperCase(),
            destination,
            cryptoMemo,
            merchantRef,
            "plisio",
            [
              {
                action: "requested",
                amount,
                crypto_currency: cryptoCurrency.toUpperCase(),
                crypto_network: cryptoNetwork.toUpperCase(),
                created_at: nowIso,
                forfeited_bonus_amount: forfeitedBonusAmount,
                method: methodLabel,
                status: "pending",
                turnover_multiplier: 10,
              },
            ],
            nowIso,
          ],
        );

        const insertedRow = inserted[0];
        const requestId = asString(insertedRow?.id);
        if (!requestId) {
          sendJson(response, 500, { error: "Withdrawal request could not be created." });
          return;
        }

        const nextBalance = balance - amount - forfeitedBonusAmount;
        const nextReservedBalance = reservedBalance + amount;

        await query(
          "update profiles set balance = $1, reserved_withdrawal_balance = $2, updated_at = $3 where id = $4",
          [nextBalance, nextReservedBalance, nowIso, userId],
        );

        try {
          if (forfeitedBonusAmount > 0) {
            await clearActiveBonusRows({ userId });
          }
        } catch (error) {
          await query(
            "update profiles set balance = $1, reserved_withdrawal_balance = $2, updated_at = $2 where id = $3",
            [balance, reservedBalance, nowIso, userId],
          );
          await query("delete from withdrawal_requests where id = $1", [requestId]);
          throw error;
        }

        sendJson(response, 200, {
          amount,
          bonus_turnover: turnover,
          destination,
          forfeited_bonus_amount: forfeitedBonusAmount,
          method: methodLabel,
          request_id: requestId,
          status: "pending",
        });
        return;
      }

      // Handle crypto withdrawal admin approval/rejection
      if (path.endsWith("/admin-withdrawal") || path === "/api/crypto/admin-withdrawal") {
        const clerkUserId = await authenticateRequest(request.headers);
        if (!clerkUserId) {
          sendJson(response, 401, { error: "Missing or invalid Bearer token." });
          return;
        }

        const requestId = asString(body.requestId);
        const action = asString(body.action)?.toLowerCase();
        const adminNote = asString(body.adminNote);

        if (!requestId || !action || !["approve", "reject"].includes(action)) {
          sendJson(response, 400, { error: "requestId and action (approve/reject) are required." });
          return;
        }

        const adminUserId = await requireFinanceUser(clerkUserId);

        const withdrawalRequest = await queryOne(
          "select * from withdrawal_requests where id = $1 and provider_name = $2",
          [requestId, "plisio"],
        );

        if (!withdrawalRequest) {
          sendJson(response, 404, { error: "Crypto withdrawal request not found." });
          return;
        }

        const now = new Date().toISOString();

        if (action === "approve") {
          if (withdrawalRequest.status !== "pending") {
            sendJson(response, 400, { error: "Only pending crypto withdrawal requests can be approved." });
            return;
          }

          const plisioCallbackUrl = buildPlisioCallbackUrl("/api/crypto/payout-callback");

          let plisioResponse: Record<string, unknown>;
          try {
            plisioResponse = await requestPlisioPayout({
              amount: Number(withdrawalRequest.amount ?? 0),
              currency: String(withdrawalRequest.crypto_currency ?? "").toLowerCase(),
              address: String(withdrawalRequest.crypto_wallet_address ?? ""),
              memo: withdrawalRequest.crypto_memo ? String(withdrawalRequest.crypto_memo) : undefined,
              orderId: String(withdrawalRequest.merchant_ref ?? requestId),
              callbackUrl: plisioCallbackUrl,
            });
          } catch (plisioError) {
            const errorMessage = plisioError instanceof Error ? plisioError.message : "Plisio payout request failed";

            await query(
              `update withdrawal_requests
                 set admin_note = $1,
                    audit_log = $2,
                    failure_reason = $3,
                    last_processing_error = $4,
                    provider_payload = $5,
                    provider_result_code = $6,
                    provider_result_desc = $7,
                    provider_status = $8,
                    status = $9,
                    updated_at = $10
                 where id = $11`,
              [
                adminNote,
                appendAuditEntry(withdrawalRequest.audit_log as Json | null, {
                  action: "payout_failed",
                  actor_id: adminUserId,
                  admin_note: adminNote,
                  created_at: now,
                  error: errorMessage,
                }),
                `Plisio payout failed: ${errorMessage}`,
                errorMessage,
                { error: errorMessage },
                "PLISIO_ERROR",
                errorMessage,
                "payout_failed",
                "failed",
                now,
                requestId,
              ],
            );

            await query(
              `update profiles set reserved_withdrawal_balance = greatest(0, coalesce(reserved_withdrawal_balance, 0) - $1), updated_at = $2 where id = $3`,
              [Number(withdrawalRequest.amount ?? 0), now, String(withdrawalRequest.user_id)],
            );

            await rpc("create_notification_internal", {
              p_data: {
                amount: withdrawalRequest.amount,
                method: withdrawalRequest.method,
                error: errorMessage,
                withdrawal_request_id: withdrawalRequest.id,
              },
              p_external_key: `withdrawal_request:${requestId}:payout_failed`,
              p_link_url: "/withdraw",
              p_message: `Your crypto withdrawal of $${Number(withdrawalRequest.amount ?? 0).toFixed(2)} could not be sent. The funds remain available in your balance. ${errorMessage}`,
              p_title: "Withdrawal failed",
              p_type: "withdrawal_failed",
              p_user_id: withdrawalRequest.user_id,
            });

            sendJson(response, 200, { request_id: requestId, status: "failed", error: errorMessage });
            return;
          }

          const plisioOperationId = asString(plisioResponse?.id) ?? asString(plisioResponse?.operation_id);

          await query(
            `update withdrawal_requests
               set admin_note = $1,
                   approved_at = $2,
                   approved_by = $3,
                   audit_log = $4,
                   last_processing_error = null,
                   plisio_operation_id = $5,
                   plisio_status = $6,
                   processing_started_at = $7,
                   provider_payload = $8,
                   provider_result_code = null,
                   provider_result_desc = null,
                   provider_status = $9,
                   status = $10,
                   updated_at = $11
               where id = $12
               returning id, status`,
            [
              adminNote,
              now,
              adminUserId,
              appendAuditEntry(withdrawalRequest.audit_log as Json | null, {
                action: "approved_and_sent_to_plisio",
                actor_id: adminUserId,
                admin_note: adminNote,
                created_at: now,
                plisio_operation_id: plisioOperationId,
                plisio_response: plisioResponse as unknown as Json,
              }),
              plisioOperationId,
              asString(plisioResponse?.status) ?? "pending",
              now,
              plisioResponse,
              "processing",
              "processing",
              now,
              requestId,
            ],
          );

          await rpc("create_notification_internal", {
            p_data: {
              amount: withdrawalRequest.amount,
              method: withdrawalRequest.method,
              plisio_operation_id: plisioOperationId,
              withdrawal_request_id: withdrawalRequest.id,
            },
            p_external_key: `withdrawal_request:${requestId}:approved`,
            p_link_url: "/withdraw",
            p_message: `Your crypto withdrawal of $${Number(withdrawalRequest.amount ?? 0).toFixed(2)} has been approved and sent for processing.`,
            p_title: "Withdrawal approved",
            p_type: "withdrawal_approved",
            p_user_id: withdrawalRequest.user_id,
          });

          sendJson(response, 200, { request_id: requestId, status: "processing", plisio_operation_id: plisioOperationId });
          return;
        }

        if (action === "reject") {
          if (!["pending", "approved"].includes(String(withdrawalRequest.status))) {
            sendJson(response, 400, { error: "Only pending or approved crypto withdrawal requests can be rejected." });
            return;
          }

          const defaultNote = "Rejected by finance team.";
          const resultDesc = adminNote || defaultNote;

          await query(
            `update withdrawal_requests
               set admin_note = $1,
                   audit_log = $2,
                   failure_reason = $3,
                   processed_at = $4,
                   processed_by = $5,
                   provider_result_desc = $6,
                   provider_status = $7,
                   rejected_at = $8,
                   status = $9,
                   updated_at = $10
               where id = $11
               returning id, status`,
            [
              adminNote,
              appendAuditEntry(withdrawalRequest.audit_log as Json | null, {
                action: "rejected",
                actor_id: adminUserId,
                admin_note: adminNote,
                created_at: now,
              }),
              resultDesc,
              now,
              adminUserId,
              resultDesc,
              "rejected",
              now,
              "rejected",
              now,
              requestId,
            ],
          );

          await query(
            "update profiles set reserved_withdrawal_balance = greatest(0, coalesce(reserved_withdrawal_balance, 0) - $1), updated_at = $2 where id = $3",
            [Number(withdrawalRequest.amount ?? 0), now, String(withdrawalRequest.user_id)],
          );

          await rpc("create_notification_internal", {
            p_data: {
              amount: withdrawalRequest.amount,
              method: withdrawalRequest.method,
              admin_note: adminNote,
              withdrawal_request_id: withdrawalRequest.id,
            },
            p_external_key: `withdrawal_request:${requestId}:rejected`,
            p_link_url: "/withdraw",
            p_message: `Your crypto withdrawal of $${Number(withdrawalRequest.amount ?? 0).toFixed(2)} was rejected. The funds remain available in your balance.`,
            p_title: "Withdrawal rejected",
            p_type: "withdrawal_rejected",
            p_user_id: withdrawalRequest.user_id,
          });

          sendJson(response, 200, { request_id: requestId, status: "rejected" });
          return;
        }

        sendJson(response, 400, { error: "Invalid action." });
        return;
      }

      // Handle payout callback
      if (path.endsWith("/payout-callback") || path === "/api/crypto/payout-callback") {
        const rawPayload = await readJsonRequestBody(request);

        const plisioSecret = process.env.PLISIO_API_KEY?.trim();
        if (!plisioSecret) {
          console.error("PLISIO_API_KEY not configured for payout callback verification");
          sendJson(response, 500, { error: "Server configuration error" });
          return;
        }

        const crypto = require("node:crypto");
        const normalizedPayload = { ...rawPayload };
        delete normalizedPayload.verify_hash;
        const expected = crypto.createHmac("sha1", plisioSecret).update(JSON.stringify(normalizedPayload)).digest("hex");
        const received = asString(rawPayload.verify_hash)?.replace(/^sha1=/i, "");
        if (!received) {
          sendJson(response, 401, { error: "Invalid Plisio callback signature" });
          return;
        }

        const expectedBuf = Buffer.from(expected, "hex");
        const receivedBuf = Buffer.from(received, "hex");
        if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
          sendJson(response, 401, { error: "Invalid Plisio callback signature" });
          return;
        }

        const normalized = normalizePlisioPayoutPayload(rawPayload);
        const { operationId, status, amount, currency, address, fee, txHash, orderNumber } = normalized;

        if (!operationId || !orderNumber) {
          sendJson(response, 400, { error: "Missing operation ID or order number in callback" });
          return;
        }

        const requestRows = await query(
          "select * from withdrawal_requests where merchant_ref = $1 and provider_name = $2 order by created_at desc limit 1",
          [orderNumber, "plisio"],
        );

        const withdrawalRequest = requestRows[0];
        if (!withdrawalRequest) {
          console.warn("Plisio payout callback: withdrawal request not found", { orderNumber, operationId });
          sendJson(response, 200, { ok: true, message: "Request not found, callback acknowledged" });
          return;
        }

        const requestId = String(withdrawalRequest.id);
        const now = new Date().toISOString();
        const lowerStatus = String(status ?? "").toLowerCase();

        const plisioCompletedStatuses = ["completed", "finished", "confirmed"];
        const plisioFailedStatuses = ["error", "expired", "cancelled", "rejected", "failed"];

        if (plisioCompletedStatuses.includes(lowerStatus)) {
          await query(
            `update withdrawal_requests
               set completed_at = $1,
                   audit_log = $2,
                   plisio_status = $3,
                   plisio_fee = $4,
                   provider_status = $5,
                   provider_transaction_ref = $6,
                   provider_payload = $7,
                   provider_callback_received_at = $8,
                   status = $9,
                   updated_at = $10
               where id = $11`,
            [
              now,
              (() => {
                const existing = (withdrawalRequest.audit_log as Record<string, unknown>[]) ?? [];
                return [...existing, { action: "completed", created_at: now, plisio_operation_id: operationId, tx_hash: txHash, plisio_fee: fee }];
              })(),
              lowerStatus,
              fee ?? null,
              "completed",
              txHash ?? null,
              rawPayload,
              now,
              "completed",
              now,
              requestId,
            ],
          );

          await rpc("create_notification_internal", {
            p_data: {
              amount: withdrawalRequest.amount,
              method: withdrawalRequest.method,
              plisio_operation_id: operationId,
              tx_hash: txHash,
              withdrawal_request_id: withdrawalRequest.id,
            },
            p_external_key: `withdrawal_request:${requestId}:completed`,
            p_link_url: "/withdraw",
            p_message: `Your crypto withdrawal of $${Number(withdrawalRequest.amount ?? 0).toFixed(2)} has been completed successfully. Transaction: ${txHash ?? operationId}`,
            p_title: "Withdrawal completed",
            p_type: "withdrawal_completed",
            p_user_id: withdrawalRequest.user_id,
          });

          sendJson(response, 200, { ok: true, status: "completed", request_id: requestId });
          return;
        }

        if (plisioFailedStatuses.includes(lowerStatus)) {
          await query(
            `update withdrawal_requests
               set failed_at = $1,
                   audit_log = $2,
                   failure_reason = $3,
                   last_processing_error = $4,
                   plisio_status = $5,
                   plisio_fee = $6,
                   provider_status = $7,
                   provider_transaction_ref = $8,
                   provider_payload = $9,
                   provider_callback_received_at = $10,
                   status = $11,
                   updated_at = $12
               where id = $13`,
            [
              now,
              (() => {
                const existing = (withdrawalRequest.audit_log as Record<string, unknown>[]) ?? [];
                return [...existing, { action: "payout_failed_via_polling", created_at: now, plisio_operation_id: operationId, plisio_status: lowerStatus }];
              })(),
              `Plisio payout failed with status: ${lowerStatus}`,
              `Plisio payout failed with status: ${lowerStatus}`,
              lowerStatus,
              fee ?? null,
              "failed",
              txHash ?? null,
              rawPayload,
              now,
              "failed",
              now,
              requestId,
            ],
          );

          await query(
            "update profiles set reserved_withdrawal_balance = greatest(0, coalesce(reserved_withdrawal_balance, 0) - $1), updated_at = $2 where id = $3",
            [Number(withdrawalRequest.amount ?? 0), now, String(withdrawalRequest.user_id)],
          );

          await rpc("create_notification_internal", {
            p_data: {
              amount: withdrawalRequest.amount,
              method: withdrawalRequest.method,
              plisio_operation_id: operationId,
              plisio_status: lowerStatus,
              withdrawal_request_id: withdrawalRequest.id,
            },
            p_external_key: `withdrawal_request:${requestId}:payout_failed`,
            p_link_url: "/withdraw",
            p_message: `Your crypto withdrawal of $${Number(withdrawalRequest.amount ?? 0).toFixed(2)} could not be completed. The funds remain available in your balance. Plisio status: ${lowerStatus}`,
            p_title: "Withdrawal failed",
            p_type: "withdrawal_failed",
            p_user_id: withdrawalRequest.user_id,
          });

          sendJson(response, 200, { ok: true, status: "failed", request_id: requestId });
          return;
        }

        await query(
          `update withdrawal_requests
             set plisio_status = $1,
                 provider_payload = $2,
                 provider_callback_received_at = $3,
                 updated_at = $4
           where id = $5`,
            [lowerStatus, rawPayload, now, now, requestId],
          );

          sendJson(response, 200, { ok: true, status: "pending", request_id: requestId });
          return;
        }

        sendJson(response, 404, { error: "Not found" });
      } else {
        sendJson(response, 405, { error: "Method not allowed" });
      }
  } catch (error) {
    console.error("Crypto withdrawal API failed", error);
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Internal server error" });
  }
};