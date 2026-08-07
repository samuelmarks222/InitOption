import type { IncomingMessage, ServerResponse } from "node:http";
import { query, queryOne, withUser } from "./_lib/db.js";
import { clerkUserIdToUuid, authenticateRequest } from "./_lib/clerkWebhook.js";

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

const PATCH_ALLOWED = new Set([
  "avatar_url",
  "username",
  "kyc_status",
  "kyc_documents",
  "nationality",
  "phone_country",
  "phone_country_code",
  "balance",
  "welcome_bonus_granted_at",
]);

const fetchProfile = async (clerkUserId: string) => {
  const id = clerkUserIdToUuid(clerkUserId);

  const row = await withUser(id, (client) =>
    client
      .query(
        `select p.*, u.email
           from public.profiles p
           left join public.users u on u.id = p.id
          where p.id = $1`,
        [id],
      )
      .then((r) => (r.rows.length > 0 ? r.rows[0] : null)),
  );

  return row;
};

const ensureUserRow = async (id: string, email: string | null) => {
  await query(
    `insert into public.users (id, email)
     values ($1, $2)
     on conflict (id) do update set
       email = coalesce(excluded.email, public.users.email),
       updated_at = now()`,
    [id, email],
  );
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const method = request.method || "GET";

  try {
    const clerkUserId = await authenticateRequest(request.headers);
    if (!clerkUserId) {
      sendJson(response, 401, { error: "Unauthorized" });
      return;
    }

    if (method === "GET") {
      const profile = await fetchProfile(clerkUserId);
      if (!profile) {
        sendJson(response, 404, { error: "Profile not found" });
        return;
      }
      sendJson(response, 200, { data: profile });
      return;
    }

    const rawBody = await readRawBody(request);
    let body: Record<string, unknown> = {};
    if (rawBody) {
      try {
        body = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        sendJson(response, 400, { error: "Invalid JSON body" });
        return;
      }
    }

    if (method === "POST") {
      const requestedId = typeof body.id === "string" ? body.id : clerkUserId;
      if (requestedId !== clerkUserId) {
        sendJson(response, 403, { error: "Forbidden" });
        return;
      }

      const id = clerkUserIdToUuid(clerkUserId);
      const email = typeof body.email === "string" ? body.email : null;

      await ensureUserRow(id, email);

      const displayName = typeof body.display_name === "string" && body.display_name.trim()
        ? body.display_name.trim()
        : null;
      const username = typeof body.username === "string" && body.username.trim()
        ? body.username.trim()
        : null;

      const profile = await withUser(id, (client) =>
        client
          .query(
            `insert into public.profiles (id, username, display_name, avatar_url)
             values ($1, $2, $3, $4)
             on conflict (id) do nothing
             returning *`,
            [id, username, displayName, null],
          )
          .then((r) => (r.rows.length > 0 ? r.rows[0] : null)),
      );

      sendJson(response, 200, {
        data: profile ?? (await fetchProfile(clerkUserId)),
      });
      return;
    }

    if (method === "PATCH") {
      const id = clerkUserIdToUuid(clerkUserId);

      const updates: Record<string, unknown> = {};
      for (const key of Object.keys(body)) {
        if (PATCH_ALLOWED.has(key)) {
          updates[key] = body[key] === undefined ? null : body[key];
        }
      }

      if (Object.keys(updates).length === 0) {
        const current = await fetchProfile(clerkUserId);
        sendJson(response, 200, { data: current });
        return;
      }

      await queryOne(
        `update public.profiles
            set ${Object.keys(updates)
              .map((key, index) => `${key} = $${index + 1}`)
              .join(", ")}
          where id = $${Object.keys(updates).length + 1}`,
        [...Object.values(updates), id],
      );

      const profile = await fetchProfile(clerkUserId);
      if (!profile) {
        sendJson(response, 404, { error: "Profile not found" });
        return;
      }
      sendJson(response, 200, { data: profile });
      return;
    }

    response.setHeader("Allow", "GET, POST, PATCH");
    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Profile endpoint failed", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Failed to process request",
    });
  }
}