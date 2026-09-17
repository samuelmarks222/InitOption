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
import { stableUuidFromString } from "./stableUuid";

export const firebaseUidToUuid = (firebaseUid: string): string => {
  return stableUuidFromString(firebaseUid);
};
