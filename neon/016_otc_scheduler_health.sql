-- Authenticated scheduler observations are separate from manual admin cycles.
-- This migration does not install a scheduler or enable billing.
ALTER TABLE public.otc_collection_control
  ADD COLUMN IF NOT EXISTS last_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_scheduled_finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_consecutive_successes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scheduled_last_error text;
