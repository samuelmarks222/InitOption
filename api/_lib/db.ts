import pg from "pg";
import type { Pool as PoolType } from "pg";
import { clerkUserIdToUuid } from "./clerkWebhook.js";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL?.trim();
const isValidIdentifier = /^[A-Za-z_][A-Za-z0-9_]*$/;

if (!connectionString) {
  console.error("DATABASE_URL is not set; the Neon/PostgreSQL adapter will be unavailable.");
}

let pool: PoolType | null = null;
let poolCreationError: Error | null = null;

const getPool = () => {
  if (!connectionString) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }
  if (poolCreationError) {
    throw poolCreationError;
  }
  if (!pool) {
    try {
      pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
      pool.on("error", (err) => {
        console.error("Unexpected pool error:", err);
      });
    } catch (e) {
      poolCreationError = e instanceof Error ? e : new Error(String(e));
      throw poolCreationError;
    }
  }
  return pool;
};

// Test database connectivity
export const testDbConnection = async (): Promise<{ ok: boolean; error?: string }> => {
  try {
    const p = getPool();
    const client = await p.connect();
    await client.query("SELECT 1");
    client.release();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};

export const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export type QueryResultRow = Record<string, unknown>;

export const query = async (sql: string, params: unknown[] = []): Promise<QueryResultRow[]> => {
  const client = getPool();
  const { rows } = await client.query(sql, params);
  return rows as QueryResultRow[];
};

export const queryOne = async (sql: string, params: unknown[] = []): Promise<QueryResultRow | null> => {
  const rows = await query(sql, params);
  return rows.length > 0 ? (rows[0] as QueryResultRow) : null;
};

// Translates Supabase's `supabase.rpc("fn", { p_a: x, p_b: y })` into a Postgres
// function call. SQL function params are expected to be named identifiers (e.g. p_amount).
export const rpc = async (name: string, payload: Record<string, unknown> = {}): Promise<QueryResultRow[]> => {
  if (!isValidIdentifier.test(name)) {
    throw new Error(`Invalid function name: ${name}`);
  }
  const keys = Object.keys(payload);
  if (keys.length === 0) {
    const rows = await query(`SELECT * FROM ${name}()`);
    return rows;
  }
  const args = keys.map((k, i) => `${k} := $${i + 1}`).join(", ");
  const sql = `SELECT * FROM ${name}(${args})`;
  return query(sql, keys.map((k) => payload[k]));
};

export type QueryFn = (client: pg.PoolClient) => Promise<unknown>;

// User-scoped RPC: sets app.current_user_id (used by SECURITY DEFINER functions
// to resolve the acting profile) then invokes `SELECT * FROM fn(args)`.
export const userRpc = async (name: string, clerkUserId: string, payload: Record<string, unknown> = {}): Promise<QueryResultRow[]> => {
  if (!isValidIdentifier.test(name)) {
    throw new Error(`Invalid function name: ${name}`);
  }
  const mappedId = clerkUserIdToUuid(clerkUserId);
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // set_config(..., true) = transaction-scoped GUC (SET LOCAL can't take bind params).
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [mappedId]);
    const keys = Object.keys(payload);
    let sql: string;
    const values: unknown[] = [];
    if (keys.length === 0) {
      sql = `SELECT * FROM ${name}()`;
    } else {
      const assignments = keys.map((k, i) => `${k} := $${i + 1}`).join(", ");
      values.push(...keys.map((k) => payload[k]));
      sql = `SELECT * FROM ${name}(${assignments})`;
    }
    const { rows } = await client.query(sql, values);
    await client.query("COMMIT");
    return rows as QueryResultRow[];
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

export const withUser = async <T>(clerkUserId: string | null, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (clerkUserId) {
      await client.query("SELECT set_config('app.current_user_id', $1, true)", [clerkUserId]);
    }
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

export const transaction = async <T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const adminClient = { query, queryOne, rpc, withUser, transaction, getRequiredEnv };

// `SELECT * FROM fn(...)` returns rows shaped as `{ "<fn_name>": <payload> }` when the
// function returns a single JSON value. Callers that read fields like `.request_id`
// directly off the row were silently getting undefined, which surfaced as
// "Deposit request could not be created." / "Withdrawal request could not be created."
// This unwraps the JSON payload (or a single-key object row) and falls back to the row
// itself for functions that return a TABLE/composite (multi-column) result.
export const rpcResultPayload = <T = Record<string, unknown>>(
  rows: unknown[],
  fnName?: string,
): T | null => {
  const first = (rows ?? [])[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return null;
  const row = first as Record<string, unknown>;

  if (fnName) {
    const named = row[fnName];
    if (named && typeof named === "object" && !Array.isArray(named)) return named as T;
  }

  const keys = Object.keys(row);
  if (keys.length === 1) {
    const only = row[keys[0]];
    if (only && typeof only === "object" && !Array.isArray(only)) return only as T;
  }

  return row as T;
};
