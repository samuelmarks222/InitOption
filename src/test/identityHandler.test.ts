// @vitest-environment node
import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn() }));
vi.mock("../../api/_lib/clerkWebhook", () => ({
  authenticateVerifiedRequest: mocks.auth,
}));
vi.mock("../../api/_lib/db", () => ({
  transaction: async (fn: any) => fn({ query: mocks.query }),
}));
import handler from "../../api/_lib/identityHandler";
const owner = "11111111-1111-4111-8111-111111111111",
  staff = "22222222-2222-4222-8222-222222222222";
let status = "Draft",
  revision = 1,
  hasRole = false,
  slots = ["front", "back"];
const details = {
  username: "trader.1",
  firstName: "Sam",
  lastName: "Marks",
  dob: "1995-01-01",
  country: "Kenya",
  phone: "+254712345678",
  address: "Main Street, Nairobi",
};
beforeEach(() => {
  status = "Draft";
  revision = 1;
  hasRole = false;
  slots = ["front", "back"];
  mocks.auth.mockReset().mockResolvedValue(owner);
  mocks.query.mockReset().mockImplementation(async (sql: string) => {
    if (sql.includes("FROM public.user_roles"))
      return { rows: hasRole ? [{}] : [] };
    if (sql.startsWith("SELECT id,kyc_status"))
      return { rows: [{ id: owner, kyc_status: "Pending" }] };
    if (sql.startsWith("SELECT * FROM public.identity_cases"))
      return {
        rows: [
          {
            status,
            revision,
            identity: { documentType: "national_id", details },
          },
        ],
      };
    if (sql.startsWith("SELECT details")) return { rows: [{ details }] };
    if (sql.startsWith("SELECT slot FROM"))
      return { rows: slots.map((slot) => ({ slot })) };
    return { rows: [] };
  });
});
async function request(action: string, body?: unknown, params = "") {
  const res: any = { statusCode: 200, setHeader: vi.fn(), end: vi.fn() };
  await handler(
    {
      headers: { authorization: "Bearer token" },
      method: body === undefined ? "GET" : "POST",
      url: `/api/system?route=identity&action=${action}${params}`,
      body,
    } as any,
    res,
  );
  return {
    res,
    status: res.statusCode,
    payload: JSON.parse(res.end.mock.calls[0][0]),
  };
}
const mutations = () =>
  mocks.query.mock.calls.filter(([sql]) => /^(UPDATE|INSERT|DELETE)/.test(sql));
describe("identity API authorization and lifecycle guards", () => {
  it("rejects unverified sessions before touching the database", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await request("status")).status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("denies queue access to non-reviewers", async () => {
    expect((await request("queue")).status).toBe(403);
    expect(mutations()).toHaveLength(0);
  });
  it("denies document access for another user without reviewer role", async () => {
    expect(
      (await request("document", undefined, `&userId=${staff}&slot=front`))
        .status,
    ).toBe(403);
    expect(mutations()).toHaveLength(0);
  });
  it("never trusts a supplied account ID for personal detail edits", async () => {
    await request("profile", { details, userId: staff });
    const update = mocks.query.mock.calls.find(([sql]) =>
      sql.startsWith("UPDATE public.profiles"),
    );
    expect(update?.[1][0]).toBe(owner);
  });
  for (const locked of ["Submitted", "Verified"])
    it(`locks document changes for ${locked} cases`, async () => {
      status = locked;
      expect((await request("remove", { slot: "front" })).status).toBe(409);
      expect(
        mocks.query.mock.calls.some(([sql]) => sql.startsWith("DELETE")),
      ).toBe(false);
    });
  it("rejects forged image contents", async () => {
    expect(
      (
        await request("upload", {
          slot: "front",
          name: "id.jpg",
          documentType: "national_id",
          mimeType: "image/jpeg",
          data: Buffer.from("<script>not-an-image</script>").toString("base64"),
        })
      ).status,
    ).toBe(400);
    expect(
      mocks.query.mock.calls.some(([sql]) =>
        sql.startsWith("INSERT INTO public.identity_documents"),
      ),
    ).toBe(false);
  });
  it("rejects incomplete multi-sided documents", async () => {
    slots = ["front"];
    expect(
      (
        await request("submit", {
          documentType: "national_id",
          documentNumber: "123456",
          consent: true,
        })
      ).status,
    ).toBe(400);
    expect(
      mocks.query.mock.calls.some(([sql]) =>
        sql.startsWith("UPDATE public.identity_cases"),
      ),
    ).toBe(false);
  });
  it("records submission as pending, never verified, and snapshots saved details", async () => {
    expect(
      (
        await request("submit", {
          documentType: "passport",
          documentNumber: "A1234",
          consent: true,
        })
      ).status,
    ).toBe(200);
    const update = mocks.query.mock.calls.find(([sql]) =>
      sql.startsWith("UPDATE public.identity_cases"),
    );
    expect(update?.[0]).toContain("status='Submitted'");
    expect(JSON.parse(update?.[1][1]).details).toEqual(details);
    expect(
      mocks.query.mock.calls.some(([sql]) =>
        sql.includes("kyc_status='Pending'"),
      ),
    ).toBe(true);
  });
  it("requires a current revision, staff role and explicit review attestation", async () => {
    hasRole = true;
    status = "Submitted";
    mocks.auth.mockResolvedValue(staff);
    expect(
      (
        await request("review", {
          userId: owner,
          revision: 0,
          decision: "Verified",
          confirmed: true,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await request("review", {
          userId: owner,
          revision,
          decision: "Verified",
          confirmed: false,
        })
      ).status,
    ).toBe(400);
  });
  it("prevents self-approval even for staff", async () => {
    hasRole = true;
    status = "Submitted";
    expect(
      (
        await request("review", {
          userId: owner,
          revision,
          decision: "Verified",
          confirmed: true,
        })
      ).status,
    ).toBe(403);
  });
  it("requires actionable rejection feedback", async () => {
    hasRole = true;
    status = "Submitted";
    mocks.auth.mockResolvedValue(staff);
    expect(
      (
        await request("review", {
          userId: owner,
          revision,
          decision: "Rejected",
          note: "No",
          confirmed: true,
        })
      ).status,
    ).toBe(400);
  });
  it("writes the staff decision and an audit event together", async () => {
    hasRole = true;
    status = "Submitted";
    mocks.auth.mockResolvedValue(staff);
    expect(
      (
        await request("review", {
          userId: owner,
          revision,
          decision: "Verified",
          confirmed: true,
        })
      ).status,
    ).toBe(200);
    expect(
      mocks.query.mock.calls.some(
        ([sql, args]) =>
          sql.startsWith("UPDATE public.profiles") && args[1] === "Verified",
      ),
    ).toBe(true);
    expect(
      mocks.query.mock.calls.some(
        ([sql, args]) =>
          sql.startsWith("INSERT INTO public.identity_audit") &&
          args[2] === "Verified",
      ),
    ).toBe(true);
  });
  it("returns a clear unavailable error if the migration is missing", async () => {
    mocks.query.mockRejectedValue(
      Object.assign(new Error("missing"), { code: "42P01" }),
    );
    expect((await request("status")).status).toBe(503);
  });
});
