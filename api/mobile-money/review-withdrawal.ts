import type { IncomingMessage, ServerResponse } from "node:http";
import type { Json } from "../../src/integrations/supabase/types.js";
import { getHeaderValue } from "../../src/lib/cryptoWebhook.js";
import { readJsonRequestBody } from "../_lib/sasapay.js";
import { getSupabaseAdminClient, getSupabaseUserClient } from "../_lib/supabaseAdmin.js";

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

const parseBearerToken = (authorizationHeader: string) => {
  const trimmed = authorizationHeader.trim();
  if (!trimmed) return null;

  const [scheme, token] = trimmed.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
};

const isSupportedStatus = (value: string | null): value is SupportedStatus =>
  value === "approved" || value === "rejected" || value === "completed" || value === "failed";

const readAuditLog = (value: Json | null): JsonRecord[] =>
  Array.isArray(value) ? value.filter((entry): entry is JsonRecord => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)) : [];

const appendAuditEntry = (value: Json | null, entry: JsonRecord) => [...readAuditLog(value), entry];

const requireFinanceUser = async (accessToken: string) => {
  const userClient = getSupabaseUserClient(accessToken);
  const authResponse = await userClient.auth.getUser();

  if (authResponse.error || !authResponse.data.user?.id) {
    throw new Error("Invalid authentication token.");
  }

  const userId = authResponse.data.user.id;
  const rolesResponse = await userClient.from("user_roles").select("role").eq("user_id", userId);

  if (rolesResponse.error) {
    throw rolesResponse.error;
  }

  const roles = new Set((rolesResponse.data ?? []).map((row) => row.role));
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
  const adminClient = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const requestResponse = await adminClient
    .from("withdrawal_requests")
    .select("*")
    .eq("id", requestId)
    .eq("provider_name", "sasapay")
    .maybeSingle();

  if (requestResponse.error) {
    throw requestResponse.error;
  }

  const withdrawalRequest = requestResponse.data;

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
    audit_log: appendAuditEntry(withdrawalRequest.audit_log, {
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

  const profileResponse =
    status === "completed"
      ? await adminClient
          .from("profiles")
          .select("balance, reserved_withdrawal_balance")
          .eq("id", withdrawalRequest.user_id)
          .maybeSingle()
      : null;

  if (profileResponse?.error) {
    throw profileResponse.error;
  }

  if (status === "completed") {
    const balance = Number(profileResponse?.data?.balance ?? 0);
    const reservedBalance = Number(profileResponse?.data?.reserved_withdrawal_balance ?? 0);
    const amount = Number(withdrawalRequest.amount ?? 0);
    const updateProfileResponse = await adminClient
      .from("profiles")
      .update({
        balance: Math.max(0, balance - amount),
        reserved_withdrawal_balance: Math.max(0, reservedBalance - amount),
        updated_at: now,
      })
      .eq("id", withdrawalRequest.user_id);

    if (updateProfileResponse.error) {
      throw updateProfileResponse.error;
    }
  } else {
    const releaseResponse = await adminClient
      .from("profiles")
      .select("reserved_withdrawal_balance")
      .eq("id", withdrawalRequest.user_id)
      .maybeSingle();

    if (releaseResponse.error) {
      throw releaseResponse.error;
    }

    const reservedBalance = Number(releaseResponse.data?.reserved_withdrawal_balance ?? 0);
    const amount = Number(withdrawalRequest.amount ?? 0);
    const updateProfileResponse = await adminClient
      .from("profiles")
      .update({
        reserved_withdrawal_balance: Math.max(0, reservedBalance - amount),
        updated_at: now,
      })
      .eq("id", withdrawalRequest.user_id);

    if (updateProfileResponse.error) {
      throw updateProfileResponse.error;
    }
  }

  const updateResponse = await adminClient
    .from("withdrawal_requests")
    .update(updatePayload)
    .eq("id", requestId)
    .eq("status", "approved")
    .select("id, status, amount, method")
    .maybeSingle();

  if (updateResponse.error) {
    throw updateResponse.error;
  }

  if (!updateResponse.data) {
    throw new Error("Withdrawal request was updated by another session. Refresh and try again.");
  }

  const amountLabel = Number(withdrawalRequest.amount ?? 0).toFixed(2);

  await adminClient.rpc("create_notification_internal", {
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
    request_id: withdrawalRequest.id,
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
    const authHeader = getHeaderValue(request.headers, "authorization");
    const accessToken = parseBearerToken(authHeader);

    if (!accessToken) {
      sendJson(response, 401, { error: "Missing Bearer token." });
      return;
    }

    if (!requestId || !isSupportedStatus(status)) {
      sendJson(response, 400, { error: "requestId and a valid status are required." });
      return;
    }

    const adminUserId = await requireFinanceUser(accessToken);
    const userClient = getSupabaseUserClient(accessToken);

    if (status === "approved" || status === "rejected") {
      const reviewResponse = await userClient.rpc("admin_review_mobile_money_withdrawal", {
        p_admin_note: adminNote,
        p_request_id: requestId,
        p_status: status,
      });

      if (reviewResponse.error) {
        throw reviewResponse.error;
      }
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
