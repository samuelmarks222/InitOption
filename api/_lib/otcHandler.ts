import type { IncomingMessage, ServerResponse } from "node:http";
import { transaction } from "./db.js";
import { OTC_SCHEMA, OTC_COLLECTION_SCHEMA, OTC_SCHEDULER_SCHEMA } from "./otcSchema.js";
import { createServerlessOTC } from "../../server/otc/serverless.mjs";
import { createOTCCollector } from "../../server/otc/collector.mjs";
import { createOTCBackground } from "../../server/otc/background.mjs";
import { authenticateVerifiedRequest } from "./clerkWebhook.js";
import { timingSafeEqual } from "node:crypto";
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
      await client.query(OTC_COLLECTION_SCHEMA);
      await client.query(OTC_SCHEDULER_SCHEMA);
    }).catch((error) => {
      ready = undefined;
      throw error;
    });
  return ready;
}
const read = createServerlessOTC({ transaction, assets });
const collect = createOTCCollector({transaction,assets,read:async request=>{
  const result=await read(request);
  if (!("type" in result) || (result.type!=="snapshot" && result.type!=="batch")) throw new Error("Invalid collector tick result");
  return result;
}});
const background = createOTCBackground({ transaction, assets, collect });
async function readControlBody(req: IncomingMessage) {
  let body = (req as any).body;
  if (body === undefined) {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk.toString();
      if (Buffer.byteLength(raw) > 4096) throw Object.assign(new Error("Request body too large"), { status: 413 });
    }
    body = raw;
  }
  try {
    if (typeof body === 'string') body = JSON.parse(body);
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.enabled !== 'boolean') throw new Error();
    return body as { enabled: boolean };
  } catch { throw Object.assign(new Error("enabled must be a boolean"), { status: 400 }); }
}
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  try {
    const url = new URL(req.url ?? "/api/otc", "http://otc.local");
    for (const [key, value] of Object.entries((req as any).query ?? {})) {
      if (typeof value === "string" && !url.searchParams.has(key))
        url.searchParams.set(key, value);
    }
    const action = url.searchParams.get("action") ?? "ticks";
    if (action === "collection-settings" || action === "collection-run") {
      const allowed = action === "collection-settings" ? ["GET", "POST"] : ["POST"];
      if (!allowed.includes(req.method ?? '')) {
        res.statusCode = 405; res.setHeader("Allow", allowed.join(', '));
        res.end(JSON.stringify({error:"Method not allowed"})); return;
      }
      const userId = await authenticateVerifiedRequest(req.headers ?? {});
      if (!userId) { res.statusCode=401; res.end(JSON.stringify({error:"Verified admin session required"})); return; }
      const isAdmin = await transaction(async client => (await client.query(
        "SELECT 1 FROM public.user_roles WHERE user_id=$1 AND role='admin' LIMIT 1", [userId])).rows.length > 0);
      if (!isAdmin) { res.statusCode=403; res.end(JSON.stringify({error:"Admin role required"})); return; }
      // Validate mutations before DDL or setting changes.
      const body = action === "collection-settings" && req.method === "POST" ? await readControlBody(req) : null;
      await ensureSchema();
      if (action === "collection-run") {
        const cycle = await background.run();
        res.statusCode = !("result" in cycle) ? 200 : cycle.result.errors.length ? 503 : cycle.result.complete ? 200 : 202;
        res.end(JSON.stringify(cycle)); return;
      }
      const status = body ? await background.setEnabled(body.enabled, userId) : await background.status();
      res.statusCode=200;
      res.end(JSON.stringify({...status, schedulerSecretConfigured: Boolean(process.env.CRON_SECRET?.trim())})); return;
    }
    if (req.method !== "GET") {
      res.statusCode=405; res.setHeader("Allow","GET");
      res.end(JSON.stringify({error:"Read-only pricing endpoint"})); return;
    }
    if (action === "collect") {
      const secret=process.env.CRON_SECRET?.trim();
      const received=typeof req.headers.authorization==='string'?Buffer.from(req.headers.authorization):Buffer.alloc(0);
      const expected=Buffer.from(`Bearer ${secret??''}`);
      if (!secret || received.length!==expected.length || !timingSafeEqual(received,expected)) {
        res.statusCode=secret?401:503;
        res.end(JSON.stringify({error:secret?"Unauthorized":"Background collection requires CRON_SECRET"}));return;
      }
      await ensureSchema();
      const cycle=await background.run({scheduled:true});
      res.statusCode=!("result" in cycle)?200:cycle.result.errors.length?503:cycle.result.complete?200:202;
      res.end(JSON.stringify(cycle));return;
    }
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
