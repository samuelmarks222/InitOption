-- MANUAL RECOVERY ONLY. Not a migration; never run automatically.
-- Stop all pricing writers first using OTC_PRICING_PAUSED=true on the deployed
-- backend, disable the external scheduler, and allow in-flight requests to finish.
-- Export/verify otc_ticks, otc_bars, otc_markets and trades to external storage first.
-- otc_markets contains private pricing secrets: never commit or share that backup.
-- Change the acknowledgement below to 'true' ONLY after verifying that backup.
-- TRUNCATE permanently removes ALL raw-tick history. No CASCADE and no other table.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';
SET LOCAL initoption.verified_external_backup = 'false';

DO $$
BEGIN
  IF current_setting('initoption.verified_external_backup', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Stopped: verify an external backup and explicitly acknowledge it first';
  END IF;
END $$;

-- Freeze trade changes and tick writes while checking settlement evidence.
LOCK TABLE public.otc_markets IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.trades IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.otc_ticks IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.trades AS trade
    WHERE trade.status = 'open'
      AND EXISTS (
        SELECT 1 FROM public.otc_ticks AS tick
        WHERE tick.symbol = trade.asset_symbol
          AND tick.slot BETWEEN
            floor(extract(epoch FROM (trade.opened_at + trade.expiry_seconds * interval '1 second')) * 10)::bigint - 5
            AND floor(extract(epoch FROM (trade.opened_at + trade.expiry_seconds * interval '1 second')) * 10)::bigint
      )
  ) THEN
    RAISE EXCEPTION 'Stopped: open trades have retained expiry-window ticks; preserve their evidence before cleanup';
  END IF;
END $$;

TRUNCATE TABLE ONLY public.otc_ticks;
COMMIT;

SELECT pg_size_pretty(pg_total_relation_size('public.otc_ticks')) AS raw_tick_size_after;
