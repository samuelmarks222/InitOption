export interface OTCCollectionResult {
  assets: number;
  processed: { symbol: string; cursor: number; catchingUp: boolean }[];
  errors: { symbol: string; message: string }[];
  remaining: number;
  complete: boolean;
}
export interface OTCCollectionStatus {
  enabled: boolean;
  totalAssets: number;
  initializedAssets: number;
  currentAssets: number;
  uninitializedAssets: number;
  maxLagSeconds: number | null;
  updatedAt: string | null;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastResult: OTCCollectionResult | null;
  lastError: string | null;
  running: boolean;
  serverNow: string;
  schedulerSecretConfigured?: boolean;
}
export type OTCCollectionCycle = { skipped: true; reason: string } | { skipped: false; result: OTCCollectionResult };
