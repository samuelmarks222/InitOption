import type { IncomingMessage, ServerResponse } from "node:http";
import { transaction } from "./_lib/db.js";
import { clerkUserIdToUuid, authenticateRequest } from "./_lib/clerkWebhook.js";

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = ServerResponse<IncomingMessage>;
type Row = Record<string, unknown>;

interface FilterClause {
  c?: string;
  o?: string;
  v?: unknown;
  items?: FilterClause[];
}

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

const IS_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const OPERATORS = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "contains"]);

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

const firstOf = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// Postgres type OIDs whose values are returned as strings by node-postgres but
// as JSON numbers by Supabase's PostgREST. Convert them for parity.
const NUMERIC_TYPES = new Set([20, 21, 23, 700, 701, 790, 1700]);
const isNumericTypeId = (id: number | undefined): boolean =>
  typeof id === "number" && NUMERIC_TYPES.has(id);

const normalizeRows = (
  result: { rows: Row[]; fields?: Array<{ name: string; dataTypeID?: number }> },
): Row[] => {
  if (!result.fields || result.fields.length === 0) return result.rows;
  const numericCols = result.fields
    .filter((field) => isNumericTypeId(field.dataTypeID))
    .map((field) => field.name);
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

const getPathAndQuery = (request: ApiRequest) => {
  const pathname = (request.url || "").split("?")[0];
  const fromQueryBuilt = firstOf(request.query?.__dbpath) ?? "";
  return fromQueryBuilt || pathname.replace(/^\/api\/db\/?/, "");
};

const parseColumns = (raw: string | undefined): string[] | null => {
  if (!raw || raw.trim().length === 0) return null;
  const cols = raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  return cols.every((c) => c === "*" || IS_IDENTIFIER.test(c)) ? cols : null;
};

// Builds a parameterized WHERE clause from supabase-style filter clauses.
// FilterClause: { c, o, v } (AND) or { o: "or", items: FilterClause[] }.
const buildWhere = (
  clauses: FilterClause[],
  params: unknown[],
): string => {
  const parts = clauses.map((clause) => {
    if (clause.o === "or" && Array.isArray(clause.items) && clause.items.length > 0) {
      const orParams: unknown[] = [];
      const orSql = buildWhere(clause.items, orParams);
      params.push(...orParams);
      return `(${orSql})`;
    }

    const col = clause.c ?? "";
    const op = clause.o ?? "eq";
    if (!IS_IDENTIFIER.test(col) || !OPERATORS.has(op)) {
      throw new Error("Invalid filter clause");
    }

    const val = clause.v;
    const index = params.length + 1;

    switch (op) {
      case "eq":
        params.push(val);
        return `"${col}" = $${index}`;
      case "neq":
        params.push(val);
        return `"${col}" <> $${index}`;
      case "gt":
        params.push(val);
        return `"${col}" > $${index}`;
      case "gte":
        params.push(val);
        return `"${col}" >= $${index}`;
      case "lt":
        params.push(val);
        return `"${col}" < $${index}`;
      case "lte":
        params.push(val);
        return `"${col}" <= $${index}`;
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

interface PgResult {
  rows: Row[];
  fields?: Array<{ name: string; dataTypeID?: number }>;
}

type PgClientLike = {
  query: (sql: string, params?: unknown[]) => Promise<PgResult>;
};

// Runs a query as the 'authenticated' role with the caller's app.current_user_id
// set, so the existing RLS policies scope rows per user (mirrors Supabase).
const runScoped = async (mappedId: string, fn: (client: PgClientLike) => Promise<PgResult>) =>
  transaction(async (client) => {
    await client.query("SET LOCAL ROLE authenticated");
    await client.query("SET LOCAL app.current_user_id = $1", [mappedId]);
    const result = await fn(client);
    return { rows: normalizeRows(result) };
  });

const parseFilterClauses = (raw: string | undefined): FilterClause[] | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as FilterClause[];
  } catch {
    return null;
  }
};

// Client code passes the Clerk user id (e.g. "user_2abc") as the value for
// user-identity columns, but the DB stores the mapped UUID. Rewrite any
// Clerk-shaped value to the authenticated user's mapped UUID before querying.
const isClerkId = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("user_");

const remapClerkIds = (value: unknown, mappedId: string): unknown => {
  if (isClerkId(value)) return mappedId;
  if (Array.isArray(value)) return value.map((entry) => remapClerkIds(entry, mappedId));
  return value;
};

const remapClauses = (clauses: FilterClause[], mappedId: string): FilterClause[] =>
  clauses.map((clause) => {
    if (clause.o === "or" && Array.isArray(clause.items)) {
      return { ...clause, items: remapClauses(clause.items, mappedId) };
    }
    return { ...clause, v: remapClerkIds(clause.v, mappedId) };
  });

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const method = request.method || "GET";

  try {
    const clerkUserId = await authenticateRequest(request.headers);
    if (!clerkUserId) {
      sendJson(response, 401, { error: "Unauthorized" });
      return;
    }
    const mappedId = clerkUserIdToUuid(clerkUserId);

    const segments = getPathAndQuery(request)
      .split("/")
      .filter(Boolean);
    const table = segments[0] ?? "";
    if (!ALLOWED_TABLES.has(table)) {
      sendJson(response, 400, { error: "Table not allowed" });
      return;
    }
    const idSegment = segments[1] ?? undefined;

    const params: unknown[] = [];

    if (method === "GET") {
      const columns = parseColumns(firstOf(request.query?.select) || "*");
      if (!columns) {
        sendJson(response, 400, { error: "Invalid select columns" });
        return;
      }

      if (idSegment) {
        const { rows } = await runScoped(mappedId, (client) =>
          client.query(`select ${columns.join(", ")} from public.${table} where "id" = $1`, [
            remapClerkIds(idSegment, mappedId),
          ]),
        );
        sendJson(response, 200, { data: rows[0] ?? null });
        return;
      }

      const clauses = remapClauses(parseFilterClauses(firstOf(request.query?.filters)) ?? [], mappedId);

      if (firstOf(request.query?.count) === "true") {
        const countParams: unknown[] = [];
        let sql = `select count(*) as count from public.${table}`;
        const whereSql = buildWhere(clauses, countParams);
        if (whereSql) sql += ` where ${whereSql}`;
        const { rows } = await runScoped(mappedId, (client) => client.query(sql, countParams));
        const count = rows[0]?.count;
        sendJson(response, 200, { data: [], count: typeof count === "number" ? count : Number(count ?? 0) });
        return;
      }

      const orders = parseOrders(firstOf(request.query?.order));
      const limitRaw = parseInt(firstOf(request.query?.limit) ?? "1000", 10);
      const offsetRaw = parseInt(firstOf(request.query?.offset) ?? "0", 10);
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
    if (matchEntries.length > 0) {
      filterClauses.push(...matchEntries.map(([c, v]) => ({ c, o: "eq", v })));
    }

    if (method === "DELETE") {
      const whereClauses = remapClauses(filterClauses, mappedId);
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
      const entries = Object.entries(body.values ?? {}).map(([k, v]) => [k, remapClerkIds(v, mappedId)] as const);
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
      const entries = Object.entries(body.values ?? {}).map(([k, v]) => [k, remapClerkIds(v, mappedId)] as const);
      if (!entries.every(([k]) => IS_IDENTIFIER.test(k))) {
        sendJson(response, 400, { error: "Invalid column name" });
        return;
      }
      const betweenClauses = remapClauses(filterClauses, mappedId);
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
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "Failed to process request",
    });
  }
}