// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
import { it, vi } from "vitest";
const session = vi.hoisted(() => ({ db: null as any, actor: "" }));
vi.mock("../../api/_lib/db", () => ({
  transaction: (fn: any) => session.db.transaction(fn),
}));
vi.mock("../../api/_lib/clerkWebhook", () => ({
  authenticateVerifiedRequest: async () => session.actor,
}));
import handler from "../../api/_lib/identityHandler";
type DatabaseRow = {
  status?: string;
  kyc_documents?: unknown;
  encrypted_data?: Uint8Array;
  kyc_status?: string;
  n?: number;
};
it("persists the complete private identity lifecycle against embedded PostgreSQL", async () => {
  const db = new PGlite();
  session.db = db;
  const owner = "11111111-1111-4111-8111-111111111111",
    staff = "22222222-2222-4222-8222-222222222222",
    legacy = "33333333-3333-4333-8333-333333333333";
  session.actor = owner;
  vi.stubEnv(
    "KYC_DOCUMENT_ENCRYPTION_KEY",
    Buffer.alloc(32, 8).toString("base64"),
  );
  try {
    await db.exec(
      `CREATE TABLE profiles(id uuid PRIMARY KEY,username text UNIQUE,nationality text,kyc_status text DEFAULT 'Pending',kyc_documents jsonb DEFAULT '{}',updated_at timestamptz DEFAULT now());CREATE TABLE user_roles(user_id uuid,role text);INSERT INTO profiles(id,username) VALUES ('${owner}','owner'),('${staff}','staff');INSERT INTO profiles(id,username,kyc_status,kyc_documents) VALUES ('${legacy}','legacy','Verified','{"front":{"url":"https://old-public.example/id.png"}}');INSERT INTO user_roles VALUES ('${staff}','admin');`,
    );
    const migration = fs.readFileSync(
      new URL(
        "../../neon/015_private_identity_verification.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    assert.equal(
      (
        await db.query<DatabaseRow>(
          "SELECT status FROM identity_cases WHERE user_id=$1",
          [legacy],
        )
      ).rows[0].status,
      "Verified",
    );
    assert.deepEqual(
      (
        await db.query<DatabaseRow>(
          "SELECT kyc_documents FROM profiles WHERE id=$1",
          [legacy],
        )
      ).rows[0].kyc_documents,
      {},
    );

    async function request(action: string, body?: unknown, params = "") {
      const headers: Record<string, string> = {};
      let data: any;
      const res = {
        statusCode: 200,
        setHeader: (k, v) => (headers[k] = v),
        end: (value) => (data = value),
      };
      await handler(
        {
          headers: {},
          method: body === undefined ? "GET" : "POST",
          url: `/api/system?route=identity&action=${action}${params}`,
          body,
        } as any,
        res as any,
      );
      return {
        status: res.statusCode,
        headers,
        data:
          headers["Content-Type"] === "application/json"
            ? JSON.parse(data)
            : data,
      };
    }
    const details = {
      username: "owner",
      firstName: "Sam",
      lastName: "Marks",
      dob: "1995-01-01",
      country: "Kenya",
      phone: "+254712345678",
      address: "Main Street, Nairobi",
    };
    assert.equal((await request("profile", { details })).status, 200);
    const image = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
      "base64",
    );
    for (const slot of ["front", "back"]) {
      const result = await request("upload", {
        slot,
        name: `${slot}.png`,
        documentType: "national_id",
        mimeType: "image/png",
        data: image.toString("base64"),
      });
      assert.equal(result.status, 200);
      assert.equal(result.data.verification.status, "Draft");
      assert.equal("url" in result.data.verification.documents[0], false);
    }
    const stored = (
      await db.query<DatabaseRow>(
        "SELECT encrypted_data FROM identity_documents WHERE user_id=$1 LIMIT 1",
        [owner],
      )
    ).rows[0].encrypted_data;
    assert.notDeepEqual(Buffer.from(stored), image);
    let result = await request("document", undefined, "&slot=front");
    assert.equal(result.status, 200);
    assert.deepEqual(result.data, image);
    assert.equal(result.headers["Cache-Control"], "private, no-store");
    assert.equal((await request("queue")).status, 403);
    assert.equal(
      (await request("document", undefined, `&slot=front&userId=${legacy}`))
        .status,
      403,
    );
    assert.equal(
      (
        await request("submit", {
          documentType: "passport",
          documentNumber: "A12345",
          consent: true,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("upload", {
          slot: "front",
          name: "passport.png",
          documentType: "passport",
          mimeType: "image/png",
          data: image.toString("base64"),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request("submit", {
          documentType: "passport",
          documentNumber: "A12345",
          consent: true,
        })
      ).data.verification.status,
      "Submitted",
    );
    assert.equal((await request("remove", { slot: "front" })).status, 409);
    session.actor = staff;
    assert.equal((await request("queue")).status, 200);
    assert.equal(
      (
        await request("review", {
          userId: owner,
          revision: 1,
          decision: "Rejected",
          note: "Please replace the blurred image.",
          confirmed: true,
        })
      ).data.verification.status,
      "Rejected",
    );
    session.actor = owner;
    assert.equal(
      (
        await request("submit", {
          documentType: "passport",
          documentNumber: "A12345",
          consent: true,
        })
      ).data.verification.revision,
      2,
    );
    session.actor = staff;
    assert.equal(
      (
        await request("review", {
          userId: owner,
          revision: 1,
          decision: "Verified",
          confirmed: true,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("review", {
          userId: owner,
          revision: 2,
          decision: "Verified",
          confirmed: true,
        })
      ).data.verification.status,
      "Verified",
    );
    assert.equal(
      (
        await db.query<DatabaseRow>(
          "SELECT kyc_status FROM profiles WHERE id=$1",
          [owner],
        )
      ).rows[0].kyc_status,
      "Verified",
    );
    assert.equal(
      (
        await request("reset", {
          userId: owner,
          revision: 2,
          note: "Legal details require correction.",
          confirmed: true,
        })
      ).data.verification.status,
      "Draft",
    );
    assert.equal(
      (
        await db.query<DatabaseRow>(
          "SELECT count(*)::int AS n FROM identity_documents WHERE user_id=$1",
          [owner],
        )
      ).rows[0].n,
      0,
    );
    assert.equal(
      (
        await db.query<DatabaseRow>(
          "SELECT kyc_status FROM profiles WHERE id=$1",
          [owner],
        )
      ).rows[0].kyc_status,
      "Pending",
    );
    assert.ok(
      (
        await db.query<DatabaseRow>(
          "SELECT count(*)::int AS n FROM identity_audit",
        )
      ).rows[0].n >= 9,
    );
    // A storage configuration failure rolls back the attempted upload.
    session.actor = owner;
    vi.stubEnv("KYC_DOCUMENT_ENCRYPTION_KEY", "");
    assert.equal(
      (
        await request("upload", {
          slot: "front",
          name: "front.png",
          documentType: "passport",
          mimeType: "image/png",
          data: image.toString("base64"),
        })
      ).status,
      503,
    );
    assert.equal(
      (
        await db.query<DatabaseRow>(
          "SELECT count(*)::int AS n FROM identity_documents WHERE user_id=$1",
          [owner],
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await db.close();
    vi.unstubAllEnvs();
  }
}, 30000);
