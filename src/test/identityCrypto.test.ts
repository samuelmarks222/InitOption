// @vitest-environment node
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  encryptIdentityDocument,
  decryptIdentityDocument,
} from "../../api/_lib/identityCrypto";
afterEach(() => vi.unstubAllEnvs());
describe("private identity document encryption", () => {
  it("fails closed when its encryption key is missing or invalid", () => {
    for (const value of ["", "not-a-key"]) {
      vi.stubEnv("KYC_DOCUMENT_ENCRYPTION_KEY", value);
      expect(() =>
        encryptIdentityDocument(Buffer.from("private"), "owner", "front"),
      ).toThrow("not configured");
    }
  });
  it("encrypts with fresh nonces and binds ciphertext to owner and document side", () => {
    vi.stubEnv(
      "KYC_DOCUMENT_ENCRYPTION_KEY",
      Buffer.alloc(32, 7).toString("base64"),
    );
    const source = Buffer.from("sensitive document");
    const first = encryptIdentityDocument(source, "owner", "front"),
      second = encryptIdentityDocument(source, "owner", "front");
    expect(first.equals(second)).toBe(false);
    expect(first.includes(source)).toBe(false);
    expect(decryptIdentityDocument(first, "owner", "front")).toEqual(source);
    expect(() =>
      decryptIdentityDocument(first, "other-owner", "front"),
    ).toThrow();
    expect(() => decryptIdentityDocument(first, "owner", "back")).toThrow();
    first[30] ^= 1;
    expect(() => decryptIdentityDocument(first, "owner", "front")).toThrow();
  });
});
