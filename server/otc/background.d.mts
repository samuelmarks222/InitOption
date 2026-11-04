import type { PoolClient } from 'pg';
import type { OTCCollectionStatus, OTCCollectionResult, OTCCollectionCycle } from '../../src/types/otcCollection.js';
export function createOTCBackground(options: {
  transaction: <T>(work: (client: PoolClient) => Promise<T>) => Promise<T>;
  assets: Record<string, unknown>;
  collect: () => Promise<OTCCollectionResult>;
}): {
  status(): Promise<OTCCollectionStatus>;
  setEnabled(enabled: boolean, userId: string): Promise<OTCCollectionStatus>;
  run(options?: {scheduled?:boolean}): Promise<OTCCollectionCycle>;
};
