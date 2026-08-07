import type { IncomingMessage, ServerResponse } from "node:http";
import type { Json } from "../../src/integrations/supabase/types.js";
import { readJsonRequestBody } from "../_lib/sasapay.js";
import { query, queryOne, rpc, userRpc } from "../_lib/db.js";
import { authenticateRequest, clerkUserIdToUuid } from "../_lib/clerkWebhook.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;

type RequestPayload = {
  adminNote?: string | null;
  requestId?: string;
  status?: string;
};

type SupportedStatus = "approved" | "rejected" | "completed" | "failed";

type JsonRecord = Record<string, Json>;

const sendJson = (response: ApiResponse, statusCode: number, payload: Record<string, unknown>) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

const asString = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const isSupportedStatus = (value: string | null): value is SupportedStatus =>
  value === "approved" || value === "rejected" || value === "completed" || value === "failed";

const readAuditLog = (value: Json | null): JsonRecord[] =>
  Array.isArray(value) ? value.filter((entry): entry is JsonRecord => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)) : [];

const appendAuditEntry = (value: Json | null, entry: JsonRecord) => [...readAuditLog(value), entry];

const requireFinanceUser = async (clerkUserId: string) => {
  const userId = clerkUserIdToUuid(clerkUserId);
  const roleRows = await query("select role from user_roles where user_id = $1", [userId]);

  const roles = new Set((roleRows ?? []).map((row) => String(row.role)));
  if (!roles.has("admin") && !roles.has("finance_manager")) {
    throw new Error("Only finance managers or super admins can review mobile money withdrawal requests.");
  }

  return userId;
};

const finalizeManualWithdrawal = async ({
  adminNote,
  adminUserId,
  requestId,
  status,
}: {
  adminNote: string | null;
  adminUserId: string;
  requestId: string;
  status: "completed" | "failed";
}) => {
  const now = new Date().toISOString();
  const withdrawalRequest = await queryOne(
    "select * from withdrawal_requests where id = $1 and provider_name = $2",
    [requestId, "sasapay"],
  );

  if (!withdrawalRequest) {
    throw new Error("Mobile money withdrawal request not found.");
  }

  if (withdrawalRequest.status !== "approved") {
    throw new Error("Only approved manual M-PESA withdrawals can be completed or failed.");
  }

  const defaultNote =
    status === "completed" ? "Completed manually through the merchant dashboard." : "Manual payout failed in the merchant dashboard.";
  const resultCode = status === "completed" ? "MANUAL_COMPLETED" : "MANUAL_FAILED";
  const resultDesc = adminNote || defaultNote;
  const auditAction = status === "completed" ? "completed_manual" : "failed_manual";

  const updatePayload = {
    admin_note: adminNote,
    audit_log: appendAuditEntry(withdrawalRequest.audit_log as Json | null, {
      action: auditAction,
      actor_id: adminUserId,
      admin_note: adminNote,
      created_at: now,
      provider_result_desc: resultDesc,
      status,
    }),
    completed_at: status === "completed" ? now : null,
    failed_at: status === "failed" ? now : null,
    failure_reason: status === "failed" ? resultDesc : null,
    last_processing_error: status === "failed" ? resultDesc : null,
    processed_at: now,
    processed_by: adminUserId,
    provider_result_code: resultCode,
    provider_result_desc: resultDesc,
    provider_status: status === "completed" ? "manual_completed" : "manual_failed",
    status,
    updated_at: now,
  };

  const user_id = String(withdrawalRequest.user_id);
  const renderedAmount = Number(withdrawalRequest.amount ?? 0);

  if (status === "completed") {
    const profile = await queryOne("select balance, reserved_withdrawal_balance from profiles where id = $1", [user_id]);
    const balance = Number(profile?.balance ?? 0);
    const reservedBalance = Number(profile?.reserved_withdrawal_balance ?? 0);
    await query(
      "update profiles set balance = $1, reserved_withdrawal_balance = $2, updated_at = $3 where id = $4",
      [Math.max(0, balance - renderedAmount), Math.max(0, reservedBalance - renderedAmount), now, user_id],
    );
  } else {
    const profile = await queryOne("select reserved_withdrawal_balance from profiles where id = $1", [user_id]);
    const reservedBalance = Number(profile?.reserved_withdrawal_balance ?? 0);
    await query(
      "update profiles set reserved_withdrawal_balance = $1, updated_at = $2 where id = $3",
      [Math.max(0, reservedBalance - renderedAmount), now, user_id],
    );
  }

  const updatedRow = await queryOne(
    `update withdrawal_requests
        set ${Object.keys(updatePayload)
          .map((key, index) => `${key} = $${index + 1}`)
          .join(", ")}
      where id = $${Object.keys(updatePayload).length + 1} and status = $${Object.keys(updatePayload).length + 2}
      returning id, status, amount, method`,
    [...Object.values(updatePayload), requestId, "approved"],
  );

  if (!updatedRow) {
    throw new Error("Withdrawal request was updated by another session. Refresh and try again.");
  }

  const amountLabel = Number(withdrawalRequest.amount ?? 0).toFixed(2);

  await rpc("create_notification_internal", {
    p_data: {
      amount: withdrawalRequest.amount,
      method: withdrawalRequest.method,
      status,
      withdrawal_request_id: withdrawalRequest.id,
    },
    p_external_key: `withdrawal_request:${withdrawalRequest.id}:${status}`,
    p_link_url: "/withdraw",
    p_message:
      status === "completed"
        ? `Your M-PESA withdrawal of $${amountLabel} was sent manually and marked as completed.`
        : `Your M-PESA withdrawal of $${amountLabel} could not be completed. The funds remain available in your balance.`,
    p_title: status === "completed" ? "Withdrawal completed" : "Withdrawal failed",
    p_type: status === "completed" ? "withdrawal_completed" : "withdrawal_failed",
    p_user_id: withdrawalRequest.user_id,
  });

  return {
    request_id: String(withdrawalRequest.id),
    status,
  };
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = (await readJsonRequestBody(request)) as RequestPayload;
    const requestId = asString(body.requestId);
    const status = asString(body.status)?.toLowerCase() ?? null;
    const adminNote = asString(body.adminNote);

    const clerkUserId = await authenticateRequest(request.headers);
    if (!clerkUserId) {
      sendJson(response, 401, { error: "Missing or invalid Bearer token." });
      return;
    }

    if (!requestId || !isSupportedStatus(status)) {
      sendJson(response, 400, { error: "requestId and a valid status are required." });
      return;
    }

    const adminUserId = await requireFinanceUser(clerkUserId);

    if (status === "approved" || status === "rejected") {
      await userRpc("admin_review_mobile_money_withdrawal", clerkUserId, {
        p_admin_note: adminNote,
        p_request_id: requestId,
        p_status: status,
      });
    } else {
      await finalizeManualWithdrawal({
        adminNote,
        adminUserId,
        requestId,
        status,
      });
    }

    sendJson(response, 200, {
      request_id: requestId,
      status,
    });
  } catch (error) {
    console.error("Mobile money withdrawal review failed", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Failed to review mobile money withdrawal request.",
    });
  }
}
