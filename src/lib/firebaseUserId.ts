/**
 * Maps a Firebase user id (uid) to the same stable UUIDv5 the rest of the
 * backend expects. We reuse the exact algorithm previously used for Clerk ids:
 *
 *   uuid = v5(uid, namespace=0x8f2d1a0e-...)
 *
 * so any existing row keyed by uuid(clerkId) simply keeps working for users
 * that are re-created against the same natural key (email); new Firebase users
 * get a deterministic uuid derived from their firebase uid.
 */
import { createHash } from "crypto";

const UUID_V5_NAMESPACE = Buffer.from("8f2d1a0e-6b3c-4d4e-9a9a-1a2b3c4d5e6f", "hex");

export const firebaseUidToUuid = (firebaseUid: string): string => {
  const hash = createHash("sha1")
    .update(Buffer.concat([UUID_V5_NAMESPACE, Buffer.from(firebaseUid, "utf8")]))
    .digest();

  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = hash.subarray(0, 16).toString("hex");
  return (
    [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join("-")
  );
};
