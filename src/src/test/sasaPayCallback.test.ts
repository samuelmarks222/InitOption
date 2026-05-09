import { describe, expect, it } from "vitest";
import { normalizeCallbackPayload } from "../../api/_lib/sasapay.ts";

describe("normalizeCallbackPayload", () => {
  it("maps C2B callback fields from the documented mobile money result payload", () => {
    const payload = normalizeCallbackPayload({
      BillRefNumber: "123e4567-e89b-12d3-a456-426614174000",
      CheckoutRequestID: "542011ce-24a8-4f51-b0e7-c4df09e18d74",
      CustomerMobile: "254700000080",
      MerchantRequestID: "Test callbacks",
      ResultCode: "0",
      ResultDesc: "Transaction processed successfully.",
      ThirdPartyTransID: "SG100011T5G",
      TransAmount: "1.00",
      TransactionCode: "SPEJ0000O78GY2T",
    });

    expect(payload.requestId).toBe("123e4567-e89b-12d3-a456-426614174000");
    expect(payload.providerRequestId).toBe("Test callbacks");
    expect(payload.checkoutId).toBe("542011ce-24a8-4f51-b0e7-c4df09e18d74");
    expect(payload.phoneNumber).toBe("254700000080");
    expect(payload.amountKes).toBe(1);
    expect(payload.resultCode).toBe("0");
    expect(payload.transactionReference).toBe("SPEJ0000O78GY2T");
  });

  it("maps B2C callback fields from the documented payout result payload", () => {
    const payload = normalizeCallbackPayload({
      B2CRequestID: "4040359-0f8d1111-4779-85b3-44e575166f7a",
      CheckoutRequestID: "6f3ebd0d-b892-4c4e-952a-f3eea030af85",
      MerchantTransactionReference: "123e4567-e89b-12d3-a456-426614174111",
      RecipientAccountNumber: "254712345678",
      ResponseDescription: "Transaction is being processed",
      ResultCode: "0",
      SasaPayTransactionCode: "CRVSUVGIRP",
      TransactionAmount: "10.00",
    });

    expect(payload.requestId).toBe("123e4567-e89b-12d3-a456-426614174111");
    expect(payload.providerRequestId).toBe("4040359-0f8d1111-4779-85b3-44e575166f7a");
    expect(payload.checkoutId).toBe("6f3ebd0d-b892-4c4e-952a-f3eea030af85");
    expect(payload.phoneNumber).toBe("254712345678");
    expect(payload.amountKes).toBe(10);
    expect(payload.resultDescription).toBe("Transaction is being processed");
    expect(payload.transactionReference).toBe("CRVSUVGIRP");
  });
});
