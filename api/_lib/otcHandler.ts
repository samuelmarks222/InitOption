import type { IncomingMessage, ServerResponse } from "node:http";
import { transaction } from "./db.js";
import { OTC_SCHEMA } from "./otcSchema.js";
import { createServerlessOTC } from "../../server/otc/serverless.mjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { OTCAssetConfig } from "../../server/otc/serverless.mjs";

// Vercel includes this file via api/system.ts.includeFiles. Runtime JSON loading
// avoids depending on resolveJsonModule in Vercel's API TypeScript compiler.
const assets: Record<string, OTCAssetConfig> = JSON.parse(
  readFileSync(resolve(process.cwd(), "server/otc/assets.json"), "utf8"),
);

let ready: Promise<void> | undefined;
async function ensureSchema() {
  if (!ready)
    ready = transaction(async (client) => {
      // Serialize idempotent first-deploy DDL across cold starts.
      await client.query("SET LOCAL lock_timeout = '8s'");
      await client.query("SELECT pg_advisory_xact_lock(1732247103)");
      await client.query(OTC_SCHEMA);
    }).catch((error) => {
      ready = undefined;
      throw error;
    });
  return ready;
}
const read = createServerlessOTC({ transaction, assets });
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET");
    res.end(JSON.stringify({ error: "Read-only pricing endpoint" }));
    return;
  }
  try {
    const url = new URL(req.url ?? "/api/otc", "http://otc.local");
    for (const [key, value] of Object.entries((req as any).query ?? {})) {
      if (typeof value === "string" && !url.searchParams.has(key))
        url.searchParams.set(key, value);
    }
    const action = url.searchParams.get("action") ?? "ticks";
    if (action !== "ticks" && action !== "price" && action !== "health" && action !== "history") {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Unknown OTC action" }));
      return;
    }
    if (
      action !== "health" &&
      !Object.prototype.hasOwnProperty.call(assets, url.searchParams.get("symbol") ?? "")
    ) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "Unknown OTC symbol" }));
      return;
    }
    await ensureSchema();
    if (action === "health")
      await transaction((client) =>
        client.query("SELECT 1 FROM public.otc_markets LIMIT 1"),
      );
    const result =
      action === "health"
        ? {
            healthy: true,
            mode: "internal-otc",
            transport: "http",
            storage: "postgresql",
          }
        : await read({
            action,
            symbol: url.searchParams.get("symbol"),
            seconds: url.searchParams.has("seconds") ? Number(url.searchParams.get("seconds")) : undefined,
            before: url.searchParams.has("before") ? Number(url.searchParams.get("before")) : undefined,
            limit: url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : undefined,
            after: url.searchParams.has("after")
              ? Number(url.searchParams.get("after"))
              : undefined,
            at: url.searchParams.has("at")
              ? Number(url.searchParams.get("at"))
              : undefined,
          });
    const pending = "pending" in result && result.pending;
    res.statusCode = pending ? 409 : 200;
    if (pending) res.setHeader("Retry-After", "1");
    res.end(JSON.stringify(result));
  } catch (error) {
    const status = Number((error as any)?.status) || 503;
    res.statusCode = status;
    if (status === 503) {
      console.error("OTC database request failed:", (error as Error).message);
      res.setHeader("Retry-After", "2");
    }
    res.end(
      JSON.stringify({
        error:
          status === 503
            ? "OTC storage unavailable. Verify DATABASE_URL and pricing schema permissions."
            : (error as Error).message,
      }),
    );
  }
}
