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
      case "harden": {
        const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        await client.connect();
        const out: Record<string, unknown> = {};
        try {
          await client.query(
            `create or replace function public.current_app_user_id() returns uuid language sql stable as $$
              select case
                when current_setting('app.current_user_id', true) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                then current_setting('app.current_user_id', true)::uuid
                else null end;
            $$;`
          );
          await client.query(
            `do $$
            declare
              pol record;
              newq text;
              newc text;
            begin
              for pol in
                select n.nspname as s, c.relname as t, p.polname as name, p.polqual as qual, p.polwithcheck as wcheck
                from pg_policy p
                join pg_class c on c.oid = p.polrelid
                join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public'
                  and (p.polqual is not null or p.polwithcheck is not null)
              loop
                if pol.qual is not null then
                  newq := regexp_replace(pol.qual::text, 'current_setting\\(''app.current_user_id''[^)]*\\)::uuid', 'public.current_app_user_id()', 'g');
                  if newq <> pol.qual::text then
                    execute format('alter policy %I on %I.%I using (%s)', pol.name, pol.s, pol.t, newq);
                  end if;
                end if;
                if pol.wcheck is not null then
                  newc := regexp_replace(pol.wcheck::text, 'current_setting\\(''app.current_user_id''[^)]*\\)::uuid', 'public.current_app_user_id()', 'g');
                  if newc <> pol.wcheck::text then
                    execute format('alter policy %I on %I.%I with check (%s)', pol.name, pol.s, pol.t, newc);
                  end if;
                end if;
              end loop;
            end $$;`
          );
          const changed = await client.query(
            "select schemaname, tablename, policyname from pg_policies where schemaname='public' and (qual::text like '%current_app_user_id()%' or with_check::text like '%current_app_user_id()%')"
          );
          out.hardened = changed.rows;
          const sample = await client.query(
            "select policyname, pg_get_ruledef(p.oid) as def from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='crypto_payment_methods' limit 1"
          );
          out.sample = sample.rows;
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
