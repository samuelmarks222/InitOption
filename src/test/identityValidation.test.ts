import { describe, it, expect } from "vitest";
import {
  validateAccount,
  validateIdentity,
  requiredIdentitySlots,
} from "@/lib/identityValidation";
const details = {
  username: "trader.1",
  firstName: "Sam",
  lastName: "Marks",
  dob: "1995-02-28",
  country: "Kenya",
  phone: "+254712345678",
  address: "Main Street, Nairobi",
};
describe("identity validation", () => {
  it("normalizes server-bound details and discards untrusted extra fields", () =>
    expect(
      validateAccount({
        ...details,
        firstName: " Sam ",
        kyc_status: "Verified",
      }),
    ).toEqual(details));
  for (const dob of ["2015-01-01", "2026-02-30", "1900-01-01", "not-a-date"])
    it(`rejects invalid or underage date ${dob}`, () =>
      expect(() =>
        validateAccount({ ...details, dob }, new Date("2026-11-04")),
      ).toThrow());
  it("accepts an adult on their eighteenth birthday, but not the day before", () => {
    expect(() =>
      validateAccount(
        { ...details, dob: "2008-11-04" },
        new Date("2026-11-04"),
      ),
    ).not.toThrow();
    expect(() =>
      validateAccount(
        { ...details, dob: "2008-11-05" },
        new Date("2026-11-04"),
      ),
    ).toThrow();
  });
  for (const phone of ["0712345678", "+2------", "+1234567890123456"])
    it(`rejects invalid phone ${phone}`, () =>
      expect(() => validateAccount({ ...details, phone })).toThrow());
  it("requires explicit consent and a supported document type", () => {
    expect(() =>
      validateIdentity({
        documentType: "passport",
        documentNumber: "A1234",
        consent: false,
      }),
    ).toThrow();
    expect(() =>
      validateIdentity({
        documentType: "fake",
        documentNumber: "A1234",
        consent: true,
      }),
    ).toThrow();
    expect(
      validateIdentity({
        documentType: "passport",
        documentNumber: " A1234 ",
        consent: true,
      }),
    ).toEqual({ documentType: "passport", documentNumber: "A1234" });
  });
  it("requires only the photo page for passports, both sides for ID cards/licences", () => {
    expect(requiredIdentitySlots("passport")).toEqual(["front"]);
    expect(requiredIdentitySlots("national_id")).toEqual(["front", "back"]);
    expect(requiredIdentitySlots("driving_licence")).toEqual(["front", "back"]);
  });
});
