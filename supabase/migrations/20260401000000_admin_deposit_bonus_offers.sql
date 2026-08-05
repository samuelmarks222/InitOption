create extension if not exists pgcrypto;

create table if not exists public.deposit_bonus_offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  deposit_amount numeric not null check (deposit_amount > 0),
  bonus_percent numeric not null check (bonus_percent >= 0),
  position integer not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deposit_bonus_offers_status_position_idx
  on public.deposit_bonus_offers(status, position, deposit_amount, created_at);

alter table public.deposit_requests
  add column if not exists bonus_offer_id uuid references public.deposit_bonus_offers(id) on delete set null;

create index if not exists deposit_requests_bonus_offer_idx
  on public.deposit_requests(bonus_offer_id, created_at desc);

create table if not exists public.deposit_bonus_redemptions (
  id uuid primary key default gen_random_uuid(),
  bonus_offer_id uuid not null references public.deposit_bonus_offers(id) on delete cascade,
  deposit_request_id uuid not null references public.deposit_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  deposit_amount numeric not null check (deposit_amount > 0),
  bonus_amount numeric not null default 0 check (bonus_amount >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'credited', 'released')),
  credited_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deposit_request_id)
);

create index if not exists deposit_bonus_redemptions_user_created_idx
  on public.deposit_bonus_redemptions(user_id, created_at desc);

create index if not exists deposit_bonus_redemptions_offer_created_idx
  on public.deposit_bonus_redemptions(bonus_offer_id, created_at desc);

create unique index if not exists deposit_bonus_redemptions_active_offer_idx
  on public.deposit_bonus_redemptions(user_id, bonus_offer_id)
  where status in ('reserved', 'credited');

alter table public.deposit_bonus_offers enable row level security;
alter table public.deposit_bonus_redemptions enable row level security;

drop policy if exists "Authenticated users can view active deposit bonus offers" on public.deposit_bonus_offers;
create policy "Authenticated users can view active deposit bonus offers"
on public.deposit_bonus_offers
for select
to authenticated
using (
  status = 'active'
  or public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
);

drop policy if exists "Admins can manage deposit bonus offers" on public.deposit_bonus_offers;
create policy "Admins can manage deposit bonus offers"
on public.deposit_bonus_offers
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
);

drop policy if exists "Users can view own deposit bonus redemptions" on public.deposit_bonus_redemptions;
create policy "Users can view own deposit bonus redemptions"
on public.deposit_bonus_redemptions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can view deposit bonus redemptions" on public.deposit_bonus_redemptions;
create policy "Admins can view deposit bonus redemptions"
on public.deposit_bonus_redemptions
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
);

insert into public.deposit_bonus_offers (
  title,
  description,
  deposit_amount,
  bonus_percent,
  position,
  status
)
select *
from (
  values
    ('Starter', 'First available hosted bonus offer', 30::numeric, 10::numeric, 10, 'active'),
    ('Bronze', 'Entry crypto deposit bonus', 50::numeric, 20::numeric, 20, 'active'),
    ('Silver', 'Growth crypto deposit bonus', 100::numeric, 30::numeric, 30, 'active'),
    ('Gold', 'Priority crypto deposit bonus', 150::numeric, 40::numeric, 40, 'active'),
    ('Platinum', 'High-value crypto deposit bonus', 200::numeric, 55::numeric, 50, 'active'),
    ('VIP', 'Top-tier crypto deposit bonus', 300::numeric, 70::numeric, 60, 'active')
) as seed(title, description, deposit_amount, bonus_percent, position, status)
where not exists (
  select 1
  from public.deposit_bonus_offers
);

update public.bonus_settings
set
  deposit_bonus_enabled = false,
  deposit_bonus_max = 0,
  deposit_bonus_min = 0,
  deposit_bonus_percent = 0,
  updated_at = now()
where coalesce(deposit_bonus_enabled, false)
   or coalesce(deposit_bonus_percent, 0) <> 0
   or coalesce(deposit_bonus_min, 0) <> 0
   or coalesce(deposit_bonus_max, 0) <> 0;

create or replace function public.get_available_deposit_bonus_offers()
returns table (
  id uuid,
  title text,
  description text,
  deposit_amount numeric,
  bonus_percent numeric,
  bonus_amount numeric,
  "position" integer,
  status text,
  is_new_user boolean,
  eligible boolean,
  already_used boolean,
  monthly_locked boolean,
  active_reservation boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_is_new_user boolean := false;
  v_monthly_locked boolean := false;
  v_active_reservation boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;

  v_is_new_user := coalesce(v_profile.total_deposit, 0) <= 0;

  select exists (
    select 1
    from public.deposit_bonus_redemptions r
    where r.user_id = auth.uid()
      and r.status = 'reserved'
  )
  into v_active_reservation;

  if not v_is_new_user then
    select exists (
      select 1
      from public.deposit_bonus_redemptions r
      where r.user_id = auth.uid()
        and r.status in ('reserved', 'credited')
        and r.created_at >= date_trunc('month', now())
    )
    into v_monthly_locked;
  end if;

  return query
  with offer_usage as (
    select
      o.id as offer_id,
      exists (
        select 1
        from public.deposit_bonus_redemptions r
        where r.user_id = auth.uid()
          and r.bonus_offer_id = o.id
          and r.status in ('reserved', 'credited')
      ) as already_used
    from public.deposit_bonus_offers o
    where o.status = 'active'
  )
  select
    o.id,
    o.title,
    o.description,
    o.deposit_amount,
    o.bonus_percent,
    round(o.deposit_amount * (o.bonus_percent / 100.0), 2) as bonus_amount,
    o.position as "position",
    o.status,
    v_is_new_user as is_new_user,
    (
      not usage.already_used
      and not v_active_reservation
      and (v_is_new_user or not v_monthly_locked)
    ) as eligible,
    usage.already_used,
    v_monthly_locked,
    v_active_reservation,
    case
      when usage.already_used then 'Already used on this account'
      when v_active_reservation then 'Complete your current bonus deposit first'
      when not v_is_new_user and v_monthly_locked then 'Monthly bonus already used'
      else null
    end as reason
  from public.deposit_bonus_offers o
  join offer_usage usage on usage.offer_id = o.id
  where o.status = 'active'
  order by o.position asc, o.deposit_amount asc, o.created_at asc;
end;
$$;

grant execute on function public.get_available_deposit_bonus_offers() to authenticated;

create or replace function public.admin_update_deposit_status(
  p_request_id uuid,
  p_status text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.deposit_requests%rowtype;
  v_next_status text;
  v_credit_payload jsonb := '{}'::jsonb;
  v_bonus_offer public.deposit_bonus_offers%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
  ) then
    raise exception 'Only finance managers or super admins can update deposit requests';
  end if;

  v_next_status := lower(trim(coalesce(p_status, '')));

  if v_next_status not in ('approved', 'rejected') then
    raise exception 'Deposit status must be approved or rejected';
  end if;

  select *
  into v_request
  from public.deposit_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Deposit request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending deposit requests can be processed';
  end if;

  if v_request.bonus_offer_id is not null then
    select *
    into v_bonus_offer
    from public.deposit_bonus_offers
    where id = v_request.bonus_offer_id;
  end if;

  if v_next_status = 'approved' then
    v_credit_payload := public.credit_deposit_internal(
      v_request.user_id,
      v_request.amount,
      coalesce(v_request.promo_bonus, 0),
      v_request.method
    );

    if v_request.promo_id is not null then
      update public.promo_codes
      set
        usages = coalesce(usages, 0) + 1,
        status = case
          when max_usages > 0 and coalesce(usages, 0) + 1 >= max_usages then 'expired'
          when expiry_date <= now() then 'expired'
          else status
        end
      where id = v_request.promo_id;
    end if;

    update public.deposit_requests
    set
      admin_note = p_admin_note,
      credited_amount = nullif(v_credit_payload->>'credited_amount', '')::numeric,
      deposit_bonus = coalesce(nullif(v_credit_payload->>'deposit_bonus', '')::numeric, 0),
      processed_at = now(),
      processed_by = auth.uid(),
      promo_bonus = coalesce(nullif(v_credit_payload->>'promo_bonus', '')::numeric, promo_bonus),
      referral_commission = coalesce(nullif(v_credit_payload->>'referral_commission', '')::numeric, 0),
      status = v_next_status,
      updated_at = now(),
      welcome_bonus = coalesce(nullif(v_credit_payload->>'welcome_bonus', '')::numeric, 0)
    where id = v_request.id;

    if v_request.bonus_offer_id is not null then
      update public.deposit_bonus_redemptions
      set
        credited_at = now(),
        released_at = null,
        status = 'credited',
        updated_at = now()
      where deposit_request_id = v_request.id;

      if coalesce(v_request.promo_bonus, 0) > 0 then
        perform public.create_notification_internal(
          v_request.user_id,
          'deposit_bonus',
          'Deposit bonus credited',
          format(
            '%s added $%s to your deposit after confirmation.',
            coalesce(v_bonus_offer.title, 'Deposit bonus'),
            trim(to_char(coalesce(v_request.promo_bonus, 0), 'FM999999990.00'))
          ),
          '/deposit',
          jsonb_build_object(
            'amount', coalesce(v_request.promo_bonus, 0),
            'base_amount', v_request.amount,
            'bonus_offer_id', v_request.bonus_offer_id,
            'deposit_request_id', v_request.id
          ),
          concat('deposit_bonus:', v_request.id::text, ':approved'),
          null
        );
      end if;
    end if;

    perform public.create_notification_internal(
      v_request.user_id,
      'deposit_approved',
      'Deposit approved',
      format(
        'Your %s deposit of $%s has been approved and credited.',
        coalesce(v_request.method, 'deposit'),
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/deposit',
      jsonb_build_object(
        'amount', v_request.amount,
        'deposit_request_id', v_request.id,
        'credited_amount', nullif(v_credit_payload->>'credited_amount', '')::numeric,
        'method', v_request.method
      ),
      concat('deposit_request:', v_request.id::text, ':approved'),
      null
    );
  else
    update public.deposit_requests
    set
      admin_note = p_admin_note,
      processed_at = now(),
      processed_by = auth.uid(),
      status = v_next_status,
      updated_at = now()
    where id = v_request.id;

    if v_request.bonus_offer_id is not null then
      update public.deposit_bonus_redemptions
      set
        credited_at = null,
        released_at = now(),
        status = 'released',
        updated_at = now()
      where deposit_request_id = v_request.id;
    end if;

    perform public.create_notification_internal(
      v_request.user_id,
      'deposit_rejected',
      'Deposit rejected',
      format(
        'Your %s deposit request for $%s was rejected. Contact support if you need help.',
        coalesce(v_request.method, 'deposit'),
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/deposit',
      jsonb_build_object(
        'amount', v_request.amount,
        'admin_note', p_admin_note,
        'deposit_request_id', v_request.id,
        'method', v_request.method
      ),
      concat('deposit_request:', v_request.id::text, ':rejected'),
      null
    );
  end if;

  return jsonb_build_object(
    'credited_amount', coalesce(v_credit_payload->>'credited_amount', null),
    'request_id', v_request.id,
    'status', v_next_status
  );
end;
$$;

create or replace function public.process_crypto_deposit_detection(
  p_tx_hash text,
  p_address text,
  p_payment_method_id uuid default null,
  p_memo_value text default null,
  p_confirmations integer default 0,
  p_amount_asset numeric default null,
  p_amount_asset_symbol text default null,
  p_amount_usd numeric default null,
  p_external_event_id text default null,
  p_event_status text default 'detected',
  p_provider_name text default null,
  p_raw_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_instruction public.crypto_deposit_instructions%rowtype;
  v_method public.crypto_payment_methods%rowtype;
  v_request public.deposit_requests%rowtype;
  v_event public.crypto_deposit_events%rowtype;
  v_credit_base numeric := 0;
  v_credit_payload jsonb := '{}'::jsonb;
  v_next_instruction_status text := 'awaiting_payment';
  v_bonus_offer public.deposit_bonus_offers%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the service role can process crypto deposit detections';
  end if;

  if trim(coalesce(p_tx_hash, '')) = '' then
    raise exception 'Transaction hash is required';
  end if;

  if trim(coalesce(p_address, '')) = '' then
    raise exception 'Blockchain address is required';
  end if;

  select *
  into v_instruction
  from public.crypto_deposit_instructions
  where lower(trim(deposit_address)) = lower(trim(p_address))
    and (p_payment_method_id is null or payment_method_id = p_payment_method_id)
    and (
      memo_value is null
      or nullif(trim(coalesce(p_memo_value, '')), '') is null
      or memo_value = nullif(trim(coalesce(p_memo_value, '')), '')
    )
    and instruction_status in ('awaiting_payment', 'payment_detected', 'confirming')
  order by created_at asc
  limit 1
  for update;

  if not found then
    raise exception 'No open crypto deposit instruction matches the provided address and memo.';
  end if;

  select *
  into v_method
  from public.crypto_payment_methods
  where id = v_instruction.payment_method_id;

  if not found then
    raise exception 'Crypto payment method not found for the matched instruction.';
  end if;

  select *
  into v_request
  from public.deposit_requests
  where id = v_instruction.deposit_request_id
  for update;

  if not found then
    raise exception 'Deposit request not found for the matched instruction.';
  end if;

  if v_request.status <> 'pending' then
    return jsonb_build_object(
      'credited', v_request.status = 'approved',
      'deposit_request_id', v_request.id,
      'instruction_id', v_instruction.id,
      'status', v_request.status,
      'tx_hash', trim(p_tx_hash)
    );
  end if;

  insert into public.crypto_deposit_events (
    amount_asset,
    amount_asset_symbol,
    amount_usd,
    blockchain_address,
    confirmations,
    deposit_request_id,
    event_status,
    external_event_id,
    instruction_id,
    memo_value,
    payment_method_id,
    processed_at,
    provider_name,
    raw_payload,
    tx_hash
  )
  values (
    p_amount_asset,
    nullif(trim(coalesce(p_amount_asset_symbol, '')), ''),
    p_amount_usd,
    trim(p_address),
    greatest(coalesce(p_confirmations, 0), 0),
    v_request.id,
    lower(trim(coalesce(p_event_status, 'detected'))),
    nullif(trim(coalesce(p_external_event_id, '')), ''),
    v_instruction.id,
    nullif(trim(coalesce(p_memo_value, '')), ''),
    v_instruction.payment_method_id,
    now(),
    nullif(trim(coalesce(p_provider_name, '')), ''),
    coalesce(p_raw_payload, '{}'::jsonb),
    trim(p_tx_hash)
  )
  on conflict do nothing
  returning *
  into v_event;

  if not found then
    select *
    into v_event
    from public.crypto_deposit_events
    where tx_hash = trim(p_tx_hash)
      and instruction_id = v_instruction.id
    order by created_at desc
    limit 1
    for update;
  end if;

  v_next_instruction_status := case
    when greatest(coalesce(p_confirmations, 0), 0) <= 0 then 'payment_detected'
    when greatest(coalesce(p_confirmations, 0), 0) < greatest(coalesce(v_instruction.required_confirmations, 0), 0) then 'confirming'
    else 'credited'
  end;

  update public.crypto_deposit_instructions
  set
    detected_amount_asset = coalesce(p_amount_asset, detected_amount_asset),
    detected_amount_usd = coalesce(p_amount_usd, detected_amount_usd),
    detected_asset_symbol = coalesce(nullif(trim(coalesce(p_amount_asset_symbol, '')), ''), detected_asset_symbol),
    detected_tx_hash = trim(p_tx_hash),
    observed_confirmations = greatest(coalesce(p_confirmations, 0), observed_confirmations),
    instruction_status = v_next_instruction_status,
    updated_at = now()
  where id = v_instruction.id;

  if greatest(coalesce(p_confirmations, 0), 0) < greatest(coalesce(v_instruction.required_confirmations, 0), 0) then
    return jsonb_build_object(
      'credited', false,
      'confirmations_observed', greatest(coalesce(p_confirmations, 0), 0),
      'confirmations_required', greatest(coalesce(v_instruction.required_confirmations, 0), 0),
      'deposit_request_id', v_request.id,
      'event_id', v_event.id,
      'instruction_id', v_instruction.id,
      'status', v_next_instruction_status,
      'tx_hash', trim(p_tx_hash)
    );
  end if;

  v_credit_base := coalesce(p_amount_usd, v_instruction.expected_amount_usd, v_request.amount);

  if coalesce(v_credit_base, 0) < coalesce(v_method.minimum_deposit_amount, 0) then
    return jsonb_build_object(
      'credited', false,
      'deposit_request_id', v_request.id,
      'event_id', v_event.id,
      'instruction_id', v_instruction.id,
      'status', 'below_minimum',
      'tx_hash', trim(p_tx_hash)
    );
  end if;

  if v_request.bonus_offer_id is not null then
    select *
    into v_bonus_offer
    from public.deposit_bonus_offers
    where id = v_request.bonus_offer_id;
  end if;

  v_credit_payload := public.credit_deposit_internal(
    v_request.user_id,
    v_credit_base,
    coalesce(v_request.promo_bonus, 0),
    v_request.method
  );

  if v_request.promo_id is not null then
    update public.promo_codes
    set
      usages = coalesce(usages, 0) + 1,
      status = case
        when max_usages > 0 and coalesce(usages, 0) + 1 >= max_usages then 'expired'
        when expiry_date <= now() then 'expired'
        else status
      end
    where id = v_request.promo_id;
  end if;

  update public.deposit_requests
  set
    admin_note = coalesce(admin_note, 'Auto-credited by crypto webhook'),
    credited_amount = nullif(v_credit_payload->>'credited_amount', '')::numeric,
    deposit_bonus = coalesce(nullif(v_credit_payload->>'deposit_bonus', '')::numeric, 0),
    processed_at = now(),
    processed_by = null,
    promo_bonus = coalesce(nullif(v_credit_payload->>'promo_bonus', '')::numeric, promo_bonus),
    referral_commission = coalesce(nullif(v_credit_payload->>'referral_commission', '')::numeric, 0),
    status = 'approved',
    tx_hash = trim(p_tx_hash),
    updated_at = now(),
    welcome_bonus = coalesce(nullif(v_credit_payload->>'welcome_bonus', '')::numeric, 0)
  where id = v_request.id;

  if v_request.bonus_offer_id is not null then
    update public.deposit_bonus_redemptions
    set
      credited_at = now(),
      released_at = null,
      status = 'credited',
      updated_at = now()
    where deposit_request_id = v_request.id;

    if coalesce(v_request.promo_bonus, 0) > 0 then
      perform public.create_notification_internal(
        v_request.user_id,
        'deposit_bonus',
        'Deposit bonus credited',
        format(
          '%s added $%s to your deposit after confirmation.',
          coalesce(v_bonus_offer.title, 'Deposit bonus'),
          trim(to_char(coalesce(v_request.promo_bonus, 0), 'FM999999990.00'))
        ),
        '/deposit',
        jsonb_build_object(
          'amount', coalesce(v_request.promo_bonus, 0),
          'base_amount', v_credit_base,
          'bonus_offer_id', v_request.bonus_offer_id,
          'deposit_request_id', v_request.id
        ),
        concat('deposit_bonus:', v_request.id::text, ':credited'),
        null
      );
    end if;
  end if;

  update public.crypto_deposit_instructions
  set
    detected_amount_asset = coalesce(p_amount_asset, detected_amount_asset),
    detected_amount_usd = coalesce(p_amount_usd, detected_amount_usd),
    detected_asset_symbol = coalesce(nullif(trim(coalesce(p_amount_asset_symbol, '')), ''), detected_asset_symbol),
    detected_tx_hash = trim(p_tx_hash),
    observed_confirmations = greatest(coalesce(p_confirmations, 0), observed_confirmations),
    instruction_status = 'credited',
    credited_at = now(),
    updated_at = now()
  where id = v_instruction.id;

  update public.crypto_deposit_events
  set
    event_status = 'credited',
    processed_at = now(),
    updated_at = now()
  where id = v_event.id;

  perform public.create_notification_internal(
    v_request.user_id,
    'crypto_deposit_confirmed',
    'Crypto deposit credited',
    format(
      'Your %s deposit of $%s has been credited after %s confirmation(s).',
      coalesce(v_method.coin_name, v_request.method, 'crypto'),
      trim(to_char(v_credit_base, 'FM999999990.00')),
      greatest(coalesce(p_confirmations, 0), 0)
    ),
    '/deposit',
    jsonb_build_object(
      'amount', v_credit_base,
      'asset_symbol', coalesce(nullif(trim(coalesce(p_amount_asset_symbol, '')), ''), v_method.symbol),
      'confirmations', greatest(coalesce(p_confirmations, 0), 0),
      'deposit_request_id', v_request.id,
      'instruction_id', v_instruction.id,
      'tx_hash', trim(p_tx_hash)
    ),
    concat('crypto_deposit_confirmed:', v_request.id::text, ':', trim(p_tx_hash)),
    null
  );

  return jsonb_build_object(
    'credited', true,
    'confirmations_observed', greatest(coalesce(p_confirmations, 0), 0),
    'confirmations_required', greatest(coalesce(v_instruction.required_confirmations, 0), 0),
    'credited_amount', coalesce(v_credit_payload->>'credited_amount', null),
    'deposit_request_id', v_request.id,
    'event_id', v_event.id,
    'instruction_id', v_instruction.id,
    'status', 'credited',
    'tx_hash', trim(p_tx_hash)
  );
end;
$$;
