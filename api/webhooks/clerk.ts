import { verifyClerkSignature } from "../_lib/clerkWebhook.js";
import { query, withUser } from "../_lib/db.js";

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

type ApiResponse = {
  json: (body: unknown) => void;
  status: (statusCode: number) => ApiResponse;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = request.body as Record<string, unknown>;
  const signature = request.headers?.["x-clerk-signature"] as string | undefined;
  const bodyString = typeof body === "string" ? body : JSON.stringify(body);

  // Verify webhook signature
  const isValid = verifyClerkSignature(bodyString, signature || "");
  if (!isValid) {
    response.status(401).json({ error: "Invalid signature" });
    return;
  }

  const eventType = body.type as string;
  const eventData = body.data as Record<string, unknown>;
  const userId = eventData.id as string;

  if (!userId) {
    response.status(400).json({ error: "Missing user ID" });
    return;
  }

  try {
    if (eventType === "user.deleted") {
      await query("DELETE FROM users WHERE id = $1", [userId]);
    } else if (eventType === "user.created" || eventType === "user.updated") {
      const emailAddresses = (eventData.email_addresses as Array<{ email_address: string }> | undefined) ?? [];
      const primaryEmailId = eventData.primary_email_address_id as string | undefined;
      const primaryEmail = emailAddresses.find((e) => e.email_address === primaryEmailId) ?? emailAddresses[0];
      const email = primaryEmail?.email_address ?? null;

      await withUser(null, async (client) => {
        await client.query(
          `INSERT INTO users (id, email, raw_user_meta_data, created_at, updated_at)
           VALUES ($1, $2, $3, now(), now())
           ON CONFLICT (id) DO UPDATE SET
             email = EXCLUDED.email,
             raw_user_meta_data = EXCLUDED.raw_user_meta_data,
             updated_at = now()`,
          [userId, email, JSON.stringify(eventData)]
        );
      });
    }

    response.status(200).json({ received: true, eventType });
  } catch (error) {
    console.error("Webhook handler error:", error);
    response.status(500).json({ error: "Webhook processing failed" });
  }
}
