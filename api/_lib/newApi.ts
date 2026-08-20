import type { IncomingMessage, ServerResponse } from "node:http";
import { v2 as cloudinary } from "cloudinary";
import { transaction, query, queryOne } from "./db.js";
import {
  clerkUserIdToUuid,
  authenticateRequest,
  authenticateWithUid,
} from "./clerkWebhook.js";
import {
  DEFAULT_PLATFORM_SETTINGS,
  normalizePlatformSettings,
} from "../../src/lib/platformMetadataShared.js";
import { pusherServer } from "../../src/lib/pusherServer.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = ServerResponse<IncomingMessage>;
type Row = Record<string, unknown>;

const isMissingProfileColumnError = (error: unknown, column: string) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("does not exist") && message.includes(column);
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const sendJson = (response: ApiResponse, statusCode: number, payload: Record<string, unknown>) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

const readRawBody = async (request: ApiRequest): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
};

const firstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/* ------------------------------------------------------------------ */
/* Platform settings                                                   */
/* ------------------------------------------------------------------ */
export async function handlePlatformSettings(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }
  try {
    const row = await queryOne("select * from public.platform_settings order by created_at asc limit 1");
    const settings = row ? normalizePlatformSettings(row) : DEFAULT_PLATFORM_SETTINGS;
    sendJson(response, 200, { data: settings });
  } catch (error) {
    console.error("Platform settings fetch failed. Falling back to defaults.", error);
    sendJson(response, 200, { data: DEFAULT_PLATFORM_SETTINGS });
  }
}

/* ------------------------------------------------------------------ */
/* Profile (GET/POST/PATCH, Clerk-authenticated)                        */
/* ------------------------------------------------------------------ */
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
  "preferred_currency",
]);

const fetchProfile = async (clerkUserId: string): Promise<Row | null> => {
  const id = clerkUserIdToUuid(clerkUserId);
  const r = await transaction(async (client) => {
    return client.query(
      `select p.*, u.email
         from public.profiles p
         left join public.users u on u.id = p.id
        where p.id = $1`,
      [id],
    );
  });
  return r.rows.length > 0 ? (r.rows[0] as Row) : null;
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

export async function handleProfile(request: ApiRequest, response: ApiResponse): Promise<void> {
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
      // Identity is derived from the verified token (authenticateRequest returns
      // the canonical public.users UUID), never from the client-supplied body.id.
      // This keeps new Appwrite users and email-adopted legacy users consistent.
      const id = clerkUserIdToUuid(clerkUserId);
      const email = typeof body.email === "string" ? body.email : null;
      await ensureUserRow(id, email);

      const displayName = typeof body.display_name === "string" && body.display_name.trim()
        ? body.display_name.trim()
        : null;
      const username = typeof body.username === "string" && body.username.trim()
        ? body.username.trim()
        : null;
      const preferredCurrency = typeof body.preferred_currency === "string" && /^[A-Z]{3}$/.test(body.preferred_currency)
        ? body.preferred_currency
        : null;

      const insertProfile = async (withCurrency: boolean) => {
        if (withCurrency && preferredCurrency) {
          try {
            const rows = await query(
              `insert into public.profiles (id, username, display_name, avatar_url, preferred_currency)
               values ($1, $2, $3, $4, $5)
               on conflict (id) do nothing
               returning *`,
              [id, username, displayName, null, preferredCurrency],
            );
            if (rows.length > 0) return rows[0] as Row;
          } catch (error) {
            if (!isMissingProfileColumnError(error, "preferred_currency")) throw error;
          }
        }
        const rows = await query(
          `insert into public.profiles (id, username, display_name, avatar_url)
           values ($1, $2, $3, $4)
           on conflict (id) do nothing
           returning *`,
          [id, username, displayName, null],
        );
        return rows.length > 0 ? (rows[0] as Row) : null;
      };

      const profile = await insertProfile(Boolean(preferredCurrency));

      sendJson(response, 200, { data: profile ?? (await fetchProfile(clerkUserId)) });
      return;
    }

    if (method === "PATCH") {
      const id = clerkUserIdToUuid(clerkUserId);
      const updates: Record<string, unknown> = {};
      for (const key of Object.keys(body)) {
        if (PATCH_ALLOWED.has(key)) updates[key] = body[key] === undefined ? null : body[key];
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

    if (method === "DELETE") {
      const id = clerkUserIdToUuid(clerkUserId);
      await transaction(async (client) => {
        await client.query("delete from public.profiles where id = $1", [id]);
        await client.query("delete from public.users where id = $1", [id]);
      });
      sendJson(response, 200, { data: { deleted: true } });
      return;
    }

    response.setHeader("Allow", "GET, POST, PATCH, DELETE");
    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("Profile endpoint failed", error);
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Failed to process request" });
  }
}

/* ------------------------------------------------------------------ */
/* Cloudinary: upload / delete / public-url                             */
/* ------------------------------------------------------------------ */
function parseMultipart(buffer: Buffer, boundary: string): Array<{ name: string; filename?: string; data: Buffer; value?: string }> {
  const parts: Array<{ name: string; filename?: string; data: Buffer; value?: string }> = [];
  const boundaryBuffer = Buffer.from(`\r\n--${boundary}\r\n`);
  const endBoundaryBuffer = Buffer.from(`\r\n--${boundary}--\r\n`);

  let start = 0;
  while (true) {
    const partStart = buffer.indexOf(boundaryBuffer, start);
    if (partStart === -1) break;

    let partEnd = buffer.indexOf(boundaryBuffer, partStart + boundaryBuffer.length);
    if (partEnd === -1) {
      const endPos = buffer.indexOf(endBoundaryBuffer, partStart + boundaryBuffer.length);
      if (endPos === -1) break;
      partEnd = endPos;
    }

    const partData = buffer.slice(partStart + boundaryBuffer.length, partEnd);
    const headerEnd = partData.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headers = partData.slice(0, headerEnd).toString();
    const body = partData.slice(headerEnd + 4);

    const contentDisposition = headers.match(/name="([^"]+)"/)?.[1];
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const filename = filenameMatch?.[1];

    if (contentDisposition) {
      parts.push({ name: contentDisposition, filename, data: body, value: filename ? undefined : body.toString() });
    }

    start = partEnd + boundaryBuffer.length;
  }

  return parts;
}

type UploadResponse = {
  public_id?: string;
  secure_url?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  [key: string]: unknown;
};

async function uploadToCloudinary(
  buffer: Buffer,
  options: { folder: string; public_id?: string; resource_type?: "auto" | "image" | "video" | "raw" }
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: options.folder, public_id: options.public_id, resource_type: options.resource_type },
      (error, result) => {
        if (error) reject(error);
        else resolve((result as UploadResponse | null) ?? {});
      }
    );
    uploadStream.end(buffer);
  });
}

export async function handleCloudinaryUpload(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const contentType = request.headers["content-type"] ?? "";
  if (!contentType.includes("multipart/form-data")) {
    sendJson(response, 400, { error: "Content-Type must be multipart/form-data" });
    return;
  }

  const boundary = contentType.split("boundary=")[1];
  if (!boundary) {
    sendJson(response, 400, { error: "Missing boundary in multipart request" });
    return;
  }

  try {
    const rawBodyBuffer = Buffer.from(await readRawBody(request));
    const parts = parseMultipart(rawBodyBuffer, boundary);
    const filePart = parts.find((p) => p.name === "file");
    const folderPart = parts.find((p) => p.name === "folder");
    const publicIdPart = parts.find((p) => p.name === "public_id");

    if (!filePart) {
      sendJson(response, 400, { error: "No file provided" });
      return;
    }

    const folder = folderPart?.value as string | undefined;
    const uploadResult = await uploadToCloudinary(filePart.data, {
      folder: folder || undefined,
      public_id: publicIdPart ? (publicIdPart.value as string) : (filePart.filename ? filePart.filename.replace(/\.[^/.]+$/, "") : undefined),
      resource_type: "auto",
    });

    sendJson(response, 200, {
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      bytes: uploadResult.bytes,
    });
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Upload failed" });
  }
}

export async function handleCloudinaryDelete(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== "DELETE") {
    response.setHeader("Allow", "DELETE");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }
  try {
    const rawBody = await readRawBody(request);
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const publicId = body.public_id;
    if (!publicId || Array.isArray(publicId)) {
      sendJson(response, 400, { error: "Missing or invalid public_id" });
      return;
    }
    const folder = body.folder;
    const targetId = folder ? `${String(folder)}/${publicId}` : String(publicId);
    const result = await cloudinary.uploader.destroy(targetId);
    sendJson(response, 200, { result });
  } catch (error) {
    console.error("Cloudinary delete failed:", error);
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Delete failed" });
  }
}

export async function handleCloudinaryPublicUrl(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }
  const publicId = request.query?.public_id;
  const folder = firstValue(request.query?.folder);
  if (!publicId || Array.isArray(publicId)) {
    sendJson(response, 400, { error: "Missing or invalid public_id parameter" });
    return;
  }
  try {
    const url = cloudinary.url(publicId as string, { secure: true, folder: folder ?? undefined });
    sendJson(response, 200, { url });
  } catch (error) {
    console.error("Cloudinary URL generation failed:", error);
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Failed to generate URL" });
  }
}

export async function handleCloudinaryExists(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }
  const publicId = request.query?.public_id;
  const folder = request.query?.folder;
  if (!publicId || Array.isArray(publicId)) {
    sendJson(response, 400, { error: "Missing or invalid public_id parameter" });
    return;
  }
  try {
    const id = Array.isArray(folder) && folder[0] ? `${folder[0]}/${publicId}` : publicId;
    cloudinary.api.resource(id, { resource_type: "image" }, (error, result) => {
      if (error || !result) {
        sendJson(response, 200, { exists: false });
        return;
      }
      sendJson(response, 200, { exists: true, public_id: result.public_id, url: result.secure_url });
    });
    return;
  } catch (error) {
    const status = error?.http_code ?? error?.code;
    if (status === 404 || /not found/i.test(error?.message ?? "")) {
      sendJson(response, 200, { exists: false });
      return;
    }
    console.error("Cloudinary exists check failed:", error);
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Failed to check resource" });
  }
}

/* ------------------------------------------------------------------ */
/* Pusher auth                                                          */
/* ------------------------------------------------------------------ */
export async function handlePusherAuth(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }
  try {
    const required = ["socket_id", "channel_name"];
    let [socketId, channelName] = required.map((name) => firstValue(request.query?.[name]) ?? "");
    if (!socketId || !channelName) {
      const rawBody = await readRawBody(request);
      let body: Record<string, unknown> = {};
      if (rawBody) {
        try {
          body = JSON.parse(rawBody) as Record<string, unknown>;
          socketId = typeof body.socket_id === "string" ? body.socket_id : socketId;
          channelName = typeof body.channel_name === "string" ? body.channel_name : channelName;
        } catch {
          // ignore
        }
      }
    }

    if (!socketId || !channelName) {
      sendJson(response, 400, { error: "Missing socket_id or channel_name" });
      return;
    }

    const auth = pusherServer.authenticate(socketId, channelName);
    sendJson(response, 200, auth as unknown as Record<string, unknown>);
  } catch (error) {
    console.error("Pusher auth failed:", error);
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Auth failed" });
  }
}

/* ------------------------------------------------------------------ */
/* Db (generic table CRUD against Neon)                                */
/* ------------------------------------------------------------------ */
const ALLOWED_TABLES = new Set([
  "admin_balance_log", "announcements", "assets_config", "bonus_settings", "chat_messages", "copy_settings",
  "crypto_deposit_address_pool", "crypto_deposit_events", "crypto_deposit_instructions",
  "crypto_payment_methods", "customer_reviews", "deposit_bonus_offers",
  "deposit_bonus_redemptions", "deposit_requests", "email_verification_codes", "follows",
  "notification_email_deliveries", "notifications", "platform_settings", "profiles",
  "promo_codes", "promo_materials", "referral_commissions", "social_feed", "support_messages",
  "support_threads", "support_tickets", "tournament_participants", "tournament_payouts",
  "tournaments", "trade_balance_audit_logs", "trades", "user_roles", "withdrawal_requests",
]);

const IS_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const OPERATORS = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "contains"]);

const NUMERIC_TYPES = new Set([20, 21, 23, 700, 701, 790, 1700]);
const isNumericTypeId = (id: number | undefined): boolean =>
  typeof id === "number" && NUMERIC_TYPES.has(id);

interface FilterClause {
  c?: string;
  o?: string;
  v?: unknown;
  items?: FilterClause[];
}

interface PgResult {
  rows: Row[];
  fields?: Array<{ name: string; dataTypeID?: number }>;
}

type PgClientLike = {
  query: (sql: string, params?: unknown[]) => Promise<PgResult>;
};

const normalizeRows = (result: PgResult): Row[] => {
  if (!result.fields || result.fields.length === 0) return result.rows;
  const numericCols = result.fields.filter((f) => isNumericTypeId(f.dataTypeID)).map((f) => f.name);
  if (numericCols.length === 0) return result.rows;
  return result.rows.map((row) => {
    const normalized: Row = { ...row };
    for (const col of numericCols) {
      const value = normalized[col];
      if (value !== null && value !== undefined) {
        const number = Number(value);
        if (Number.isFinite(number)) normalized[col] = number;
      }
    }
    return normalized;
  });
};

const runScoped = async (mappedId: string, fn: (client: PgClientLike) => Promise<PgResult>) =>
  transaction(async (client) => {
    await client.query("SET LOCAL ROLE authenticated");
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [mappedId]);
    const result = await fn(client);
    return { rows: normalizeRows(result) };
  });

const getDbPath = (request: ApiRequest) => {
  const fromQuery = firstValue(request.query?.__dbpath) ?? "";
  return fromQuery || (request.url || "").replace(/^\/api\/db\/?/, "");
};

const parseColumns = (raw: string | undefined): string[] | null => {
  if (!raw || raw.trim().length === 0) return null;
  const cols = raw.split(",").map((c) => c.trim()).filter(Boolean);
  return cols.every((c) => c === "*" || IS_IDENTIFIER.test(c)) ? cols : null;
};

const buildWhere = (clauses: FilterClause[], params: unknown[]): string => {
  const parts = clauses.map((clause) => {
    if (clause.o === "or" && Array.isArray(clause.items) && clause.items.length > 0) {
      const orParams: unknown[] = [];
      const orSql = buildWhere(clause.items, orParams);
      params.push(...orParams);
      return `(${orSql})`;
    }

    const col = clause.c ?? "";
    const op = clause.o ?? "eq";
    if (!IS_IDENTIFIER.test(col) || !OPERATORS.has(op)) throw new Error("Invalid filter clause");

    const val = clause.v;
    const index = params.length + 1;

    switch (op) {
      case "eq": params.push(val); return `"${col}" = $${index}`;
      case "neq": params.push(val); return `"${col}" <> $${index}`;
      case "gt": params.push(val); return `"${col}" > $${index}`;
      case "gte": params.push(val); return `"${col}" >= $${index}`;
      case "lt": params.push(val); return `"${col}" < $${index}`;
      case "lte": params.push(val); return `"${col}" <= $${index}`;
      case "in": {
        const values = Array.isArray(val) ? val : [];
        params.push(values);
        return `"${col}"::text = any($${index}::text[])`;
      }
      case "is":
        if (val === null) return `"${col}" is null`;
        params.push(val);
        return `"${col}" is not distinct from $${index}`;
      case "contains":
        params.push(JSON.stringify(val));
        return `"${col}" @> $${index}::jsonb`;
      default:
        throw new Error("Invalid filter operator");
    }
  });
  return parts.join(" and ");
};

const parseOrders = (raw: string | undefined): string[] | null => {
  if (!raw || raw.trim().length === 0) return null;
  const orders: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [col, direction] = trimmed.split(":");
    if (!col || !IS_IDENTIFIER.test(col)) return null;
    const dir = direction === "desc" ? "desc" : "asc";
    orders.push(`"${col}" ${dir}`);
  }
  return orders.length > 0 ? orders : null;
};

const parseFilterClauses = (raw: string | undefined): FilterClause[] | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as FilterClause[]) : null;
  } catch {
    return null;
  }
};

const isClerkId = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("user_");

const remapClerkIds = (
  value: unknown,
  mappedId: string,
  uid?: string | null,
  canonicalUuid?: string | null,
): unknown => {
  if (isClerkId(value)) return mappedId;
  // Remap the authenticated caller's own id to its canonical uuid so filters and
  // values against uuid columns (user_id, id, ...) don't 400. The raw Appwrite uid
  // (e.g. "6a7e8ed439b52c2e7d46") never matches the canonical uuid returned by
  // authenticateRequest, so both spellings must be handled.
  if (typeof value === "string" && uid && value === uid) return mappedId;
  if (typeof value === "string" && canonicalUuid && value === canonicalUuid) return mappedId;
  if (Array.isArray(value)) return value.map((entry) => remapClerkIds(entry, mappedId, uid, canonicalUuid));
  return value;
};

const remapClauses = (
  clauses: FilterClause[],
  mappedId: string,
  uid?: string | null,
  canonicalUuid?: string | null,
): FilterClause[] =>
  clauses.map((clause) => {
    if (clause.o === "or" && Array.isArray(clause.items)) {
      return { ...clause, items: remapClauses(clause.items, mappedId, uid, canonicalUuid) };
    }
    return { ...clause, v: remapClerkIds(clause.v, mappedId, uid, canonicalUuid) };
  });

export async function handleDb(request: ApiRequest, response: ApiResponse): Promise<void> {
  const method = request.method || "GET";
  try {
    const auth = await authenticateWithUid(request.headers);
    if (!auth) {
      sendJson(response, 401, { error: "Unauthorized" });
      return;
    }
    const clerkUserId = auth.uuid;
    const appwriteUid = auth.uid;
    const mappedId = clerkUserIdToUuid(clerkUserId);

    const segments = getDbPath(request).split("/").filter(Boolean);
    const table = segments[0] ?? "";
    if (!ALLOWED_TABLES.has(table)) {
      sendJson(response, 400, { error: "Table not allowed" });
      return;
    }
    const idSegment = segments[1] ?? undefined;
    const params: unknown[] = [];

    if (method === "GET") {
      const columns = parseColumns(firstValue(request.query?.select) || "*");
      if (!columns) {
        sendJson(response, 400, { error: "Invalid select columns" });
        return;
      }

      if (idSegment) {
        const { rows } = await runScoped(mappedId, (client) =>
          client.query(`select ${columns.join(", ")} from public.${table} where "id" = $1`, [
            remapClerkIds(idSegment, mappedId, appwriteUid, clerkUserId),
          ]),
        );
        sendJson(response, 200, { data: rows[0] ?? null });
        return;
      }

      const clauses = remapClauses(parseFilterClauses(firstValue(request.query?.filters)) ?? [], mappedId, appwriteUid, clerkUserId);

      if (firstValue(request.query?.count) === "true") {
        const countParams: unknown[] = [];
        let sql = `select count(*) as count from public.${table}`;
        const whereSql = buildWhere(clauses, countParams);
        if (whereSql) sql += ` where ${whereSql}`;
        const { rows } = await runScoped(mappedId, (client) => client.query(sql, countParams));
        const count = rows[0]?.count;
        sendJson(response, 200, { data: [], count: typeof count === "number" ? count : Number(count ?? 0) });
        return;
      }

      const orders = parseOrders(firstValue(request.query?.order));
      const limitRaw = parseInt(firstValue(request.query?.limit) ?? "1000", 10);
      const offsetRaw = parseInt(firstValue(request.query?.offset) ?? "0", 10);
      const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 1000) : 1000;
      const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;

      let sql = `select ${columns.join(", ")} from public.${table}`;
      const whereSql = buildWhere(clauses, params);
      if (whereSql) sql += ` where ${whereSql}`;
      if (orders) sql += ` order by ${orders.join(", ")}`;
      sql += ` limit ${limit} offset ${offset}`;

      const { rows } = await runScoped(mappedId, (client) => client.query(sql, params));
      sendJson(response, 200, { data: rows });
      return;
    }

    const rawBody = await readRawBody(request);
    let body: { values?: Row; match?: Row; filters?: FilterClause[] } = {};
    if (rawBody) {
      try {
        body = JSON.parse(rawBody) as typeof body;
      } catch {
        sendJson(response, 400, { error: "Invalid JSON body" });
        return;
      }
    }

    const filterClauses = body.filters ?? [];
    const matchEntries = Object.entries(body.match ?? {});
    if (matchEntries.length > 0) filterClauses.push(...matchEntries.map(([c, v]) => ({ c, o: "eq", v })));

    if (method === "DELETE") {
      const whereClauses = remapClauses(filterClauses, mappedId, appwriteUid, clerkUserId);
      if (whereClauses.length === 0) {
        sendJson(response, 400, { error: "A match filter is required to delete" });
        return;
      }
      const delParams: unknown[] = [];
      const whereSql = buildWhere(whereClauses, delParams);
      const { rows } = await runScoped(mappedId, (client) =>
        client.query(`delete from public.${table} where ${whereSql} returning *`, delParams),
      );
      sendJson(response, 200, { data: rows });
      return;
    }

    if (method === "POST") {
      const entries = Object.entries(body.values ?? {}).map(([k, v]) => [k, remapClerkIds(v, mappedId, appwriteUid, clerkUserId)] as const);
      if (!entries.every(([k]) => IS_IDENTIFIER.test(k))) {
        sendJson(response, 400, { error: "Invalid column name" });
        return;
      }
      const cols = entries.map(([k]) => `"${k}"`);
      const placeholders = entries.map((_, i) => `$${i + 1}`).join(", ");
      const { rows } = await runScoped(mappedId, (client) =>
        client.query(
          `insert into public.${table} (${cols.join(", ")}) values (${placeholders}) returning *`,
          entries.map(([, v]) => v),
        ),
      );
      sendJson(response, 200, { data: rows });
      return;
    }

    if (method === "PATCH") {
      const entries = Object.entries(body.values ?? {}).map(([k, v]) => [k, remapClerkIds(v, mappedId, appwriteUid, clerkUserId)] as const);
      if (!entries.every(([k]) => IS_IDENTIFIER.test(k))) {
        sendJson(response, 400, { error: "Invalid column name" });
        return;
      }
      const betweenClauses = remapClauses(filterClauses, mappedId, appwriteUid, clerkUserId);
      const patchParams: unknown[] = [];
      const whereSql = buildWhere(betweenClauses, patchParams);
      const setClause = entries.map(([k], i) => `"${k}" = $${patchParams.length + i + 1}`).join(", ");
      const setParams = entries.map(([, v]) => v);
      const { rows } = await runScoped(mappedId, (client) =>
        client.query(
          `update public.${table} set ${setClause} ${whereSql ? `where ${whereSql}` : ""} returning *`,
          [...setParams, ...patchParams],
        ),
      );
      sendJson(response, 200, { data: rows });
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error("db route failed", error);
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Failed to process request" });
  }
}

/* ------------------------------------------------------------------ */
/* RPC                                                                  */
/* ------------------------------------------------------------------ */
const IS_VALID_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const extractFunctionName = (request: ApiRequest): string | null => {
  const fromQuery = request.query?.fn ?? request.query?.name;
  const qName = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
  if (typeof qName === "string" && qName.trim().length > 0) return qName.trim();

  const pathname = (request.url || "").split("?")[0];
  const prefixes = ["/api/rpc/", "/rpc/"];
  for (const prefix of prefixes) {
    if (pathname.startsWith(prefix)) {
      const first = pathname.slice(prefix.length).split("/")[0];
      if (first) return first;
    }
  }
  return null;
};

const normalizeRpcResult = (rows: Array<Record<string, unknown>>): unknown => {
  if (rows.length === 0) return null;
  if (rows.length === 1) {
    const record = rows[0];
    const keys = Object.keys(record);
    return keys.length === 1 ? record[keys[0]] : record;
  }
  return rows;
};

export async function handleRpc(request: ApiRequest, response: ApiResponse): Promise<void> {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }
  try {
    const functionName = extractFunctionName(request);
    if (!functionName || !IS_VALID_IDENTIFIER.test(functionName)) {
      sendJson(response, 400, { error: "Invalid RPC function name" });
      return;
    }

    const clerkUserId = await authenticateRequest(request.headers);
    if (!clerkUserId) {
      sendJson(response, 401, { error: "Unauthorized" });
      return;
    }

    const rawBody = await readRawBody(request);
    let args: Record<string, unknown> = {};
    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          args = parsed as Record<string, unknown>;
        }
      } catch {
        // No JSON body; treat as no arguments.
      }
    }

    const mappedId = clerkUserIdToUuid(clerkUserId);
    const keys = Object.keys(args);

    const result = await transaction(async (client) => {
      await client.query("SELECT set_config('app.current_user_id', $1, true)", [mappedId]);

      let sql: string;
      const values: unknown[] = [];
      if (keys.length === 0) {
        sql = `SELECT * FROM ${functionName}()`;
      } else {
        const assignments = keys.map((key, index) => `${key} := $${index + 1}`).join(", ");
        values.push(...keys.map((key) => args[key]));
        sql = `SELECT * FROM ${functionName}(${assignments})`;
      }
      return client.query(sql, values);
    });

    sendJson(response, 200, { data: normalizeRpcResult(result.rows) });
  } catch (error) {
    console.error("RPC failed", error);
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Failed to execute function" });
  }
}
