// @vitest-environment node
import { Readable } from "node:stream";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const owner = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({
  verified: vi.fn(),
  query: vi.fn(),
  queryOne: vi.fn(),
}));
vi.mock("../../api/_lib/db", () => ({
  transaction: async (fn: any) => fn({ query: mocks.query }),
  query: mocks.query,
  queryOne: mocks.queryOne,
  userRpc: vi.fn(),
  testDbConnection: async () => ({ ok: true }),
}));
vi.mock("../../api/_lib/clerkWebhook", () => ({
  authenticateVerifiedRequest: mocks.verified,
  authenticateRequest: async () => "11111111-1111-4111-8111-111111111111",
  authenticateWithUid: async () => ({
    uid: "11111111-1111-4111-8111-111111111111",
    uuid: "11111111-1111-4111-8111-111111111111",
  }),
  clerkUserIdToUuid: (id: string) => id,
}));
vi.mock("../../src/lib/pusherServer", () => ({ pusherServer: {} }));
import { handleProfile, handleDb } from "../../api/_lib/newApi";
beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgres://test-only");
  mocks.verified.mockReset().mockResolvedValue(owner);
  mocks.query.mockReset().mockResolvedValue({ rows: [] });
  mocks.queryOne.mockReset().mockResolvedValue(null);
});
afterEach(() => vi.unstubAllEnvs());
async function request(
  handler: typeof handleProfile,
  method: string,
  body: unknown,
  query: Record<string, string> = {},
) {
  const req: any = Readable.from([JSON.stringify(body)]);
  req.method = method;
  req.headers = {};
  req.query = query;
  req.url = "/api/db/profiles";
  const res: any = { statusCode: 200, setHeader: vi.fn(), end: vi.fn() };
  await handler(req, res);
  return {
    status: res.statusCode,
    payload: JSON.parse(res.end.mock.calls[0][0]),
  };
}
describe("legacy identity write and data escape guards", () => {
  it("blocks direct KYC status updates through the profile endpoint", async () =>
    expect(
      (await request(handleProfile, "PATCH", { kyc_status: "Verified" }))
        .status,
    ).toBe(403));
  it("does not accept the legacy unverified identity fallback for profile requests", async () => {
    mocks.verified.mockResolvedValue(null);
    expect(
      (await request(handleProfile, "PATCH", { username: "test" })).status,
    ).toBe(401);
  });
  it("blocks KYC status/document writes through generic profile CRUD", async () => {
    for (const field of ["kyc_status", "kyc_documents"])
      expect(
        (
          await request(
            handleDb,
            "PATCH",
            { values: { [field]: "Verified" } },
            { __dbpath: "profiles" },
          )
        ).status,
      ).toBe(403);
  });
  it("blocks private identity tables and embedded private-table reads", async () => {
    expect(
      (await request(handleDb, "GET", {}, { __dbpath: "identity_documents" }))
        .status,
    ).toBe(400);
    expect(
      (
        await request(
          handleDb,
          "GET",
          {},
          { __dbpath: "profiles", select: "identity_cases(identity)" },
        )
      ).status,
    ).toBe(400);
  });
  it("blocks self-granted reviewer roles", async () =>
    expect(
      (
        await request(
          handleDb,
          "POST",
          { values: { user_id: owner, role: "admin" } },
          { __dbpath: "user_roles" },
        )
      ).status,
    ).toBe(403));
  it("prevents moving a verified profile to a different account ID", async () =>
    expect(
      (
        await request(
          handleDb,
          "PATCH",
          { values: { id: owner } },
          { __dbpath: "profiles" },
        )
      ).status,
    ).toBe(403));
  it("forces non-admin profile edits to the verified owner even with broad filters", async () => {
    await request(
      handleDb,
      "PATCH",
      { values: { username: "updated" }, filters: [] },
      { __dbpath: "profiles" },
    );
    const update = mocks.query.mock.calls.find(([sql]) =>
      sql.startsWith("update public.profiles"),
    );
    expect(update?.[0]).toContain('"id" =');
    expect(update?.[1]).toContain(owner);
  });
});
