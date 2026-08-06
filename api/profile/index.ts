import { query, queryOne, withUser, getRequiredEnv } from "../_lib/db.js";

type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ApiResponse = {
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => ApiResponse;
};

const getQueryString = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

// Extract Clerk user ID from the Authorization header / session token
const getClerkUserId = (req: ApiRequest): string | null => {
  const authHeader = req.headers?.["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);

  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    return payload.sub ?? null;
  } catch {
    return null;
  }
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  const method = (request.method || "GET").toUpperCase();
  const userId = getClerkUserId(request);

  if (!userId) {
    response.status(401).json({ error: "Unauthorized: missing or invalid session" });
    return;
  }

  try {
    if (method === "GET") {
      // Fetch profile by ID or fetch own profile
      const profileId = getQueryString(request.query?.id) || userId;
      const profile = await withUser(userId, async (client) => {
        const row = await client.query(
          "SELECT * FROM profiles WHERE id = $1",
          [profileId]
        );
        return row.rows[0] ?? null;
      });

      if (!profile) {
        response.status(404).json({ error: "Profile not found" });
        return;
      }

      response.setHeader("Cache-Control", "private, no-cache, must-revalidate");
      response.status(200).json({ data: profile });
      return;
    }

    if (method === "POST") {
      // Upsert own profile (create if not exists)
      const body = (request.body ?? {}) as Record<string, unknown>;
      const allowedFields = [
        "id", "email", "display_name", "username", "avatar_url",
        "balance", "national", "phone_country", "phone_country_code",
        "kyc_status", "kyc_documents", "vip_tier", "vip_tier_override",
        "referral_code", "referred_by", "total_deposit", "total_profit",
        "total_trades", "total_trade_volume_30d", "welcome_bonus_granted_at",
        "reserved_withdrawal_balance", "created_at", "updated_at",
      ];

      const updates: Record<string, unknown> = { id: userId };
      for (const field of allowedFields) {
        if (field !== "id" && Object.prototype.hasOwnProperty.call(body, field)) {
          updates[field] = body[field];
        }
      }
      updates.updated_at = new Date().toISOString();

      const result = await withUser(userId, async (client) => {
        const setClause = Object.keys(updates)
          .filter((k) => k !== "id")
          .map((k, i) => `${k} = $${i + 2}`)
          .join(", ");
        const values = [userId, ...Object.values(
          Object.fromEntries(Object.entries(updates).filter(([k]) => k !== "id"))
        )] as unknown[];

        if (setClause) {
          await client.query(
            `INSERT INTO profiles (id, ${Object.keys(updates).filter(k => k !== "id").join(", ")}) VALUES ($1, ${values.slice(1).map((_, i) => `$${i + 2}`).join(", ")})
             ON CONFLICT (id) DO UPDATE SET ${setClause}, updated_at = now()`,
            [userId, ...values.slice(1)]
          );
        } else {
          await client.query(
            `INSERT INTO profiles (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
            [userId]
          );
        }

        const row = await client.query("SELECT * FROM profiles WHERE id = $1", [userId]);
        return row.rows[0] ?? null;
      });

      response.status(200).json({ data: result });
      return;
    }

    if (method === "PATCH") {
      // Update own profile
      const body = (request.body ?? {}) as Record<string, unknown>;
      const updates: Record<string, unknown> = {};
      const allowedFields = [
        "display_name", "username", "avatar_url", "balance",
        "national", "phone_country", "phone_country_code",
        "kyc_status", "kyc_documents", "vip_tier", "vip_tier_override",
        "total_deposit", "total_profit", "total_trades", "total_trade_volume_30d",
        "welcome_bonus_granted_at", "reserved_withdrawal_balance",
      ];

      for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
          updates[field] = body[field];
        }
      }
      updates.updated_at = new Date().toISOString();

      const result = await withUser(userId, async (client) => {
        const setClause = Object.keys(updates)
          .map((k, i) => `${k} = $${i + 2}`)
          .join(", ");
        const values = [userId, ...Object.values(updates)];

        await client.query(
          `UPDATE profiles SET ${setClause} WHERE id = $1 RETURNING *`,
          values
        );

        const row = await client.query("SELECT * FROM profiles WHERE id = $1", [userId]);
        return row.rows[0] ?? null;
      });

      response.status(200).json({ data: result });
      return;
    }

    response.setHeader("Allow", "GET, POST, PATCH");
    response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Profile API error:", error);
    response.status(500).json({ error: "Internal server error" });
  }
}

export { getQueryString, getClerkUserId };
