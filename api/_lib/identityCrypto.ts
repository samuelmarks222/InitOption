import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function key() {
  const raw = process.env.KYC_DOCUMENT_ENCRYPTION_KEY?.trim() ?? "";
  const value = Buffer.from(raw, "base64");
  if (value.length !== 32 || value.toString("base64") !== raw)
    throw Object.assign(
      new Error(
        "Identity document storage is not configured. Contact support.",
      ),
      { status: 503 },
    );
  return value;
}
export function encryptIdentityDocument(
  data: Buffer,
  owner: string,
  slot: string,
) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(`${owner}:${slot}`));
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}
export function decryptIdentityDocument(
  data: Buffer,
  owner: string,
  slot: string,
) {
  const decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
  decipher.setAAD(Buffer.from(`${owner}:${slot}`));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]);
}
