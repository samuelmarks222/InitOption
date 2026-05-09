create table if not exists public.crypto_deposit_address_pool (
  id uuid primary key default gen_random_uuid(),
  payment_method_id uuid not null references public.crypto_payment_methods(id) on delete cascade,
  address text not null,
  status text not null default 'available',
  assigned_instruction_id uuid,
  assigned_user_id uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crypto_payment_methods
  add column if not exists attribution_mode text not null default 'static',
  add column if not exists memo_label text,
  add column if not exists minimum_deposit_amount numeric not null default 10,
  add column if not exists confirmations_required integer not null default 1;

update public.crypto_payment_methods
set
  attribution_mode = coalesce(nullif(trim(attribution_mode), ''), 'static'),
  minimum_deposit_amount = greatest(coalesce(minimum_deposit_amount, 10), 0),
  confirmations_required = greatest(coalesce(confirmations_required, 1), 0),
  updated_at = now()
where
  attribution_mode is null
  or trim(attribution_mode) = ''
  or minimum_deposit_amount is null
  or confirmations_required is null
  or minimum_deposit_amount < 0
  or confirmations_required < 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_payment_methods_attribution_mode_check'
  ) then
    alter table public.crypto_payment_methods
      add constraint crypto_payment_methods_attribution_mode_check
      check (attribution_mode in ('static', 'memo', 'dynamic_address'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_payment_methods_minimum_deposit_amount_check'
  ) then
    alter table public.crypto_payment_methods
      add constraint crypto_payment_methods_minimum_deposit_amount_check
      check (minimum_deposit_amount >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_payment_methods_confirmations_required_check'
  ) then
    alter table public.crypto_payment_methods
      add constraint crypto_payment_methods_confirmations_required_check
      check (confirmations_required >= 0);
  end if;
end $$;

alter table public.crypto_deposit_address_pool
  add column if not exists payment_method_id uuid references public.crypto_payment_methods(id) on delete cascade,
  add column if not exists address text,
  add column if not exists status text not null default 'available',
  add column if not exists assigned_instruction_id uuid,
  add column if not exists assigned_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.crypto_deposit_address_pool
set
  status = coalesce(nullif(trim(status), ''), 'available'),
  updated_at = now()
where status is null or trim(status) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_address_pool_status_check'
  ) then
    alter table public.crypto_deposit_address_pool
      add constraint crypto_deposit_address_pool_status_check
      check (status in ('available', 'assigned', 'retired'));
  end if;
end $$;

create unique index if not exists crypto_deposit_address_pool_method_address_uidx
  on public.crypto_deposit_address_pool(payment_method_id, address);

create index if not exists crypto_deposit_address_pool_status_idx
  on public.crypto_deposit_address_pool(payment_method_id, status, created_at);

create table if not exists public.crypto_deposit_instructions (
  id uuid primary key default gen_random_uuid(),
  deposit_request_id uuid not null references public.deposit_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_method_id uuid not null references public.crypto_payment_methods(id) on delete cascade,
  instruction_status text not null default 'awaiting_payment',
  deposit_address text not null,
  memo_value text,
  memo_label text,
  expected_amount_usd numeric not null,
  detected_amount_asset numeric,
  detected_amount_usd numeric,
  detected_asset_symbol text,
  detected_tx_hash text,
  required_confirmations integer not null default 1,
  observed_confirmations integer not null default 0,
  promo_bonus numeric not null default 0,
  credited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crypto_deposit_instructions
  add column if not exists deposit_request_id uuid references public.deposit_requests(id) on delete cascade,
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists payment_method_id uuid references public.crypto_payment_methods(id) on delete cascade,
  add column if not exists instruction_status text not null default 'awaiting_payment',
  add column if not exists deposit_address text,
  add column if not exists memo_value text,
  add column if not exists memo_label text,
  add column if not exists expected_amount_usd numeric,
  add column if not exists detected_amount_asset numeric,
  add column if not exists detected_amount_usd numeric,
  add column if not exists detected_asset_symbol text,
  add column if not exists detected_tx_hash text,
  add column if not exists required_confirmations integer not null default 1,
  add column if not exists observed_confirmations integer not null default 0,
  add column if not exists promo_bonus numeric not null default 0,
  add column if not exists credited_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.crypto_deposit_instructions
set
  instruction_status = coalesce(nullif(trim(instruction_status), ''), 'awaiting_payment'),
  required_confirmations = greatest(coalesce(required_confirmations, 1), 0),
  observed_confirmations = greatest(coalesce(observed_confirmations, 0), 0),
  promo_bonus = coalesce(promo_bonus, 0),
  updated_at = now()
where
  instruction_status is null
  or trim(instruction_status) = ''
  or required_confirmations is null
  or observed_confirmations is null
  or promo_bonus is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_instructions_status_check'
  ) then
    alter table public.crypto_deposit_instructions
      add constraint crypto_deposit_instructions_status_check
      check (instruction_status in ('awaiting_payment', 'payment_detected', 'confirming', 'credited', 'expired', 'cancelled'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_instructions_expected_amount_usd_check'
  ) then
    alter table public.crypto_deposit_instructions
      add constraint crypto_deposit_instructions_expected_amount_usd_check
      check (expected_amount_usd > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_instructions_required_confirmations_check'
  ) then
    alter table public.crypto_deposit_instructions
      add constraint crypto_deposit_instructions_required_confirmations_check
      check (required_confirmations >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_instructions_observed_confirmations_check'
  ) then
    alter table public.crypto_deposit_instructions
      add constraint crypto_deposit_instructions_observed_confirmations_check
      check (observed_confirmations >= 0);
  end if;
end $$;

create unique index if not exists crypto_deposit_instructions_request_uidx
  on public.crypto_deposit_instructions(deposit_request_id);

create index if not exists crypto_deposit_instructions_user_status_idx
  on public.crypto_deposit_instructions(user_id, instruction_status, created_at desc);

create index if not exists crypto_deposit_instructions_method_address_idx
  on public.crypto_deposit_instructions(payment_method_id, deposit_address, created_at desc);

create table if not exists public.crypto_deposit_events (
  id uuid primary key default gen_random_uuid(),
  instruction_id uuid references public.crypto_deposit_instructions(id) on delete set null,
  deposit_request_id uuid references public.deposit_requests(id) on delete set null,
  payment_method_id uuid references public.crypto_payment_methods(id) on delete set null,
  provider_name text,
  external_event_id text,
  tx_hash text not null,
  blockchain_address text not null,
  memo_value text,
  event_status text not null default 'detected',
  confirmations integer not null default 0,
  amount_asset numeric,
  amount_asset_symbol text,
  amount_usd numeric,
  raw_payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crypto_deposit_events
  add column if not exists instruction_id uuid references public.crypto_deposit_instructions(id) on delete set null,
  add column if not exists deposit_request_id uuid references public.deposit_requests(id) on delete set null,
  add column if not exists payment_method_id uuid references public.crypto_payment_methods(id) on delete set null,
  add column if not exists provider_name text,
  add column if not exists external_event_id text,
  add column if not exists tx_hash text,
  add column if not exists blockchain_address text,
  add column if not exists memo_value text,
  add column if not exists event_status text not null default 'detected',
  add column if not exists confirmations integer not null default 0,
  add column if not exists amount_asset numeric,
  add column if not exists amount_asset_symbol text,
  add column if not exists amount_usd numeric,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb,
  add column if not exists processed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.crypto_deposit_events
set
  event_status = coalesce(nullif(trim(event_status), ''), 'detected'),
  confirmations = greatest(coalesce(confirmations, 0), 0),
  raw_payload = coalesce(raw_payload, '{}'::jsonb),
  updated_at = now()
where
  event_status is null
  or trim(event_status) = ''
  or confirmations is null
  or raw_payload is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_events_event_status_check'
  ) then
    alter table public.crypto_deposit_events
      add constraint crypto_deposit_events_event_status_check
      check (event_status in ('detected', 'confirming', 'confirmed', 'credited', 'unmatched', 'rejected'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_events_confirmations_check'
  ) then
    alter table public.crypto_deposit_events
      add constraint crypto_deposit_events_confirmations_check
      check (confirmations >= 0);
  end if;
end $$;

create unique index if not exists crypto_deposit_events_method_tx_hash_uidx
  on public.crypto_deposit_events(payment_method_id, tx_hash)
  where payment_method_id is not null;

create index if not exists crypto_deposit_events_request_created_idx
  on public.crypto_deposit_events(deposit_request_id, created_at desc);

create index if not exists crypto_deposit_events_address_created_idx
  on public.crypto_deposit_events(blockchain_address, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_address_pool_assigned_instruction_id_fkey'
  ) then
    alter table public.crypto_deposit_address_pool
      add constraint crypto_deposit_address_pool_assigned_instruction_id_fkey
      foreign key (assigned_instruction_id)
      references public.crypto_deposit_instructions(id)
      on delete set null;
  end if;
end $$;

alter table public.crypto_deposit_address_pool enable row level security;
alter table public.crypto_deposit_instructions enable row level security;
alter table public.crypto_deposit_events enable row level security;

drop policy if exists "Admins can view address pool" on public.crypto_deposit_address_pool;
drop policy if exists "Admins can insert address pool" on public.crypto_deposit_address_pool;
drop policy if exists "Admins can update address pool" on public.crypto_deposit_address_pool;
drop policy if exists "Admins can delete address pool" on public.crypto_deposit_address_pool;

create policy "Admins can view address pool"
on public.crypto_deposit_address_pool
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
);

create policy "Admins can insert address pool"
on public.crypto_deposit_address_pool
for insert
to authenticated
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
);

create policy "Admins can update address pool"
on public.crypto_deposit_address_pool
for update
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
);

create policy "Admins can delete address pool"
on public.crypto_deposit_address_pool
for delete
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
);

drop policy if exists "Users can view own crypto deposit instructions" on public.crypto_deposit_instructions;
drop policy if exists "Finance admins can view crypto deposit instructions" on public.crypto_deposit_instructions;

create policy "Users can view own crypto deposit instructions"
on public.crypto_deposit_instructions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Finance admins can view crypto deposit instructions"
on public.crypto_deposit_instructions
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
);

drop policy if exists "Finance admins can view crypto deposit events" on public.crypto_deposit_events;

create policy "Finance admins can view crypto deposit events"
on public.crypto_deposit_events
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
);

create or replace function public.create_crypto_deposit_instruction(
  p_amount numeric,
  p_payment_method_id uuid,
  p_promo_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_method public.crypto_payment_methods%rowtype;
  v_address_pool public.crypto_deposit_address_pool%rowtype;
  v_instruction public.crypto_deposit_instructions%rowtype;
  v_request_payload jsonb := '{}'::jsonb;
  v_request_id uuid;
  v_promo_bonus numeric := 0;
  v_address text;
  v_memo_value text;
  v_memo_label text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Deposit amount must be positive';
  end if;

  select *
  into v_method
  from public.crypto_payment_methods
  where id = p_payment_method_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Selected crypto deposit method is not active';
  end if;

  if coalesce(v_method.minimum_deposit_amount, 0) > 0 and p_amount < v_method.minimum_deposit_amount then
    raise exception 'Minimum deposit for % is % USD', coalesce(v_method.symbol, 'this method'), v_method.minimum_deposit_amount;
  end if;

  if v_method.attribution_mode = 'static' then
    raise exception 'This crypto method is still in static/manual mode. Switch it to memo or dynamic address mode to enable automatic crediting.';
  end if;

  if v_method.attribution_mode = 'memo' then
    v_address := trim(coalesce(v_method.wallet_address, ''));

    if v_address = '' then
      raise exception 'A fixed wallet address is required before memo-based deposits can be generated.';
    end if;

    v_memo_label := coalesce(nullif(trim(v_method.memo_label), ''), 'Memo');
    v_memo_value := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  elsif v_method.attribution_mode = 'dynamic_address' then
    select *
    into v_address_pool
    from public.crypto_deposit_address_pool
    where payment_method_id = v_method.id
      and status = 'available'
    order by created_at asc
    limit 1
    for update skip locked;

    if not found then
      raise exception 'No unused deposit addresses are available for this method. Import more addresses in the admin crypto panel.';
    end if;

    v_address := trim(coalesce(v_address_pool.address, ''));

    if v_address = '' then
      raise exception 'The selected address pool entry is empty.';
    end if;
  else
    raise exception 'Unsupported attribution mode: %', v_method.attribution_mode;
  end if;

  v_request_payload := public.request_deposit_review(
    p_amount,
    upper(trim(v_method.symbol)),
    p_promo_id,
    p_payment_method_id,
    null
  );

  v_request_id := nullif(v_request_payload->>'request_id', '')::uuid;
  v_promo_bonus := coalesce(nullif(v_request_payload->>'promo_bonus', '')::numeric, 0);

  if v_request_id is null then
    raise exception 'Deposit request could not be created';
  end if;

  insert into public.crypto_deposit_instructions (
    deposit_request_id,
    user_id,
    payment_method_id,
    instruction_status,
    deposit_address,
    memo_label,
    memo_value,
    expected_amount_usd,
    promo_bonus,
    required_confirmations
  )
  values (
    v_request_id,
    auth.uid(),
    v_method.id,
    'awaiting_payment',
    v_address,
    v_memo_label,
    v_memo_value,
    p_amount,
    v_promo_bonus,
    greatest(coalesce(v_method.confirmations_required, 1), 0)
  )
  returning *
  into v_instruction;

  if v_method.attribution_mode = 'dynamic_address' and v_address_pool.id is not null then
    update public.crypto_deposit_address_pool
    set
      assigned_instruction_id = v_instruction.id,
      assigned_user_id = auth.uid(),
      assigned_at = now(),
      status = 'assigned',
      updated_at = now()
    where id = v_address_pool.id;
  end if;

  return jsonb_build_object(
    'address', v_instruction.deposit_address,
    'amount', v_instruction.expected_amount_usd,
    'confirmations_required', v_instruction.required_confirmations,
    'deposit_request_id', v_instruction.deposit_request_id,
    'instruction_id', v_instruction.id,
    'instruction_status', v_instruction.instruction_status,
    'memo_label', v_instruction.memo_label,
    'memo_value', v_instruction.memo_value,
    'payment_method_id', v_instruction.payment_method_id,
    'promo_bonus', v_instruction.promo_bonus
  );
end;
$$;

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
        'deposit_request_id', v_request.id,
        'method', v_request.method,
        'amount', v_request.amount
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
  v_request public.deposit_requests%rowtype;
  v_method public.crypto_payment_methods%rowtype;
  v_event public.crypto_deposit_events%rowtype;
  v_credit_payload jsonb := '{}'::jsonb;
  v_credit_base numeric;
  v_effective_status text := lower(trim(coalesce(p_event_status, 'detected')));
  v_next_instruction_status text := 'payment_detected';
begin
  if trim(coalesce(p_tx_hash, '')) = '' then
    raise exception 'Transaction hash is required';
  end if;

  if trim(coalesce(p_address, '')) = '' then
    raise exception 'Destination address is required';
  end if;

  select i.*
  into v_instruction
  from public.crypto_deposit_instructions i
  join public.crypto_payment_methods m
    on m.id = i.payment_method_id
  where i.instruction_status in ('awaiting_payment', 'payment_detected', 'confirming', 'credited')
    and (
      (m.attribution_mode = 'memo' and i.deposit_address = trim(p_address) and coalesce(i.memo_value, '') = trim(coalesce(p_memo_value, '')))
      or (m.attribution_mode = 'dynamic_address' and i.deposit_address = trim(p_address))
    )
    and (p_payment_method_id is null or i.payment_method_id = p_payment_method_id)
  order by i.created_at desc
  limit 1
  for update;

  if not found then
    insert into public.crypto_deposit_events (
      payment_method_id,
      provider_name,
      external_event_id,
      tx_hash,
      blockchain_address,
      memo_value,
      event_status,
      confirmations,
      amount_asset,
      amount_asset_symbol,
      amount_usd,
      raw_payload,
      updated_at
    )
    values (
      p_payment_method_id,
      nullif(trim(coalesce(p_provider_name, '')), ''),
      nullif(trim(coalesce(p_external_event_id, '')), ''),
      trim(p_tx_hash),
      trim(p_address),
      nullif(trim(coalesce(p_memo_value, '')), ''),
      case
        when v_effective_status in ('credited', 'confirmed') then 'confirmed'
        when v_effective_status = 'rejected' then 'rejected'
        else 'unmatched'
      end,
      greatest(coalesce(p_confirmations, 0), 0),
      p_amount_asset,
      nullif(trim(coalesce(p_amount_asset_symbol, '')), ''),
      p_amount_usd,
      coalesce(p_raw_payload, '{}'::jsonb),
      now()
    )
    on conflict (payment_method_id, tx_hash)
    where payment_method_id is not null
    do update
    set
      blockchain_address = excluded.blockchain_address,
      confirmations = excluded.confirmations,
      event_status = excluded.event_status,
      memo_value = excluded.memo_value,
      amount_asset = excluded.amount_asset,
      amount_asset_symbol = excluded.amount_asset_symbol,
      amount_usd = excluded.amount_usd,
      provider_name = excluded.provider_name,
      external_event_id = excluded.external_event_id,
      raw_payload = excluded.raw_payload,
      updated_at = now()
    returning *
    into v_event;

    return jsonb_build_object(
      'credited', false,
      'event_id', v_event.id,
      'status', 'unmatched',
      'tx_hash', trim(p_tx_hash)
    );
  end if;

  select *
  into v_method
  from public.crypto_payment_methods
  where id = v_instruction.payment_method_id;

  select *
  into v_request
  from public.deposit_requests
  where id = v_instruction.deposit_request_id
  for update;

  insert into public.crypto_deposit_events (
    instruction_id,
    deposit_request_id,
    payment_method_id,
    provider_name,
    external_event_id,
    tx_hash,
    blockchain_address,
    memo_value,
    event_status,
    confirmations,
    amount_asset,
    amount_asset_symbol,
    amount_usd,
    raw_payload,
    updated_at
  )
  values (
    v_instruction.id,
    v_instruction.deposit_request_id,
    v_instruction.payment_method_id,
    nullif(trim(coalesce(p_provider_name, '')), ''),
    nullif(trim(coalesce(p_external_event_id, '')), ''),
    trim(p_tx_hash),
    trim(p_address),
    nullif(trim(coalesce(p_memo_value, '')), ''),
    case
      when v_effective_status = 'rejected' then 'rejected'
      when greatest(coalesce(p_confirmations, 0), 0) >= greatest(coalesce(v_instruction.required_confirmations, 0), 0) then 'confirmed'
      when greatest(coalesce(p_confirmations, 0), 0) > 0 then 'confirming'
      else 'detected'
    end,
    greatest(coalesce(p_confirmations, 0), 0),
    p_amount_asset,
    nullif(trim(coalesce(p_amount_asset_symbol, '')), ''),
    p_amount_usd,
    coalesce(p_raw_payload, '{}'::jsonb),
    now()
  )
  on conflict (payment_method_id, tx_hash)
  where payment_method_id is not null
  do update
  set
    instruction_id = excluded.instruction_id,
    deposit_request_id = excluded.deposit_request_id,
    blockchain_address = excluded.blockchain_address,
    confirmations = excluded.confirmations,
    event_status = excluded.event_status,
    memo_value = excluded.memo_value,
    amount_asset = excluded.amount_asset,
    amount_asset_symbol = excluded.amount_asset_symbol,
    amount_usd = excluded.amount_usd,
    provider_name = excluded.provider_name,
    external_event_id = excluded.external_event_id,
    raw_payload = excluded.raw_payload,
    updated_at = now()
  returning *
  into v_event;

  if v_request.status = 'approved' or v_instruction.instruction_status = 'credited' then
    update public.crypto_deposit_instructions
    set
      detected_amount_asset = coalesce(p_amount_asset, detected_amount_asset),
      detected_amount_usd = coalesce(p_amount_usd, detected_amount_usd),
      detected_asset_symbol = coalesce(nullif(trim(coalesce(p_amount_asset_symbol, '')), ''), detected_asset_symbol),
      detected_tx_hash = trim(p_tx_hash),
      observed_confirmations = greatest(coalesce(p_confirmations, 0), observed_confirmations),
      instruction_status = 'credited',
      credited_at = coalesce(credited_at, now()),
      updated_at = now()
    where id = v_instruction.id;

    update public.crypto_deposit_events
    set
      event_status = 'credited',
      processed_at = coalesce(processed_at, now()),
      updated_at = now()
    where id = v_event.id;

    return jsonb_build_object(
      'credited', true,
      'deposit_request_id', v_request.id,
      'event_id', v_event.id,
      'instruction_id', v_instruction.id,
      'status', 'already_credited',
      'tx_hash', trim(p_tx_hash)
    );
  end if;

  if v_effective_status = 'rejected' then
    update public.crypto_deposit_instructions
    set
      detected_amount_asset = coalesce(p_amount_asset, detected_amount_asset),
      detected_amount_usd = coalesce(p_amount_usd, detected_amount_usd),
      detected_asset_symbol = coalesce(nullif(trim(coalesce(p_amount_asset_symbol, '')), ''), detected_asset_symbol),
      detected_tx_hash = trim(p_tx_hash),
      observed_confirmations = greatest(coalesce(p_confirmations, 0), observed_confirmations),
      instruction_status = 'payment_detected',
      updated_at = now()
    where id = v_instruction.id;

    return jsonb_build_object(
      'credited', false,
      'deposit_request_id', v_request.id,
      'event_id', v_event.id,
      'instruction_id', v_instruction.id,
      'status', 'rejected',
      'tx_hash', trim(p_tx_hash)
    );
  end if;

  if greatest(coalesce(p_confirmations, 0), 0) >= greatest(coalesce(v_instruction.required_confirmations, 0), 0) then
    v_next_instruction_status := 'confirming';
  elsif greatest(coalesce(p_confirmations, 0), 0) > 0 then
    v_next_instruction_status := 'confirming';
  else
    v_next_instruction_status := 'payment_detected';
  end if;

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
      coalesce(v_request.method, 'crypto'),
      trim(to_char(v_credit_base, 'FM999999990.00')),
      greatest(coalesce(p_confirmations, 0), 0)
    ),
    '/deposit',
    jsonb_build_object(
      'amount_usd', v_credit_base,
      'confirmations', greatest(coalesce(p_confirmations, 0), 0),
      'deposit_request_id', v_request.id,
      'instruction_id', v_instruction.id,
      'tx_hash', trim(p_tx_hash)
    ),
    concat('crypto_deposit:', v_request.id::text, ':', trim(p_tx_hash)),
    null
  );

  return jsonb_build_object(
    'credited', true,
    'credited_amount', coalesce(v_credit_payload->>'credited_amount', null),
    'deposit_request_id', v_request.id,
    'event_id', v_event.id,
    'instruction_id', v_instruction.id,
    'status', 'credited',
    'tx_hash', trim(p_tx_hash)
  );
end;
$$;

grant execute on function public.create_crypto_deposit_instruction(numeric, uuid, uuid) to authenticated;
grant execute on function public.admin_update_deposit_status(uuid, text, text) to authenticated;
grant execute on function public.process_crypto_deposit_detection(text, text, uuid, text, integer, numeric, text, numeric, text, text, text, jsonb) to service_role;

revoke execute on function public.process_crypto_deposit_detection(text, text, uuid, text, integer, numeric, text, numeric, text, text, text, jsonb) from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'crypto_deposit_instructions'
  ) then
    alter publication supabase_realtime add table public.crypto_deposit_instructions;
  end if;
end $$;
