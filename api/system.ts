import type { IncomingMessage, ServerResponse } from "node:http";
import systemHandler from "./_lib/systemHandler.js";
import {
  handleDb,
  handleProfile,
  handlePlatformSettings,
  handleCloudinaryUpload,
  handleCloudinaryDelete,
  handleCloudinaryExists,
  handleCloudinaryPublicUrl,
  handlePusherAuth,
  handleRpc,
  testDbConnection,
} from "./_lib/newApi.js";
import { query, queryOne } from "./_lib/db.js";

type ApiRequest = IncomingMessage & {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

type ApiResponse = ServerResponse<IncomingMessage>;

const firstOf = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const res = response;
  const route = ((firstOf(request.query?.route) ?? firstOf(request.query?.resource)) ?? "").toLowerCase();

  try {
    switch (route) {
      case "health":
        try {
          const dbTest = await testDbConnection();
          if (dbTest.ok) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ ok: true, db: "connected" }));
          } else {
            res.statusCode = 503;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ ok: false, db: "failed", error: dbTest.error }));
          }
        } catch (e) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ ok: false, db: "error", error: String(e) }));
        }
        return;
      case "db":
        await handleDb(request, res);
        return;
      case "profile":
        await handleProfile(request, res);
        return;
      case "platform-settings":
        await handlePlatformSettings(request, res);
        return;
      case "cloudinary-upload":
        await handleCloudinaryUpload(request, res);
        return;
      case "cloudinary-delete":
        await handleCloudinaryDelete(request, res);
        return;
      case "cloudinary-exists":
        await handleCloudinaryExists(request, res);
        return;
      case "cloudinary-public-url":
        await handleCloudinaryPublicUrl(request, res);
        return;
      case "pusher-auth":
        await handlePusherAuth(request, res);
        return;
      case "rpc":
        await handleRpc(request, res);
        return;
      case "cron": {
        const secret = process.env.CRON_SECRET?.trim();
        if (secret) {
          const auth = (request.headers?.["authorization"] || request.headers?.["Authorization"]) as string | undefined;
          const token = Array.isArray(auth) ? auth[0] : auth;
          const url = new URL(request.url || "/api/cron", "https://placeholder.local");
          if (token !== `Bearer ${secret}` && url.searchParams.get("secret") !== secret) {
            res.statusCode = 401;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Unauthorized" }));
            return;
          }
        }
        const result: any = { ok: true };
        try {
          const due = await query(`SELECT id FROM public.announcements WHERE status='scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now() ORDER BY scheduled_at ASC`);
          let dispatched = 0;
          for (const row of due as any[]) {
            try { await query("SELECT public.dispatch_announcement_internal($1)", [row.id]); dispatched++; } catch (e) { console.error("dispatch failed", row.id, e); }
          }
          result.dispatched = dispatched;
        } catch (e) { result.dispatchError = e instanceof Error ? e.message : String(e); }
        const resendKey = process.env.RESEND_API_KEY?.trim();
        const fromAddress = process.env.EMAIL_FROM_ADDRESS?.trim() || process.env.RESEND_FROM?.trim() || "noreply@initoption.com";
        if (!resendKey) {
          result.emailSkipped = "RESEND_API_KEY not configured";
        } else {
          try {
            const pending = await query(`SELECT id, recipient_email, subject, payload FROM public.notification_email_deliveries WHERE status = 'pending' AND next_attempt_at <= now() ORDER BY created_at ASC LIMIT 20`);
            let sent = 0, failed = 0;
            for (const row of pending as any[]) {
              const claimed = await queryOne(`UPDATE public.notification_email_deliveries SET status='processing', last_attempt_at=now(), updated_at=now() WHERE id=$1 AND status='pending' RETURNING id`, [row.id]);
              if (!claimed) continue;
              try {
                const payload = row.payload as any;
                const html = payload?.html || payload?.message || `<p>${payload?.message || row.subject}</p>`;
                const text = payload?.text || payload?.message || row.subject;
                const resp = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: fromAddress, to: row.recipient_email, subject: row.subject, html, text }) });
                const body = await resp.json().catch(() => ({})) as any;
                if (!resp.ok) throw new Error(body?.message || `Resend HTTP ${resp.status}`);
                await query(`UPDATE public.notification_email_deliveries SET status='sent', provider_message_id=$2, sent_at=now(), updated_at=now() WHERE id=$1`, [row.id, body?.id || null]);
                sent++;
              } catch (e: any) {
                const msg = (e?.message || String(e)).slice(0, 2000);
                const nextAttempt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
                await query(`UPDATE public.notification_email_deliveries SET status='pending', retry_count=retry_count+1, last_error=$2, next_attempt_at=$3, updated_at=now() WHERE id=$1`, [row.id, msg, nextAttempt]);
                await query(`UPDATE public.notification_email_deliveries SET status='failed' WHERE id=$1 AND retry_count >= 5`, [row.id]);
                failed++;
              }
            }
            result.emailProcessed = pending.length; result.emailSent = sent; result.emailFailed = failed;
          } catch (e) { result.emailError = e instanceof Error ? e.message : String(e); }
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(result));
        return;
      }
      default:
        await systemHandler(request as never, res as never);
    }
  } catch (error) {
    console.error("api dispatcher failed", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  }
}
