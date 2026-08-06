import pg from "pg";
import type { Pool as PoolType } from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL?.trim();
const isValidIdentifier = /^[A-Za-z_][A-Za-z0-9_]*$/;

if (!connectionString) {
  console.error("DATABASE_URL is not set; the Neon/PostgreSQL adapter will be unavailable.");
}

let pool: PoolType | null = null;

const getPool = () => {
  if (!connectionString) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }
  if (!pool) {
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  }
  return pool;
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

export const withUser = async <T>(clerkUserId: string | null, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    if (clerkUserId) {
      await client.query("SET LOCAL app.current_user_id = $1", [clerkUserId]);
    }
    return (await fn(client)) as T;
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
