import {
  normalizeCryptoWebhookPayload,
  parseFormEncodedWebhookBody,
  signCoinPaymentsLegacyIpnPayload,
  signCoinPaymentsPayload,
  signCryptoWebhookPayload,
  signNowPaymentsPayload,
  signPlisioPayload,
  verifyCoinPaymentsLegacyIpnSignature,
  verifyCoinPaymentsPayloadSignature,
  verifyCryptoWebhookSignature,
  verifyNowPaymentsSignature,
  verifyPlisioSignature,
} from "@/lib/cryptoWebhook";

describe("crypto webhook helpers", () => {
  it("normalizes alternate provider field names", () => {
    const payload = normalizeCryptoWebhookPayload({
      confirmedAmountUsd: "ignore-me",
      confirmationsCount: "6",
      currency: "USDT",
      depositAddress: "TNX123",
      destinationTag: "USER-42",
      id: "evt_123",
      provider: "gateway-x",
      status: "confirmed",
      transactionHash: "0xabc123",
      usdAmount: "250.50",
    });

    expect(payload).toEqual({
      address: "TNX123",
      amountAsset: null,
      amountAssetSymbol: "USDT",
      amountUsd: 250.5,
      confirmations: 6,
      eventStatus: "confirmed",
      externalEventId: "evt_123",
      memoValue: "USER-42",
      paymentMethodId: null,
      providerName: "gateway-x",
      txHash: "0xabc123",
    });
  });

  it("verifies the HMAC signature against the raw request body", () => {
    const rawBody = JSON.stringify({
      address: "rXrpAddress",
      memo: "A1B2C3",
      txHash: "TX-123",
    });
    const secret = "super-secret-key";
    const signature = signCryptoWebhookPayload(rawBody, secret);

    expect(verifyCryptoWebhookSignature(rawBody, signature, secret)).toBe(true);
    expect(verifyCryptoWebhookSignature(rawBody, `sha256=${signature}`, secret)).toBe(true);
    expect(verifyCryptoWebhookSignature(rawBody, signature, "wrong-secret")).toBe(false);
  });

  it("normalizes CoinPayments legacy IPN fields", () => {
    const payload = parseFormEncodedWebhookBody(
      "ipn_type=deposit&merchant=merchant-123&deposit_id=dep_456&txn_id=tx_789&address=TXYZ123&dest_tag=MEMO42&status=100&status_text=Payment+Complete&currency=USDT.TRC20&confirms=8&amount=150.25&fiat_amount=150.25",
    );

    expect(normalizeCryptoWebhookPayload(payload)).toEqual({
      address: "TXYZ123",
      amountAsset: 150.25,
      amountAssetSymbol: "USDT.TRC20",
      amountUsd: 150.25,
      confirmations: 8,
      eventStatus: "confirmed",
      externalEventId: "dep_456",
      memoValue: "MEMO42",
      paymentMethodId: null,
      providerName: "coinpayments",
      txHash: "tx_789",
    });
  });

  it("verifies CoinPayments legacy IPN HMAC signatures", () => {
    const rawBody = "merchant=merchant-123&txn_id=tx_789&address=TXYZ123&status=100";
    const secret = "coinpayments-ipn-secret";
    const signature = signCoinPaymentsLegacyIpnPayload(rawBody, secret);

    expect(verifyCoinPaymentsLegacyIpnSignature(rawBody, signature, secret)).toBe(true);
    expect(verifyCoinPaymentsLegacyIpnSignature(rawBody, signature, "wrong-secret")).toBe(false);
  });

  it("verifies CoinPayments v2 signatures", () => {
    const rawBody = JSON.stringify({
      data: {
        hash: "0xcp123",
        networkAddress: "0xwallet123",
      },
      eventId: "evt_123",
      status: "confirmed",
    });
    const signature = signCoinPaymentsPayload({
      clientId: "cp-client-id",
      method: "POST",
      rawBody,
      secret: "cp-client-secret",
      timestamp: "2026-03-24T15:45:00",
      url: "https://example.com/api/crypto/webhook",
    });

    expect(
      verifyCoinPaymentsPayloadSignature({
        clientId: "cp-client-id",
        method: "POST",
        rawBody,
        secret: "cp-client-secret",
        signature,
        timestamp: "2026-03-24T15:45:00",
        url: "https://example.com/api/crypto/webhook",
      }),
    ).toBe(true);

    expect(
      verifyCoinPaymentsPayloadSignature({
        clientId: "cp-client-id",
        method: "POST",
        rawBody,
        secret: "wrong-secret",
        signature,
        timestamp: "2026-03-24T15:45:00",
        url: "https://example.com/api/crypto/webhook",
      }),
    ).toBe(false);
  });

  it("verifies NOWPayments signatures using sorted payload keys", () => {
    const secret = "nowpayments-ipn-secret";
    const originalPayload = {
      nested: {
        b: "second",
        a: "first",
      },
      pay_address: "TNOW123",
      payment_id: 123456789,
      payment_status: "finished",
      price_amount: 120.5,
      price_currency: "usd",
    };

    const signature = signNowPaymentsPayload(originalPayload, secret);
    const reorderedPayload = {
      payment_status: "finished",
      price_currency: "usd",
      payment_id: 123456789,
      pay_address: "TNOW123",
      nested: {
        a: "first",
        b: "second",
      },
      price_amount: 120.5,
    };

    expect(verifyNowPaymentsSignature(reorderedPayload, signature, secret)).toBe(true);
    expect(verifyNowPaymentsSignature(reorderedPayload, signature, "wrong-secret")).toBe(false);
  });

  it("normalizes NOWPayments payloads and falls back to payment id when tx hash is absent", () => {
    const payload = normalizeCryptoWebhookPayload({
      actually_paid: 15,
      actually_paid_at_fiat: 0,
      pay_address: "TNOW123",
      pay_amount: 15,
      pay_currency: "trx",
      payment_id: 123456789,
      payment_status: "finished",
      price_amount: 1,
      price_currency: "usd",
      purchase_id: "order_123",
    });

    expect(payload).toEqual({
      address: "TNOW123",
      amountAsset: 15,
      amountAssetSymbol: "trx",
      amountUsd: 1,
      confirmations: 1000,
      eventStatus: "confirmed",
      externalEventId: "123456789",
      memoValue: null,
      paymentMethodId: null,
      providerName: "nowpayments",
      txHash: "nowpayments:123456789",
    });
  });

  it("verifies Plisio JSON callback signatures", () => {
    const secret = "plisio-secret-key";
    const payload = {
      amount: "0.0025",
      confirmations: 2,
      currency: "BTC",
      order_number: "dep_123",
      source_amount: "150.00",
      source_currency: "USD",
      status: "pending",
      txn_id: "plisio_txn_123",
    };
    const signature = signPlisioPayload(payload, secret);

    expect(verifyPlisioSignature({ ...payload, verify_hash: signature }, signature, secret)).toBe(true);
    expect(verifyPlisioSignature({ ...payload, verify_hash: signature }, signature, "wrong-secret")).toBe(false);
  });

  it("normalizes Plisio callbacks using the invoice order number", () => {
    const payload = normalizeCryptoWebhookPayload({
      amount: "0.0025",
      confirmations: 3,
      currency: "BTC",
      ipn_type: "invoice",
      order_name: "Platform deposit",
      order_number: "dep_123",
      source_amount: "150.00",
      source_currency: "USD",
      status: "completed",
      txn_id: "plisio_txn_123",
      verify_hash: "signature",
    });

    expect(payload).toEqual({
      address: "plisio:dep_123",
      amountAsset: 0.0025,
      amountAssetSymbol: "BTC",
      amountUsd: 150,
      confirmations: 3,
      eventStatus: "confirmed",
      externalEventId: "plisio_txn_123",
      memoValue: null,
      paymentMethodId: null,
      providerName: "plisio",
      txHash: "plisio_txn_123",
    });
  });
});
