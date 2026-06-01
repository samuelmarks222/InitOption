import { describe, expect, it } from "vitest";
import { convertUsdToKesDepositAmount, convertUsdToKesWithdrawalAmount, maskKenyanPhoneNumber, normalizeKenyanPhoneNumber } from "@/lib/mobileMoneyShared";

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

  it("converts usd to kes deposit using rate 135", () => {
    expect(convertUsdToKesDepositAmount(10)).toBe(1350);
    expect(convertUsdToKesDepositAmount(0)).toBe(0);
  });

  it("converts usd to kes withdrawal using rate 124", () => {
    expect(convertUsdToKesWithdrawalAmount(10)).toBe(1240);
    expect(convertUsdToKesWithdrawalAmount(0)).toBe(0);
  });
});
