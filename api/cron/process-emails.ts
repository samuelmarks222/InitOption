import type { IncomingMessage, ServerResponse } from "node:http";
import { query, queryOne } from "../_lib/db.js";

const sendJson = (res: ServerResponse, code: number, payload: unknown) => {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const BATCH_SIZE = 20;

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
      const url = new URL(req.url || "/", "https://placeholder.local");
      if (url.searchParams.get("secret") !== secret) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }
    }
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const fromAddress = process.env.EMAIL_FROM_ADDRESS?.trim() || process.env.RESEND_FROM?.trim() || "noreply@initoption.com";

  if (!resendKey) {
    // No Resend configured — mark pending as skipped to avoid infinite retry, but log
    console.warn("RESEND_API_KEY not set — email worker skipping");
    sendJson(res, 200, { ok: true, skipped: true, reason: "RESEND_API_KEY not configured" });
    return;
  }

  try {
    const pending = await query(
      `SELECT id, recipient_email, subject, payload, notification_type, dedupe_key
       FROM public.notification_email_deliveries
       WHERE status = 'pending' AND next_attempt_at <= now()
       ORDER BY created_at ASC LIMIT ${BATCH_SIZE}`
    );

    let sent = 0, failed = 0, skipped = 0;

    for (const row of pending as any[]) {
      const id = row.id as string;
      const to = row.recipient_email as string;
      const subject = row.subject as string;
      const payload = row.payload as any;
      const html = payload?.html || payload?.message || payload?.body || `<p>${payload?.message || subject}</p>`;
      const text = payload?.text || payload?.message || subject;

      // Claim row as processing
      const claimed = await queryOne(
        `UPDATE public.notification_email_deliveries SET status='processing', last_attempt_at=now(), updated_at=now() WHERE id=$1 AND status='pending' RETURNING id`,
        [id]
      );
      if (!claimed) continue;

      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": " application/json" .trim() },
          body: JSON.stringify({ from: fromAddress, to, subject, html, text }),
        });
        const body = await resp.json().catch(() => ({})) as any;
        if (!resp.ok) throw new Error(body?.message || `Resend HTTP ${resp.status}`);

        await query(
          `UPDATE public.notification_email_deliveries SET status='sent', provider_message_id=$2, sent_at=now(), updated_at=now() WHERE id=$1`,
          [id, body?.id || null]
        );
        sent++;
      } catch (e: any) {
        const msg = e?.message || String(e);
        const nextAttempt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        await query(
          `UPDATE public.notification_email_deliveries SET status='pending', retry_count=retry_count+1, last_error=$2, next_attempt_at=$3, updated_at=now() WHERE id=$1`,
          [id, msg.slice(0, 2000), nextAttempt]
        );
        // After 5 retries, mark failed
        await query(`UPDATE public.notification_email_deliveries SET status='failed' WHERE id=$1 AND retry_count >= 5`, [id]);
        failed++;
        console.error(`Email ${id} failed:`, msg);
      }
    }

    sendJson(res, 200, { ok: true, processed: pending.length, sent, failed, skipped });
  } catch (e) {
    console.error("process-emails failed", e);
    sendJson(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
}
