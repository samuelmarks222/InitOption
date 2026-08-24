import type { IncomingMessage, ServerResponse } from "node:http";
import pg from "pg";
import systemHandler from "./_lib/systemHandler.js";
import {
  handleDb,
  handleRpc,
  handleProfile,
  handlePlatformSettings,
  handleCloudinaryUpload,
  handleCloudinaryDelete,
  handleCloudinaryExists,
  handleCloudinaryPublicUrl,
  handlePusherAuth,
  testDbConnection,
} from "./_lib/newApi.js";

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
  const route = (firstOf(request.query?.route) ?? "").toLowerCase();

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
      case "grant": {
        const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        await client.connect();
        const out: Record<string, unknown> = {};
        try {
          await client.query("GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO authenticated, service_role");
          await client.query("GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role");
          const t = await client.query("SET ROLE authenticated; SELECT set_config('app.current_user_id', 'b291863d-f351-554a-b70a-10856ad1b690', true); SELECT count(*) AS c FROM public.bonus_settings;");
          out.bonusCount = t.rows;
        } catch (e) {
          out.error = e instanceof Error ? e.message : String(e);
        } finally {
          await client.end();
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(out, null, 2));
        return;
      }
      case "db":
        await handleDb(request, res);
        return;
      case "rpc":
        await handleRpc(request, res);
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
      default:
        // Legacy /api/system?resource=... behaviour
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
