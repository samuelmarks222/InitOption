import type { IncomingMessage, ServerResponse } from "node:http";
import { query } from "../_lib/db.js";

const sendJson = (res: ServerResponse, code: number, payload: unknown) => {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

export default async function handler(req: IncomingMessage & { headers: Record<string, string | string[] | undefined>; url?: string }, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = (req.headers["authorization"] || req.headers["Authorization"]) as string | undefined;
    const token = Array.isArray(auth) ? auth[0] : auth;
    if (token !== `Bearer ${secret}`) {
      // Vercel cron sends Authorization: Bearer <CRON_SECRET> automatically when CRON_SECRET is set
      // Allow also ?secret= query for manual testing
      const url = new URL(req.url || "/", "https://placeholder.local");
      if (url.searchParams.get("secret") !== secret) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
    }
  }
  try {
    const due = await query(`SELECT id FROM public.announcements WHERE status='scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now() ORDER BY scheduled_at ASC`);
    let dispatched = 0;
    for (const row of due as any[]) {
      try {
        await query("SELECT public.dispatch_announcement_internal($1)", [row.id]);
        dispatched++;
      } catch (inner) {
        console.error("dispatch_announcement_internal failed for", row.id, inner);
      }
    }
    sendJson(res, 200, { ok: true, dispatched });
  } catch (e) {
    console.error("dispatch-announcements failed", e);
    sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
}
