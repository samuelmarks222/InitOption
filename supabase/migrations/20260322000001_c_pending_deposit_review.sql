create table if not exists public.deposit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  method text not null,
  payment_method_id uuid references public.crypto_payment_methods(id) on delete set null,
  promo_id uuid references public.promo_codes(id) on delete set null,
  promo_bonus numeric not null default 0,
  tx_hash text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  processed_by uuid references public.profiles(id) on delete set null,
  processed_at timestamptz,
  credited_amount numeric,
  deposit_bonus numeric not null default 0,
  welcome_bonus numeric not null default 0,
  referral_commission numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.deposit_requests
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists amount numeric,
  add column if not exists method text,
  add column if not exists payment_method_id uuid references public.crypto_payment_methods(id) on delete set null,
  add column if not exists promo_id uuid references public.promo_codes(id) on delete set null,
  add column if not exists promo_bonus numeric not null default 0,
  add column if not exists tx_hash text,
  add column if not exists status text not null default 'pending',
  add column if not exists admin_note text,
  add column if not exists processed_by uuid references public.profiles(id) on delete set null,
  add column if not exists processed_at timestamptz,
  add column if not exists credited_amount numeric,
  add column if not exists deposit_bonus numeric not null default 0,
  add column if not exists welcome_bonus numeric not null default 0,
  add column if not exists referral_commission numeric not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'deposit_requests_amount_check'
  ) then
    alter table public.deposit_requests
      add constraint deposit_requests_amount_check check (amount > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'deposit_requests_status_check'
  ) then
    alter table public.deposit_requests
      add constraint deposit_requests_status_check check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists deposit_requests_user_status_idx
  on public.deposit_requests(user_id, status, created_at desc);

create index if not exists deposit_requests_status_created_idx
  on public.deposit_requests(status, created_at desc);

alter table public.deposit_requests enable row level security;

drop policy if exists "Users can view own deposit requests" on public.deposit_requests;
drop policy if exists "Users can insert own deposit requests" on public.deposit_requests;
drop policy if exists "Finance admins can view deposit requests" on public.deposit_requests;
drop policy if exists "Finance admins can update deposit requests" on public.deposit_requests;

create policy "Users can view own deposit requests"
on public.deposit_requests
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own deposit requests"
on public.deposit_requests
for insert
to authenticated
with check (auth.uid() = user_id and status = 'pending');

create policy "Finance admins can view deposit requests"
on public.deposit_requests
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
);

create policy "Finance admins can update deposit requests"
on public.deposit_requests
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

create or replace function public.credit_deposit_internal(
  p_user_id uuid,
  p_amount numeric,
  p_promo_bonus numeric default 0,
  p_method text default 'card'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_bonus public.bonus_settings%rowtype;
  v_is_first_deposit boolean;
  v_deposit_bonus numeric := 0;
  v_welcome_bonus numeric := 0;
  v_referral_bonus numeric := 0;
  v_total_credit numeric := 0;
  v_referrer_username text;
begin
  if p_user_id is null then
    raise exception 'Target user is required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Deposit amount must be positive';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  select *
  into v_bonus
  from public.bonus_settings
  order by created_at asc
  limit 1;

  v_is_first_deposit := coalesce(v_profile.total_deposit, 0) <= 0;

  if coalesce(v_bonus.deposit_bonus_enabled, false)
    and p_amount >= coalesce(v_bonus.deposit_bonus_min, 0)
    and coalesce(v_bonus.deposit_bonus_percent, 0) > 0 then
    v_deposit_bonus := p_amount * (v_bonus.deposit_bonus_percent / 100.0);
    if coalesce(v_bonus.deposit_bonus_max, 0) > 0 then
      v_deposit_bonus := least(v_deposit_bonus, v_bonus.deposit_bonus_max);
    end if;
  end if;

  if coalesce(v_bonus.welcome_bonus_enabled, false)
    and coalesce(v_bonus.welcome_bonus_trigger, 'first_deposit') = 'first_deposit'
    and v_is_first_deposit
    and v_profile.welcome_bonus_granted_at is null then
    v_welcome_bonus := coalesce(v_bonus.welcome_bonus_amount, 0);
  end if;

  v_total_credit := p_amount + coalesce(p_promo_bonus, 0) + v_deposit_bonus + v_welcome_bonus;

  update public.profiles
  set
    balance = balance + v_total_credit,
    total_deposit = coalesce(total_deposit, 0) + p_amount,
    welcome_bonus_granted_at = case
      when v_welcome_bonus > 0 and welcome_bonus_granted_at is null then now()
      else welcome_bonus_granted_at
    end,
    updated_at = now()
  where id = p_user_id;

  if v_deposit_bonus > 0 then
    perform public.create_notification_internal(
      p_user_id,
      'deposit_bonus',
      'Deposit bonus credited',
      format('Deposit bonus credited: +$%s added to your balance.', trim(to_char(v_deposit_bonus, 'FM999999990.00'))),
      '/deposit',
      jsonb_build_object(
        'amount', v_deposit_bonus,
        'base_amount', p_amount,
        'method', p_method
      ),
      null,
      null
    );
  end if;

  if v_welcome_bonus > 0 then
    perform public.create_notification_internal(
      p_user_id,
      'welcome_bonus',
      'Welcome bonus unlocked',
      format('Welcome! You''ve received a $%s welcome bonus. Start trading now!', trim(to_char(v_welcome_bonus, 'FM999999990.00'))),
      '/trade',
      jsonb_build_object(
        'amount', v_welcome_bonus,
        'trigger', 'first_deposit'
      ),
      concat('welcome_bonus:first_deposit:', p_user_id::text),
      null
    );
  end if;

  if v_profile.referred_by is not null
    and coalesce(v_bonus.referral_commission_enabled, false)
    and coalesce(v_bonus.referral_commission_type, 'deposit') = 'deposit'
    and coalesce(v_bonus.referral_commission_percent, 0) > 0 then
    v_referral_bonus := p_amount * (v_bonus.referral_commission_percent / 100.0);

    update public.profiles
    set
      balance = balance + v_referral_bonus,
      referral_earnings = coalesce(referral_earnings, 0) + v_referral_bonus,
      updated_at = now()
    where id = v_profile.referred_by;

    select coalesce(username, display_name, 'your referral')
    into v_referrer_username
    from public.profiles
    where id = p_user_id;

    perform public.create_notification_internal(
      v_profile.referred_by,
      'referral_commission',
      'Referral commission earned',
      format('You earned $%s referral commission from %s.', trim(to_char(v_referral_bonus, 'FM999999990.00')), coalesce(v_referrer_username, 'your referral')),
      '/trade',
      jsonb_build_object(
        'amount', v_referral_bonus,
        'base_amount', p_amount,
        'source_user_id', p_user_id,
        'source_type', 'deposit'
      ),
      null,
      null
    );
  end if;

  return jsonb_build_object(
    'credited_amount', v_total_credit,
    'deposit_bonus', v_deposit_bonus,
    'welcome_bonus', v_welcome_bonus,
    'promo_bonus', coalesce(p_promo_bonus, 0),
    'referral_commission', v_referral_bonus
  );
end;
$$;

create or replace function public.request_deposit_review(
  p_amount numeric,
  p_method text,
  p_promo_id uuid default null,
  p_payment_method_id uuid default null,
  p_tx_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_promo public.promo_codes%rowtype;
  v_numeric_value numeric := 0;
  v_promo_bonus numeric := 0;
  v_request public.deposit_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Deposit amount must be positive';
  end if;

  if coalesce(trim(p_method), '') = '' then
    raise exception 'Deposit method is required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;

  if p_payment_method_id is not null then
    perform 1
    from public.crypto_payment_methods
    where id = p_payment_method_id
      and status = 'active';

    if not found then
      raise exception 'Selected crypto deposit method is not active';
    end if;
  end if;

  if p_promo_id is not null then
    select *
    into v_promo
    from public.promo_codes
    where id = p_promo_id;

    if not found then
      raise exception 'Promo code not found';
    end if;

    if v_promo.status <> 'active' then
      raise exception 'Promo code is not active';
    end if;

    if v_promo.expiry_date <= now() then
      raise exception 'Promo code has expired';
    end if;

    if v_promo.max_usages > 0 and coalesce(v_promo.usages, 0) >= v_promo.max_usages then
      raise exception 'Promo code usage limit reached';
    end if;

    v_numeric_value := coalesce(
      nullif(regexp_replace(v_promo.reward_value, '[^0-9.]', '', 'g'), ''),
      '0'
    )::numeric;

    if v_promo.type = 'Percentage' then
      v_promo_bonus := p_amount * (v_numeric_value / 100.0);
    elsif v_promo.type = 'Fixed Bonus' then
      v_promo_bonus := v_numeric_value;
    else
      raise exception 'Unsupported promo code type: %', v_promo.type;
    end if;
  end if;

  insert into public.deposit_requests (
    amount,
    method,
    payment_method_id,
    promo_bonus,
    promo_id,
    tx_hash,
    user_id
  )
  values (
    p_amount,
    trim(p_method),
    p_payment_method_id,
    v_promo_bonus,
    p_promo_id,
    nullif(trim(coalesce(p_tx_hash, '')), ''),
    auth.uid()
  )
  returning *
  into v_request;

  return jsonb_build_object(
    'amount', v_request.amount,
    'method', v_request.method,
    'promo_bonus', v_request.promo_bonus,
    'request_id', v_request.id,
    'status', v_request.status
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

grant execute on function public.request_deposit_review(numeric, text, uuid, uuid, text) to authenticated;
grant execute on function public.admin_update_deposit_status(uuid, text, text) to authenticated;

revoke execute on function public.credit_deposit_internal(uuid, numeric, numeric, text) from public, anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'process_deposit_event'
  ) then
    revoke execute on function public.process_deposit_event(numeric, numeric, text) from public, anon, authenticated;
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'process_deposit_checkout'
  ) then
    revoke execute on function public.process_deposit_checkout(numeric, text, uuid) from public, anon, authenticated;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'deposit_requests'
  ) then
    alter publication supabase_realtime add table public.deposit_requests;
  end if;
end $$;
