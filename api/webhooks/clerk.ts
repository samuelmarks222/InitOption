import type { IncomingMessage, ServerResponse } from "node:http";
import { query } from "../_lib/db.js";
import { clerkUserIdToUuid, verifyClerkWebhook } from "../_lib/clerkWebhook.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;

const sendJson = (response: ApiResponse, statusCode: number, payload: Record<string, unknown>) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

const readRawBody = async (request: ApiRequest) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
};

const toIso = (value: unknown): string | null => {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const getPrimaryEmail = (data: Record<string, any>) => {
  const addresses = Array.isArray(data.email_addresses) ? data.email_addresses : [];
  const primary = addresses.find(
    (entry: Record<string, any>) => entry?.id === data.primary_email_address_id,
  );
  const selected = primary ?? addresses[0];
  return typeof selected?.email_address === "string" ? selected.email_address : null;
};

const hasVerifiedEmail = (data: Record<string, any>) => {
  const addresses = Array.isArray(data.email_addresses) ? data.email_addresses : [];
  return addresses.some((entry: Record<string, any>) => entry?.verification?.status === "verified");
};

const buildUserMeta = (data: Record<string, any>) => {
  const firstName = typeof data.first_name === "string" ? data.first_name.trim() : "";
  const lastName = typeof data.last_name === "string" ? data.last_name.trim() : "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

  return {
    ...(data.public_metadata && typeof data.public_metadata === "object" ? data.public_metadata : {}),
    ...(data.unsafe_metadata && typeof data.unsafe_metadata === "object" ? data.unsafe_metadata : {}),
    username: data.username ?? null,
    display_name: fullName,
    avatar_url: data.image_url ?? null,
  };
};

const upsertUser = async (data: Record<string, any>) => {
  const id = clerkUserIdToUuid(data.id);
  const email = getPrimaryEmail(data);
  const meta = buildUserMeta(data);
  const emailConfirmedAt = hasVerifiedEmail(data) ? toIso(data.created_at) ?? new Date().toISOString() : null;
  const createdAt = toIso(data.created_at) ?? new Date().toISOString();
  const updatedAt = toIso(data.updated_at) ?? new Date().toISOString();
  const lastSignInAt = toIso(data.last_sign_in_at);

  await query(
    `insert into public.users (id, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at, last_sign_in_at)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do update set
       email = excluded.email,
       raw_user_meta_data = excluded.raw_user_meta_data,
       email_confirmed_at = excluded.email_confirmed_at,
       updated_at = excluded.updated_at,
       last_sign_in_at = excluded.last_sign_in_at`,
    [
      id,
      email,
      JSON.stringify(meta),
      emailConfirmedAt,
      createdAt,
      updatedAt,
      lastSignInAt,
    ],
  );
};

const deleteUser = async (clerkUserId: string) => {
  await query("delete from public.users where id = $1", [clerkUserIdToUuid(clerkUserId)]);
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const rawBody = await readRawBody(request);
    const event = await verifyClerkWebhook({ rawBody, headers: request.headers });

    switch (event.type) {
      case "user.created":
      case "user.updated":
        await upsertUser(event.data as Record<string, any>);
        break;
      case "user.deleted":
        await deleteUser((event.data as Record<string, any>).id);
        break;
      default:
        break;
    }

    sendJson(response, 200, { ok: true, type: event.type });
  } catch (error) {
    console.error("Clerk webhook processing failed", error);
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Failed to process webhook",
    });
  }
}
