-- Private server-owned pricing state. Never add these tables to the browser DB allowlist.
CREATE TABLE IF NOT EXISTS public.otc_markets (
  symbol text PRIMARY KEY,
  session text NOT NULL,
  secret text NOT NULL,
  config jsonb NOT NULL,
  model jsonb NOT NULL,
  last_slot bigint NOT NULL,
  pruned_slot bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.otc_ticks (
  symbol text NOT NULL REFERENCES public.otc_markets(symbol),
  slot bigint NOT NULL,
  price numeric(30,10) NOT NULL CHECK (price > 0),
  PRIMARY KEY (symbol,slot)
);
ALTER TABLE public.otc_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otc_ticks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.otc_markets FROM PUBLIC;
REVOKE ALL ON public.otc_ticks FROM PUBLIC;
CREATE TABLE IF NOT EXISTS public.otc_bars (
  symbol text NOT NULL REFERENCES public.otc_markets(symbol),
  bucket_slot bigint NOT NULL,
  open numeric(30,10) NOT NULL,
  high numeric(30,10) NOT NULL,
  low numeric(30,10) NOT NULL,
  close numeric(30,10) NOT NULL,
  volume bigint NOT NULL,
  PRIMARY KEY(symbol,bucket_slot)
);
ALTER TABLE public.otc_bars ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.otc_bars FROM PUBLIC;
