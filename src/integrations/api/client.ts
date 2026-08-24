// Client-side API wrapper that replaces api.from() calls.
// All data operations go through Vercel API routes which use the Neon pg adapter.
// Supports the supabase-js chain style used across the app:
//   const { data, error } = await api.from("trades").select("*").eq("user_id", id).order("created_at");

import { getAppwriteIdToken } from "@/integrations/appwrite/authService";
import { appwriteConfigPresent } from "@/integrations/appwrite/config";

type Row = Record<string, unknown>;

export type FilterClause =
  | { c: string; o: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "is" | "contains"; v?: unknown }
  | { c: string; o: "in"; v: unknown[] }
  | { o: "or"; items: FilterClause[] };

type ApiResult<T = Row | Row[] | null> =
  | { data: T; error: null; count?: number }
  | { data: null; error: { message: string } };

const API_BASE = "/api";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAppwriteIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const toError = (error: unknown): { message: string } => ({
  message: error instanceof Error ? error.message : String(error),
});

async function request(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; payload: unknown }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(await getAuthHeaders()),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    return { ok: false, payload: toError(error) };
  }

  const payload = await res.json().catch(() => ({}));
  return { ok: res.ok, payload };
}

class TableBuilder {
  private filters: FilterClause[] = [];
  private orderBy: string[] = [];
  private limitN?: number;
  private offsetN?: number;
  private cols = "*";
  private mode: "many" | "single" | "maybeSingle" = "many";
  private op: "read" | "insert" | "update" | "delete" = "read";
  private payload: Row = {};
  private countMode = false;

  constructor(private table: string) {}

  // Chainable modifiers (return `this`; the builder is thenable).
  select(columns = "*", options?: { count?: "exact" | "planned" | "estimated"; head?: boolean }): this {
    this.cols = columns;
    this.countMode = Boolean(options?.count);
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ c: column, o: "eq", v: value });
    return this;
  }

  neq(column: string, value: unknown): this {
    this.filters.push({ c: column, o: "neq", v: value });
    return this;
  }

  gt(column: string, value: unknown): this {
    this.filters.push({ c: column, o: "gt", v: value });
    return this;
  }

  gte(column: string, value: unknown): this {
    this.filters.push({ c: column, o: "gte", v: value });
    return this;
  }

  lt(column: string, value: unknown): this {
    this.filters.push({ c: column, o: "lt", v: value });
    return this;
  }

  lte(column: string, value: unknown): this {
    this.filters.push({ c: column, o: "lte", v: value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.filters.push({ c: column, o: "in", v: values });
    return this;
  }

  is(column: string, value: unknown): this {
    this.filters.push({ c: column, o: "is", v: value });
    return this;
  }

  contains(column: string, value: unknown): this {
    this.filters.push({ c: column, o: "contains", v: value });
    return this;
  }

  or(items: FilterClause[]): this {
    this.filters.push({ o: "or", items });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}): this {
    const ascending = options.ascending ?? true;
    this.orderBy.push(`${column}:${ascending ? "asc" : "desc"}`);
    return this;
  }

  limit(count: number): this {
    this.limitN = count;
    return this;
  }

  offset(count: number): this {
    this.offsetN = count;
    return this;
  }

  single(): this {
    this.mode = "single";
    return this;
  }

  maybeSingle(): this {
    this.mode = "maybeSingle";
    return this;
  }

  insert(values: Row): this {
    this.op = "insert";
    this.payload = values;
    return this;
  }

  update(values: Row): this {
    this.op = "update";
    this.payload = values;
    return this;
  }

  delete(): this {
    this.op = "delete";
    return this;
  }

  private async execute(): Promise<ApiResult> {
    if (this.op === "insert") {
      const { ok, payload } = await request("POST", `/db/${this.table}`, { values: this.payload });
      return this.unwrap(ok, payload, true);
    }

    if (this.op === "update") {
      const { ok, payload } = await request("PATCH", `/db/${this.table}`, {
        values: this.payload,
        filters: this.filters,
      });
      return this.unwrap(ok, payload, true);
    }

    if (this.op === "delete") {
      const { ok, payload } = await request("DELETE", `/db/${this.table}`, { filters: this.filters });
      return this.unwrap(ok, payload, true);
    }

    const query = new URLSearchParams();
    if (this.cols !== "*") query.set("select", this.cols);
    if (this.filters.length > 0) query.set("filters", JSON.stringify(this.filters));
    if (this.orderBy.length > 0) query.set("order", this.orderBy.join(","));
    if (this.limitN !== undefined) query.set("limit", String(this.limitN));
    if (this.offsetN !== undefined) query.set("offset", String(this.offsetN));
    if (this.countMode) {
      query.set("count", "true");
      query.set("head", "true");
    }
    const queryString = query.toString();

    const { ok, payload } = await request("GET", `/db/${this.table}${queryString ? `?${queryString}` : ""}`);
    return this.unwrap(ok, payload, false);
  }

  private unwrap(ok: boolean, payload: unknown, isMutation: boolean): ApiResult {
    const isObj = typeof payload === "object" && payload !== null;
    const payloadErr = isObj && "error" in payload ? (payload as { error?: unknown }).error : null;
    const isErrorPayload = Boolean(payloadErr);
    const hasDataField = isObj && "data" in payload;
    const rawData = hasDataField ? (payload as { data?: unknown }).data : payload;
    const count = isObj && "count" in payload ? (payload as { count?: unknown }).count : undefined;
    const parsedCount = count === undefined ? undefined : typeof count === "number" ? count : Number(count);

    if (!ok || isErrorPayload) {
      const message =
        typeof payloadErr === "string"
          ? payloadErr
          : typeof (payloadErr as { message?: string })?.message === "string"
            ? (payloadErr as { message: string }).message
            : "Request failed";
      return { data: null, error: { message } };
    }

    if (this.mode === "single" || this.mode === "maybeSingle") {
      const rows = Array.isArray(rawData) ? rawData : [];
      return { data: (rows[0] ?? null) as Row | null, error: null, count: parsedCount };
    }

    const rows = Array.isArray(rawData) ? rawData : [];
    return { data: rows as Row[], error: null, count: parsedCount };
  }

  // Makes the builder awaitable, mirroring supabase-js:
  //   const { data, error } = await api.from("t").select("*")...
  then<TResult1 = ApiResult, TResult2 = never>(
    onfulfilled?: ((value: ApiResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class ApiClient {
  static from(table: string): TableBuilder {
    return new TableBuilder(table);
  }

  // Stored procedures (replaces api.rpc()).
  static async rpc<T = unknown>(name: string, body?: Record<string, unknown>): Promise<{ data: T; error: null } | { data: null; error: { message: string } }> {
    const { ok, payload } = await request("POST", `/rpc/${name}`, body);
    if (!ok) {
      return {
        data: null,
        error: { message: typeof (payload as { error?: string }).error === "string" ? (payload as { error: string }).error : "RPC failed" },
      };
    }
    return { data: (payload as { data?: T }).data as T, error: null };
  }
}

export const api = ApiClient;

export const isConfigured = () => appwriteConfigPresent;
