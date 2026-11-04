import type { IncomingMessage, ServerResponse } from "node:http";
import { authenticateVerifiedRequest } from "./clerkWebhook.js";
import { transaction } from "./db.js";
import {
  encryptIdentityDocument,
  decryptIdentityDocument,
} from "./identityCrypto.js";
import {
  IDENTITY_FILE_LIMIT,
  IDENTITY_TYPES,
  validateAccount,
  validateIdentity,
  requiredIdentitySlots,
} from "../../src/lib/identityValidation.js";

type Request = IncomingMessage & {
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
};
const fail = (message: string, status = 400): never => {
  throw Object.assign(new Error(message), { status });
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function body(req: Request) {
  let value = req.body;
  if (value === undefined) {
    const parts: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      const b = Buffer.from(chunk);
      size += b.length;
      if (size > 3 * 1024 * 1024)
        fail("Request too large. Maximum document size is 2 MB.", 413);
      parts.push(b);
    }
    value = Buffer.concat(parts).toString();
  }
  if (typeof value === "string") {
    if (Buffer.byteLength(value) > 3 * 1024 * 1024)
      fail("Request too large.", 413);
    try {
      value = JSON.parse(value);
    } catch {
      fail("Invalid JSON.");
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("Invalid request.");
  return value as Record<string, unknown>;
}
function documentBytes(input: Record<string, unknown>) {
  if (
    typeof input.data !== "string" ||
    input.data.length > Math.ceil(IDENTITY_FILE_LIMIT / 3) * 4 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(input.data)
  )
    fail("Choose a JPEG or PNG image up to 2 MB.");
  const bytes = Buffer.from(input.data as string, "base64");
  if (
    !bytes.length ||
    bytes.length > IDENTITY_FILE_LIMIT ||
    bytes.toString("base64") !== input.data
  )
    fail("Choose a JPEG or PNG image up to 2 MB.");
  const png =
    bytes.length > 24 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg =
    bytes.length > 4 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255 &&
    bytes.at(-2) === 255 &&
    bytes.at(-1) === 217;
  if (!png && !jpeg)
    fail("The file content is not a supported JPEG or PNG image.");
  const mime = png ? "image/png" : "image/jpeg";
  if (input.mimeType !== mime)
    fail("The file type does not match its contents.");
  return { bytes, mime };
}
export default async function identityHandler(
  req: Request,
  res: ServerResponse,
) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const json = (status: number, value: unknown) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(value));
  };
  try {
    const user = await authenticateVerifiedRequest(req.headers ?? {});
    if (!user) return json(401, { error: "Sign in with a valid session." });
    const url = new URL(req.url ?? "/", "http://identity.local");
    const action = String(
      req.query?.action ?? url.searchParams.get("action") ?? "status",
    );
    const methods: Record<string, string> = {
      status: "GET",
      profile: "POST",
      upload: "POST",
      remove: "POST",
      submit: "POST",
      queue: "GET",
      review: "POST",
      reset: "POST",
      document: "GET",
    };
    if (!methods[action]) return json(404, { error: "Not found." });
    if (req.method !== methods[action]) {
      res.setHeader("Allow", methods[action]);
      return json(405, { error: "Method not allowed." });
    }
    const input = req.method === "POST" ? await body(req) : {};
    const adminAction =
      action === "queue" ||
      action === "review" ||
      action === "reset" ||
      (action === "document" &&
        String(req.query?.userId ?? url.searchParams.get("userId") ?? user) !==
          user);
    const target =
      adminAction && action !== "queue"
        ? String(
            input.userId ??
              req.query?.userId ??
              url.searchParams.get("userId") ??
              "",
          )
        : user;
    if (!uuid.test(target)) fail("Invalid account ID.");
    const result = await transaction(async (client) => {
      if (adminAction) {
        const role = await client.query(
          "SELECT 1 FROM public.user_roles WHERE user_id=$1 AND role IN ('admin','support_agent','finance_manager') LIMIT 1",
          [user],
        );
        if (!role.rows.length)
          fail("You do not have permission to review identity documents.", 403);
      }
      if (action === "queue") {
        const rows =
          await client.query(`SELECT c.user_id,c.status,c.revision,c.identity,c.submitted_at,c.reviewed_at,c.review_note,p.username,
          (SELECT json_agg(json_build_object('slot',d.slot,'name',d.name,'mimeType',d.mime_type,'documentType',d.document_type,'uploadedAt',d.uploaded_at)) FROM public.identity_documents d WHERE d.user_id=c.user_id) AS documents
          FROM public.identity_cases c JOIN public.profiles p ON p.id=c.user_id WHERE c.status IN ('Submitted','Rejected','Verified') ORDER BY (c.status='Submitted') DESC,c.submitted_at DESC LIMIT 100`);
        return { cases: rows.rows };
      }
      // Serialize case mutations, including first creation, and approval/profile locks.
      const profile = await client.query(
        "SELECT id,kyc_status,username,nationality FROM public.profiles WHERE id=$1 FOR UPDATE",
        [target],
      );
      if (!profile.rows[0]) fail("Account not found.", 404);
      if (action !== "status" && action !== "document")
        await client.query(
          `INSERT INTO public.identity_cases(user_id,status) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [
            target,
            /^(verified|approved)$/i.test(String(profile.rows[0].kyc_status))
              ? "Verified"
              : "Draft",
          ],
        );
      const found = await client.query(
        "SELECT * FROM public.identity_cases WHERE user_id=$1 FOR UPDATE",
        [target],
      );
      const current = found.rows[0] ?? {
        status: /^(verified|approved)$/i.test(
          String(profile.rows[0].kyc_status),
        )
          ? "Verified"
          : "Draft",
        revision: 0,
        identity: {},
      };
      const editable = () => {
        if (current.status === "Submitted" || current.status === "Verified")
          fail(
            "Identity is locked while under review or verified. Contact support for corrections.",
            409,
          );
      };
      const audit = async (
        event: string,
        note: string | null = null,
        revision = current.revision,
      ) =>
        client.query(
          "INSERT INTO public.identity_audit(user_id,actor_id,event,revision,note) VALUES ($1,$2,$3,$4,$5)",
          [target, user, event, revision, note],
        );
      if (action === "document") {
        const slot = String(
          req.query?.slot ?? url.searchParams.get("slot") ?? "",
        );
        if (!["front", "back"].includes(slot)) fail("Invalid document side.");
        const doc = (
          await client.query(
            "SELECT * FROM public.identity_documents WHERE user_id=$1 AND slot=$2",
            [target, slot],
          )
        ).rows[0];
        if (!doc) fail("Document not found.", 404);
        await audit("document_viewed");
        return {
          binary: decryptIdentityDocument(doc.encrypted_data, target, slot),
          mime: doc.mime_type,
        };
      }
      if (action === "profile") {
        let details;
        try {
          details = validateAccount(input.details);
        } catch (e) {
          fail((e as Error).message);
        }
        const saved = (
          await client.query(
            "SELECT details FROM public.account_details WHERE user_id=$1",
            [target],
          )
        ).rows[0]?.details;
        if (current.status === "Submitted" || current.status === "Verified") {
          const locked = current.identity?.details ?? saved;
          if (
            !locked ||
            ["firstName", "lastName", "dob", "country"].some(
              (k) => locked[k] !== details![k as keyof typeof details],
            )
          )
            fail(
              "Legal identity details are locked. Contact support to correct them.",
              409,
            );
        }
        await client.query(
          "INSERT INTO public.account_details(user_id,details) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET details=EXCLUDED.details,updated_at=now()",
          [target, JSON.stringify(details)],
        );
        await client.query(
          "UPDATE public.profiles SET username=$2,nationality=$3,updated_at=now() WHERE id=$1",
          [target, details!.username, details!.country],
        );
        await audit("profile_saved");
      }
      if (action === "upload") {
        editable();
        const recent =
          (
            await client.query(
              "SELECT count(*)::int AS count FROM public.identity_audit WHERE user_id=$1 AND event LIKE 'document_uploaded_%' AND created_at>now()-interval '1 hour'",
              [target],
            )
          ).rows[0]?.count ?? 0;
        if (recent >= 20)
          fail("Upload limit reached. Please try again in an hour.", 429);
        const slot = String(input.slot ?? "");
        if (!["front", "back"].includes(slot)) fail("Invalid document side.");
        if (!IDENTITY_TYPES.includes(input.documentType as any))
          fail("Choose a supported document type.");
        if (input.documentType === "passport" && slot === "back")
          fail("A passport only needs its photo page.");
        const { bytes, mime } = documentBytes(input);
        const name = (typeof input.name === "string" ? input.name : "document")
          .replace(/[\x00-\x1f\x7f/\\]/g, "_")
          .slice(0, 100);
        const encrypted = encryptIdentityDocument(bytes, target, slot);
        await client.query(
          `INSERT INTO public.identity_documents(user_id,slot,name,mime_type,byte_size,encrypted_data,document_type) VALUES ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (user_id,slot) DO UPDATE SET name=EXCLUDED.name,mime_type=EXCLUDED.mime_type,byte_size=EXCLUDED.byte_size,encrypted_data=EXCLUDED.encrypted_data,document_type=EXCLUDED.document_type,uploaded_at=now()`,
          [target, slot, name, mime, bytes.length, encrypted, input.documentType],
        );
        await audit(`document_uploaded_${slot}`);
      }
      if (action === "remove") {
        editable();
        if (!["front", "back"].includes(String(input.slot)))
          fail("Invalid document side.");
        await client.query(
          "DELETE FROM public.identity_documents WHERE user_id=$1 AND slot=$2",
          [target, input.slot],
        );
        await audit(`document_removed_${input.slot}`);
      }
      if (action === "submit") {
        editable();
        let identity;
        try {
          identity = validateIdentity(input);
        } catch (e) {
          fail((e as Error).message);
        }
        const details = (
          await client.query(
            "SELECT details FROM public.account_details WHERE user_id=$1",
            [target],
          )
        ).rows[0]?.details;
        try {
          validateAccount(details);
        } catch (e) {
          fail(`Save your personal details first. ${(e as Error).message}`);
        }
        const docs = (
          await client.query(
            "SELECT slot FROM public.identity_documents WHERE user_id=$1 AND document_type=$2",
            [target, identity!.documentType],
          )
        ).rows.map((d) => d.slot);
        if (
          requiredIdentitySlots(identity!.documentType).some(
            (slot) => !docs.includes(slot),
          )
        )
          fail("Upload every required document side before submitting.");
        if (identity!.documentType === "passport")
          await client.query(
            "DELETE FROM public.identity_documents WHERE user_id=$1 AND slot='back'",
            [target],
          );
        await client.query(
          "UPDATE public.identity_cases SET status='Submitted',revision=revision+1,identity=$2,consent_at=now(),submitted_at=now(),reviewed_at=NULL,reviewer_id=NULL,review_note=NULL,updated_at=now() WHERE user_id=$1",
          [target, JSON.stringify({ ...identity, details })],
        );
        await client.query(
          'UPDATE public.profiles SET kyc_status=\'Pending\',kyc_documents=\'{"submission":{"status":"Submitted"}}\'::jsonb,updated_at=now() WHERE id=$1',
          [target],
        );
        await audit("submitted", null, current.revision + 1);
      }
      if (action === "reset") {
        if (user === target)
          fail("You cannot reopen your own identity verification.", 403);
        if (
          !["Verified", "Rejected"].includes(current.status) ||
          input.revision !== current.revision
        )
          fail("This case has changed. Refresh the queue.", 409);
        const note = typeof input.note === "string" ? input.note.trim() : "";
        if (input.confirmed !== true || note.length < 10 || note.length > 1000)
          fail(
            "Confirm the review and explain why verification is being reopened (10–1000 characters).",
          );
        await client.query(
          "DELETE FROM public.identity_documents WHERE user_id=$1",
          [target],
        );
        await client.query(
          "UPDATE public.identity_cases SET status='Draft',identity='{}'::jsonb,review_note=$2,reviewer_id=$3,reviewed_at=now(),updated_at=now() WHERE user_id=$1",
          [target, note, user],
        );
        await client.query(
          "UPDATE public.profiles SET kyc_status='Pending',kyc_documents='{}'::jsonb,updated_at=now() WHERE id=$1",
          [target],
        );
        await audit("reopened", note);
      }
      if (action === "review") {
        if (user === target)
          fail("You cannot review your own identity submission.", 403);
        if (
          current.status !== "Submitted" ||
          input.revision !== current.revision
        )
          fail(
            "This submission has changed or was already reviewed. Refresh the queue.",
            409,
          );
        if (!["Verified", "Rejected"].includes(String(input.decision)))
          fail("Choose approve or request changes.");
        const note = typeof input.note === "string" ? input.note.trim() : "";
        if (
          note.length > 1000 ||
          (input.decision === "Rejected" && note.length < 10)
        )
          fail("Explain requested corrections in 10–1000 characters.");
        if (input.confirmed !== true)
          fail(
            "Confirm that you have reviewed the identity details and documents.",
          );
        const docs = (
          await client.query(
            "SELECT slot FROM public.identity_documents WHERE user_id=$1 AND document_type=$2",
            [target, current.identity.documentType],
          )
        ).rows.map((d) => d.slot);
        if (
          input.decision === "Verified" &&
          requiredIdentitySlots(current.identity.documentType).some(
            (slot) => !docs.includes(slot),
          )
        )
          fail("Required documents are missing. Request corrections instead.");
        await client.query(
          "UPDATE public.identity_cases SET status=$2,review_note=$3,reviewer_id=$4,reviewed_at=now(),updated_at=now() WHERE user_id=$1",
          [target, input.decision, note || null, user],
        );
        await client.query(
          "UPDATE public.profiles SET kyc_status=$2,kyc_documents='{}'::jsonb,updated_at=now() WHERE id=$1",
          [target, input.decision],
        );
        await audit(String(input.decision), note || null);
      }
      const state =
        (
          await client.query(
            "SELECT * FROM public.identity_cases WHERE user_id=$1",
            [target],
          )
        ).rows[0] ?? current;
      const details =
        (
          await client.query(
            "SELECT details FROM public.account_details WHERE user_id=$1",
            [target],
          )
        ).rows[0]?.details ?? null;
      const documents = (
        await client.query(
          'SELECT slot,name,document_type AS "documentType",mime_type AS "mimeType",byte_size AS size,uploaded_at AS "uploadedAt" FROM public.identity_documents WHERE user_id=$1',
          [target],
        )
      ).rows;
      return {
        details,
        verification: {
          status: state.status,
          revision: state.revision,
          documentType: state.identity?.documentType ?? "",
          documentNumber: state.identity?.documentNumber ?? "",
          submittedAt: state.submitted_at ?? null,
          reviewedAt: state.reviewed_at ?? null,
          reviewNote: state.review_note ?? null,
          documents,
        },
      };
    });
    if ("binary" in result) {
      res.statusCode = 200;
      res.setHeader("Content-Type", result.mime);
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="identity-document"',
      );
      return res.end(result.binary);
    }
    return json(200, result);
  } catch (error) {
    const e = error as Error & { status?: number; code?: string };
    const status =
      e.status ?? (e.code === "42P01" ? 503 : e.code === "23505" ? 409 : 500);
    if (status === 500)
      console.error("Identity request failed", { code: e.code });
    return json(status, {
      error:
        status === 500
          ? "Unable to complete this request. Try again or contact support."
          : e.code === "42P01"
            ? "Identity verification is not available yet. Contact support."
            : e.code === "23505"
              ? "That username is already in use. Please choose another."
              : e.message,
    });
  }
}
