import crypto from "crypto";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

export const verifyClerkSignature = async (
  payload: string,
  signature: string,
): Promise<boolean> => {
  if (!CLERK_SECRET_KEY) return false;

  try {
    const expectedSignature = "v1=" + crypto
      .createHmac("sha256", CLERK_SECRET_KEY)
      .update(payload, "utf8")
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expectedSignature, "utf8"),
    );
  } catch {
    return false;
  }
};
