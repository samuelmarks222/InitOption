# OTC storage assessment and recovery plan

## Current incident and scope

The production runtime log supplied on 2026-11-06 reports `could not extend file because project size limit (1024 MB) has been exceeded` for OTC requests. The API health and history reads succeeded when checked, but the NATGAS tick request returned the generic storage error. Successful reads do not demonstrate that writes work. Which tables or provider-level resources account for the project quota is **not yet measured**. No database data or quota settings were changed by this assessment.

Lightweight Charts is a browser renderer; it does not require a database. The existing, explicitly synthetic internal OTC service is a separate authoritative price source. Its PostgreSQL state enables different clients and restarted server instances to agree on ticks. The current live-account and demo OTC paths request a server quote for entry and the last tick at or before the expiry for settlement. If an expiry quote is unavailable, settlement waits instead of substituting another price. These are platform-generated OTC prices, not exchange prices.

## Where data is produced

- `otc_markets` holds each symbol's session, private randomness, configuration, and latest model checkpoint. Do not expose or reset it.
- `otc_ticks` holds one decimal price per symbol per 100 ms source slot, keyed by symbol and slot. The normal raw tick retention is 864,000 slots (24 hours) **per market checkpoint**, not necessarily 24 hours from wall-clock time during catch-up. Pruning is attempted only as that symbol advances, and follows the new tick inserts in the same transaction. A full database can therefore fail the insert before it gets to pruning. Dormant symbols are not automatically pruned by a different symbol's request.
- `otc_bars` stores tick-derived five-second OHLC/volume bars. Default retention is 30 days of source slots. Chart history aggregates these bars; OHLC alone cannot recover the precise 100 ms price needed at an arbitrary trade expiry.
- The catalog has 141 symbols, but generation is lazy and the all-asset collector's activation and freshness have not been verified in production. At the maximum rate with **all 141 symbols continuously generated**, the design would create 121,824,000 tick rows and 2,436,480 five-second bars per day before retention. These are capacity estimates, not measured production counts or proof that OTC data alone filled the quota. Database indexes, row overhead, update churn, other application data, and provider-accounted resources also matter.
- The current implementation advances at most 5,000 source slots per request when catching up. If there is a large outage backlog, restoring write capacity alone does not instantly make every symbol current. It must be monitored; do not report a stale price as live.

See `server/otc/serverless.mjs`, `src/lib/otcMarket.ts`, and `src/hooks/useTrading.ts` for the implementation. The default raw retention already limits old expiry lookups: this assessment does not claim that unsettled trades older than that window are recoverable today.

## Read-only capacity measurements

An operator with read-only access to the **actual production pricing database** can run the following. It reports table sizes, not prices, user records, credentials, or private market state. These are current-database figures and may not match a provider's whole-project quota, which may include other resources. Statistics can be approximate. Avoid posting confidential schema names publicly.

```sql
SELECT pg_size_pretty(pg_database_size(current_database())) AS current_database_size;

SELECT schemaname, relname AS table_name,
       pg_size_pretty(pg_relation_size(relid)) AS table_data,
       pg_size_pretty(pg_indexes_size(relid)) AS indexes,
       pg_size_pretty(pg_total_relation_size(relid)) AS total,
       n_live_tup AS estimated_live_rows, n_dead_tup AS estimated_dead_rows
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;
```

Also check the database provider's project-level quota and usage dashboard and confirm which database is actually configured. Do not share `DATABASE_URL`, passwords, private market secrets, access tokens, or full logs containing customer information. If storage is increased, it may have a billing impact and must be approved by the owner.

## Recommended reduced-storage design: lossless tick blocks

Keep the same authoritative generator, 100 ms slots, model/checkpoint, entry/expiry logic, chart source and tick API contract. Add a versioned, lossless block representation that stores batches of original `(slot, decimal price)` values compactly instead of a PostgreSQL row and index entry for every old tick. Keep the current five-second bars for chart history. For example, fixed-duration blocks could encode slot gaps and integer-scaled price deltas; prices must be encoded from the exact stored decimal representation without rounding through JavaScript `Number`. Preserve all digits supported by the database schema, every slot, and gaps. Use bounded, validated decoding, checksums, and versioned formats.

Use immutable completed blocks plus a small durable live tail, rather than repeatedly rewriting a large block on every 100 ms tick. Both must share the existing per-symbol serialization and transaction boundaries with checkpoint and bar writes. Snapshot and cursor reads must merge tail and blocks in the same order and return the same wire format, limits and timestamps. Exact `at` expiry lookup must find the same last tick at/before expiry and enforce the same freshness and retention rules. Keep the existing raw retention window and chart bar retention unless a separate explicit retention decision is approved; no shorter expiry-recovery window is implied by compression.

The number of rows/index entries can be reduced, but the actual byte savings, decoding latency, PostgreSQL write amplification, vacuum behavior, and ability to fit under a 1,024 MB project quota are **unknown until measured**. For scale, even 8 bytes per tick alone would be about 929 MiB per day for all 141 symbols, excluding blocks, indexes, bars, and the rest of the database. A variable-length encoding may do better or worse in practice; it is not a capacity guarantee. Storage, compute, locking and serverless request limits must be load-tested with realistic data before production rollout. This design still needs a shared durable authority and does not make the system storage-free.

### Implementation and rollout gates

1. Obtain a verified backup and assess project quota, per-table usage, open/pending trades, late settlements and available headroom. The size-limit incident may require an approved temporary or permanent quota increase before any writes or migration; compression itself needs working space. Do not delete data, reset checkpoints, change a plan, or promise immediate recovery.
2. Implement a private, versioned block codec and storage layer behind an **off-by-default** flag. Add tests for exact decimal round-trips, gaps, boundary slots, all supported asset precisions, malformed/corrupt blocks, and bounded resource use. Do not encode secrets in blocks or logs.
3. In an isolated production-sized clone, dual-write atomically and backfill without losing concurrently generated ticks or racing retention. Compare every original slot and decimal value against the new representation, including repeated readers and restart/crash/rollback cases. Never delete source rows as part of an unverified backfill. Fail closed on any mismatch or missing block.
4. Exercise snapshot (last 3,001 ticks), incremental cursor pagination, reconnect/catch-up, `at` quotes at/around every block boundary, late expiry settlement, concurrent writers, historical OHLC, and all four Lightweight Charts types. Compare old and new outputs and recorded history; check that execution, payouts and settlement remain identical. Benchmark on realistic symbol counts and outages, including WAL/dead-tuple growth and provider quota behavior.
5. Only after verification, operational review and explicit approval, switch reads gradually with metrics and rollback. Preserve a verified backup and retain source data until a separately approved reclamation plan accounts for unresolved trades and recovery needs. Ordinary `DELETE` may not immediately lower the provider's billed/project storage; provider-specific reclamation can require space or locking. Do not issue bulk deletes, VACUUM FULL, resets, or other maintenance blindly on the full production database.
6. After capacity is restored and any approved change is deployed, verify real production responses and sequence advancement over time, then verify the chart and expiry receipts with appropriate safe test accounts. Monitor quota headroom, price lag, settlement backlog, errors and storage growth. A successful build, fixture test, or health read is not proof of live recovery.

## Approaches not safe as drop-in replacements

- **Candle-only storage:** loses the exact intra-candle expiry tick; it would change the settlement contract.
- **Only store ticks for known open trades:** the current quote endpoint accepts an arbitrary retained `at` timestamp, demo trades can exist only in the browser, and settlements may be delayed. Sparsifying prices without reworking and proving the trade lifecycle can strand a settlement or change its price.
- **Reset the market or advance the checkpoint to the present:** would break continuity and could change execution/expiry outcomes; do not do this.
- **Browser-only movement or a separate chart generator:** would make the visual path diverge from the authoritative trading price.
- **Increase collection frequency alone:** can increase the data and write load; it cannot fix a full database.

This document is an investigation and design proposal, not an implemented or production-validated fix.
