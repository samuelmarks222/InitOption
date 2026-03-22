alter table public.profiles
  add column if not exists vip_tier text default 'none',
  add column if not exists vip_tier_override text,
  add column if not exists total_deposit double precision default 0,
  add column if not exists total_trade_volume_30d double precision default 0,
  add column if not exists trade_count_30d integer default 0;

comment on column public.profiles.vip_tier is 'Current automatically calculated VIP tier.';
comment on column public.profiles.vip_tier_override is 'Optional admin override for VIP tier.';
comment on column public.profiles.total_deposit is 'Lifetime deposited amount used by the VIP system.';
comment on column public.profiles.total_trade_volume_30d is 'Rolling 30-day closed trade volume for the VIP system.';
comment on column public.profiles.trade_count_30d is 'Rolling 30-day closed trade count for the VIP system.';
