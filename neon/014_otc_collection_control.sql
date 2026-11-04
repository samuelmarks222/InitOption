-- Private server-owned control for all-catalog OTC collection. Not browser DB API data.
CREATE TABLE IF NOT EXISTS public.otc_collection_control (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  last_started_at timestamptz,
  last_finished_at timestamptz,
  last_result jsonb,
  last_error text,
  lease_token text,
  lease_until timestamptz
);
INSERT INTO public.otc_collection_control(id) VALUES (true) ON CONFLICT DO NOTHING;
ALTER TABLE public.otc_collection_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.otc_collection_control FROM PUBLIC;
