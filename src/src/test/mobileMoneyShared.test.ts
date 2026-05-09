import { describe, expect, it } from "vitest";
import { convertUsdToKesAmount, maskKenyanPhoneNumber, normalizeKenyanPhoneNumber } from "@/lib/mobileMoneyShared";

describe("mobile money helpers", () => {
  it("normalizes common Kenyan phone formats into 254 format", () => {
    expect(normalizeKenyanPhoneNumber("0712345678")).toBe("254712345678");
    expect(normalizeKenyanPhoneNumber("712345678")).toBe("254712345678");
    expect(normalizeKenyanPhoneNumber("+254712345678")).toBe("254712345678");
  });

  it("rejects invalid Kenyan phone numbers", () => {
    expect(normalizeKenyanPhoneNumber("12345")).toBeNull();
    expect(normalizeKenyanPhoneNumber("079123")).toBeNull();
  });

  it("masks normalized phone numbers safely", () => {
    expect(maskKenyanPhoneNumber("0712345678")).toBe("254712*****78");
  });

  it("converts usd values to kes using the configured rate", () => {
    expect(convertUsdToKesAmount(50)).toBe(6475);
    expect(convertUsdToKesAmount(0)).toBe(0);
  });
});
