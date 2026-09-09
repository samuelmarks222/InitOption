import type { IncomingMessage, ServerResponse } from "node:http";
import { query, queryOne } from "./_lib/db.js";

const sendJson = (res: ServerResponse, code: number, payload: unknown) => {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const isCronAuthorized = (req: IncomingMessage & { headers: Record<string, string | string[] | undefined>; url?: string }) => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = (req.headers["authorization"] || req.headers["Authorization"]) as string | undefined;
  const token = Array.isArray(auth) ? auth[0] : auth;
  if (token === `Bearer ${secret}`) return true;
  const url = new URL(req.url || "/", "https://placeholder.local");
  return url.searchParams.get("secret") === secret;
};

export default async function handler(req: IncomingMessage & { headers: Record<string, string | string[] | undefined>; url?: string }, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  if (!isCronAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  const url = new URL(req.url || "/api/cron", "https://placeholder.local");
  const task = url.searchParams.get("task") || url.searchParams.get("flow") || "";

  // Default: run both tasks when called without specific task (single cron entry can handle both)
  const runDispatch = !task || task === "dispatch" || task === "announcements" || task === "all";
  const runEmails = !task || task === "emails" || task === "email" || task === "all";

  const result: any = { ok: true };

  if (runDispatch) {
    try {
      const due = await query(`SELECT id FROM public.announcements WHERE status='scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now() ORDER BY scheduled_at ASC`);
      let dispatched = 0;
      for (const row of due as any[]) {
        try {
          await query("SELECT public.dispatch_announcement_internal($1)", [row.id]);
          dispatched++;
        } catch (e) {
          console.error("dispatch_announcement_internal failed for", row.id, e);
        }
      }
      result.dispatched = dispatched;
    } catch (e) {
      console.error("dispatch-announcements failed", e);
      result.dispatchError = e instanceof Error ? e.message : String(e);
    }
  }

  if (runEmails) {
    const resendKey = process.env.RESEND_API_KEY?.trim();
    const fromAddress = process.env.EMAIL_FROM_ADDRESS?.trim() || process.env.RESEND_FROM?.trim() || "noreply@initoption.com";
    if (!resendKey) {
      result.emailSkipped = "RESEND_API_KEY not configured";
    } else {
      try {
        const pending = await query(
          `SELECT id, recipient_email, subject, payload FROM public.notification_email_deliveries WHERE status = 'pending' AND next_attempt_at <= now() ORDER BY created_at ASC LIMIT 20`
        );
        let sent = 0, failed = 0;
        for (const row of pending as any[]) {
          const id = row.id as string;
          const claimed = await queryOne(`UPDATE public.notification_email_deliveries SET status='processing', last_attempt_at=now(), updated_at=now() WHERE id=$1 AND status='pending' RETURNING id`, [id]);
          if (!claimed) continue;
          try {
            const payload = row.payload as any;
            const html = payload?.html || payload?.message || `<p>${payload?.message || row.subject}</p>`;
            const text = payload?.text || payload?.message || row.subject;
            const resp = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ from: fromAddress, to: row.recipient_email, subject: row.subject, html, text }),
            });
            const body = await resp.json().catch(() => ({})) as any;
            if (!resp.ok) throw new Error(body?.message || `Resend HTTP ${resp.status}`);
            await query(`UPDATE public.notification_email_deliveries SET status='sent', provider_message_id=$2, sent_at=now(), updated_at=now() WHERE id=$1`, [id, body?.id || null]);
            sent++;
          } catch (e: any) {
            const msg = (e?.message || String(e)).slice(0, 2000);
            const nextAttempt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
            await query(`UPDATE public.notification_email_deliveries SET status='pending', retry_count=retry_count+1, last_error=$2, next_attempt_at=$3, updated_at=now() WHERE id=$1`, [id, msg, nextAttempt]);
            await query(`UPDATE public.notification_email_deliveries SET status='failed' WHERE id=$1 AND retry_count >= 5`, [id]);
            failed++;
          }
        }
        result.emailProcessed = pending.length;
        result.emailSent = sent;
        result.emailFailed = failed;
      } catch (e) {
        result.emailError = e instanceof Error ? e.message : String(e);
      }
    }
  }

  sendJson(res, 200, result);
}
