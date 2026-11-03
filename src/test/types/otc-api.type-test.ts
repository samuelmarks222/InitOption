// Compile-only checks for the .mjs API boundary, independent of frontend types.
import { createServerlessOTC } from "../../../server/otc/serverless.mjs";
import { transaction } from "../../../api/_lib/db.js";
const read = createServerlessOTC({
  transaction,
  assets: { AAPL: { price: 212, precision: 8 } },
  maxBatch: 5000,
  warmup: 3000,
  nowForTests: () => Date.now(),
});
void read({ symbol: "AAPL", action: "price", at: 600 });
// @ts-expect-error A transaction executor is mandatory; no process-local price fallback.
createServerlessOTC({ assets: {} });
// @ts-expect-error Reject unknown options rather than hiding the contract behind any.
createServerlessOTC({ transaction, assets: {}, nonexistentOption: true });
// @ts-expect-error Actions are constrained to the two implemented pricing operations.
void read({ symbol: "AAPL", action: "set-price" });
