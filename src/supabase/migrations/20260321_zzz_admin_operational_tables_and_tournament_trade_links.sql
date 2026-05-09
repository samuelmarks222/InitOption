create extension if not exists pgcrypto;

create table if not exists public.assets_config (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  name text not null,
  category text not null,
  status text not null default 'active',
  min_trade numeric not null default 1,
  max_trade numeric not null default 5000,
  payout_pct numeric not null default 85,
  spread numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assets_config
  add column if not exists symbol text,
  add column if not exists name text,
  add column if not exists category text,
  add column if not exists status text not null default 'active',
  add column if not exists min_trade numeric not null default 1,
  add column if not exists max_trade numeric not null default 5000,
  add column if not exists payout_pct numeric not null default 85,
  add column if not exists spread numeric not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.assets_config
set
  name = coalesce(nullif(name, ''), symbol),
  category = coalesce(nullif(category, ''), 'OTC'),
  status = coalesce(nullif(status, ''), 'active'),
  updated_at = now()
where
  name is null
  or category is null
  or status is null
  or name = ''
  or category = ''
  or status = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assets_config_symbol_key'
  ) then
    alter table public.assets_config
      add constraint assets_config_symbol_key unique (symbol);
  end if;
end $$;

create index if not exists assets_config_status_idx
  on public.assets_config(status);

create table if not exists public.crypto_payment_methods (
  id uuid primary key default gen_random_uuid(),
  coin_name text not null,
  symbol text not null,
  network text not null,
  wallet_address text,
  qr_code_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crypto_payment_methods
  add column if not exists coin_name text,
  add column if not exists symbol text,
  add column if not exists network text,
  add column if not exists wallet_address text,
  add column if not exists qr_code_url text,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.crypto_payment_methods
set
  status = coalesce(nullif(status, ''), 'active'),
  updated_at = now()
where status is null or status = '';

create index if not exists crypto_payment_methods_status_idx
  on public.crypto_payment_methods(status);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  type text not null,
  reward_value text not null,
  usages integer not null default 0,
  max_usages integer not null default 1000,
  expiry_date timestamptz not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.promo_codes
  add column if not exists code text,
  add column if not exists type text,
  add column if not exists reward_value text,
  add column if not exists usages integer not null default 0,
  add column if not exists max_usages integer not null default 1000,
  add column if not exists expiry_date timestamptz,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now();

update public.promo_codes
set
  code = upper(code),
  usages = greatest(coalesce(usages, 0), 0),
  max_usages = greatest(coalesce(max_usages, 0), 0),
  status = coalesce(nullif(status, ''), 'active')
where
  code is distinct from upper(code)
  or usages is null
  or max_usages is null
  or status is null
  or status = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'promo_codes_code_key'
  ) then
    alter table public.promo_codes
      add constraint promo_codes_code_key unique (code);
  end if;
end $$;

create index if not exists promo_codes_status_expiry_idx
  on public.promo_codes(status, expiry_date);

alter table public.trades
  add column if not exists tournament_participant_id uuid references public.tournament_participants(id) on delete set null;

comment on column public.trades.tournament_participant_id is 'Links a trade to a tournament participant when it was opened in a tournament account.';

create index if not exists trades_tournament_participant_id_idx
  on public.trades(tournament_participant_id)
  where tournament_participant_id is not null;

alter table public.assets_config enable row level security;
alter table public.crypto_payment_methods enable row level security;
alter table public.promo_codes enable row level security;

drop policy if exists "Authenticated users can view active assets" on public.assets_config;
drop policy if exists "Admins can view all assets" on public.assets_config;
drop policy if exists "Admins can insert assets" on public.assets_config;
drop policy if exists "Admins can update assets" on public.assets_config;
drop policy if exists "Admins can delete assets" on public.assets_config;

create policy "Authenticated users can view active assets"
on public.assets_config
for select
to authenticated
using (status = 'active');

create policy "Admins can view all assets"
on public.assets_config
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can insert assets"
on public.assets_config
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can update assets"
on public.assets_config
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can delete assets"
on public.assets_config
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Authenticated users can view active crypto payment methods" on public.crypto_payment_methods;
drop policy if exists "Admins can view all crypto payment methods" on public.crypto_payment_methods;
drop policy if exists "Admins can insert crypto payment methods" on public.crypto_payment_methods;
drop policy if exists "Admins can update crypto payment methods" on public.crypto_payment_methods;
drop policy if exists "Admins can delete crypto payment methods" on public.crypto_payment_methods;

create policy "Authenticated users can view active crypto payment methods"
on public.crypto_payment_methods
for select
to authenticated
using (status = 'active');

create policy "Admins can view all crypto payment methods"
on public.crypto_payment_methods
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can insert crypto payment methods"
on public.crypto_payment_methods
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can update crypto payment methods"
on public.crypto_payment_methods
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can delete crypto payment methods"
on public.crypto_payment_methods
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Authenticated users can view redeemable promo codes" on public.promo_codes;
drop policy if exists "Admins can view all promo codes" on public.promo_codes;
drop policy if exists "Admins can insert promo codes" on public.promo_codes;
drop policy if exists "Admins can update promo codes" on public.promo_codes;
drop policy if exists "Admins can delete promo codes" on public.promo_codes;

create policy "Authenticated users can view redeemable promo codes"
on public.promo_codes
for select
to authenticated
using (
  status = 'active'
  and expiry_date > now()
  and (max_usages <= 0 or usages < max_usages)
);

create policy "Admins can view all promo codes"
on public.promo_codes
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can insert promo codes"
on public.promo_codes
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can update promo codes"
on public.promo_codes
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "Admins can delete promo codes"
on public.promo_codes
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));

create or replace function public.process_deposit_checkout(
  p_amount numeric,
  p_method text default 'card',
  p_promo_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo public.promo_codes%rowtype;
  v_numeric_value numeric := 0;
  v_promo_bonus numeric := 0;
  v_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Deposit amount must be positive';
  end if;

  if p_promo_id is not null then
    select *
    into v_promo
    from public.promo_codes
    where id = p_promo_id
    for update;

    if not found then
      raise exception 'Promo code not found';
    end if;

    if v_promo.status <> 'active' then
      raise exception 'Promo code is not active';
    end if;

    if v_promo.expiry_date <= now() then
      update public.promo_codes
      set status = 'expired'
      where id = v_promo.id and status <> 'expired';

      raise exception 'Promo code has expired';
    end if;

    if v_promo.max_usages > 0 and coalesce(v_promo.usages, 0) >= v_promo.max_usages then
      update public.promo_codes
      set status = 'expired'
      where id = v_promo.id and status <> 'expired';

      raise exception 'Promo code usage limit reached';
    end if;

    v_numeric_value := coalesce(nullif(regexp_replace(v_promo.reward_value, '[^0-9.]', '', 'g'), ''), '0')::numeric;

    if v_promo.type = 'Percentage' then
      v_promo_bonus := p_amount * (v_numeric_value / 100.0);
    elsif v_promo.type = 'Fixed Bonus' then
      v_promo_bonus := v_numeric_value;
    else
      raise exception 'Unsupported promo code type: %', v_promo.type;
    end if;

    update public.promo_codes
    set
      usages = coalesce(usages, 0) + 1,
      status = case
        when max_usages > 0 and coalesce(usages, 0) + 1 >= max_usages then 'expired'
        else status
      end
    where id = v_promo.id;
  end if;

  v_payload := public.process_deposit_event(
    p_amount,
    v_promo_bonus,
    p_method
  );

  return coalesce(v_payload, '{}'::jsonb)
    || jsonb_build_object(
      'promo_bonus', v_promo_bonus,
      'promo_code_id', p_promo_id
    );
end;
$$;

grant execute on function public.process_deposit_checkout(numeric, text, uuid) to authenticated;

insert into public.assets_config (
  symbol,
  name,
  category,
  min_trade,
  max_trade,
  payout_pct,
  spread,
  status
)
select *
from (
  values
    ('EUR/USD', 'Euro / US Dollar', 'OTC', 1::numeric, 5000::numeric, 85::numeric, 0::numeric, 'active'),
    ('GBP/USD', 'British Pound / US Dollar', 'OTC', 1::numeric, 5000::numeric, 85::numeric, 0::numeric, 'active'),
    ('USD/JPY', 'US Dollar / Japanese Yen', 'OTC', 1::numeric, 5000::numeric, 85::numeric, 0::numeric, 'active'),
    ('BTC', 'Bitcoin', 'CRYPTO', 5::numeric, 10000::numeric, 80::numeric, 0::numeric, 'active'),
    ('ETH', 'Ethereum', 'CRYPTO', 5::numeric, 10000::numeric, 80::numeric, 0::numeric, 'active'),
    ('AAPL', 'Apple Inc.', 'STOCKS', 5::numeric, 5000::numeric, 75::numeric, 0::numeric, 'active'),
    ('TSLA', 'Tesla, Inc.', 'STOCKS', 5::numeric, 5000::numeric, 75::numeric, 0::numeric, 'active'),
    ('XAU/USD', 'Gold', 'COMMODITIES', 5::numeric, 5000::numeric, 78::numeric, 0::numeric, 'active')
) as seed(symbol, name, category, min_trade, max_trade, payout_pct, spread, status)
where not exists (
  select 1
  from public.assets_config
  limit 1
)
on conflict (symbol) do nothing;

insert into public.crypto_payment_methods (
  coin_name,
  symbol,
  network,
  wallet_address,
  qr_code_url,
  status
)
select *
from (
  values
    ('Bitcoin', 'BTC', 'Bitcoin', '', null, 'active'),
    ('Ethereum', 'ETH', 'ERC20', '', null, 'active'),
    ('Tether USD', 'USDT', 'TRC20', '', null, 'active'),
    ('Tether USD', 'USDT', 'ERC20', '', null, 'active'),
    ('Binance Coin', 'BNB', 'BEP20', '', null, 'active'),
    ('Solana', 'SOL', 'Solana', '', null, 'active'),
    ('XRP', 'XRP', 'Ripple', '', null, 'active'),
    ('USD Coin', 'USDC', 'ERC20', '', null, 'active'),
    ('USD Coin', 'USDC', 'TRC20', '', null, 'active'),
    ('Cardano', 'ADA', 'Cardano', '', null, 'active'),
    ('Avalanche', 'AVAX', 'C-Chain', '', null, 'active'),
    ('Dogecoin', 'DOGE', 'Dogecoin', '', null, 'active'),
    ('Polkadot', 'DOT', 'Polkadot', '', null, 'active'),
    ('Polygon', 'MATIC', 'Polygon', '', null, 'active'),
    ('Litecoin', 'LTC', 'Litecoin', '', null, 'active'),
    ('Shiba Inu', 'SHIB', 'ERC20', '', null, 'active'),
    ('TRON', 'TRX', 'TRC20', '', null, 'active'),
    ('Chainlink', 'LINK', 'ERC20', '', null, 'active'),
    ('Uniswap', 'UNI', 'ERC20', '', null, 'active'),
    ('Toncoin', 'TON', 'TON', '', null, 'active')
) as seed(coin_name, symbol, network, wallet_address, qr_code_url, status)
where not exists (
  select 1
  from public.crypto_payment_methods
  limit 1
);
