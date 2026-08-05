alter table if exists public.notifications
  drop constraint if exists notifications_type_check;

alter table if exists public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'announcement',
      'welcome_bonus',
      'deposit_bonus',
      'referral_commission',
      'deposit_requested',
      'deposit_approved',
      'deposit_rejected',
      'crypto_deposit_confirmed',
      'withdrawal_requested',
      'withdrawal_approved',
      'withdrawal_rejected',
      'tournament_joined',
      'tournament_started',
      'tournament_ended',
      'tournament_prize',
      'tournament_cancelled',
      'trade_result',
      'kyc_approved',
      'kyc_rejected',
      'promo_code_activated',
      'social_follow',
      'social_trade',
      'copy_trade',
      'trade_copied'
    )
  );

create table if not exists public.notification_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_email text not null,
  notification_type text not null,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'skipped')),
  retry_count integer not null default 0,
  provider_message_id text,
  last_error text,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dedupe_key)
);

create index if not exists notification_email_deliveries_status_idx
  on public.notification_email_deliveries(status, next_attempt_at, created_at);

create index if not exists notification_email_deliveries_user_idx
  on public.notification_email_deliveries(user_id, created_at desc);

alter table public.notification_email_deliveries enable row level security;

drop policy if exists "Admins can view notification email deliveries" on public.notification_email_deliveries;
create policy "Admins can view notification email deliveries"
on public.notification_email_deliveries
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
);

create table if not exists public.tournament_payouts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  participant_id uuid not null references public.tournament_participants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  placement integer not null check (placement between 1 and 3),
  amount numeric not null check (amount >= 0),
  awarded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create index if not exists tournament_payouts_tournament_idx
  on public.tournament_payouts(tournament_id, created_at desc);

alter table public.tournament_payouts enable row level security;

drop policy if exists "Users can view own tournament payouts" on public.tournament_payouts;
create policy "Users can view own tournament payouts"
on public.tournament_payouts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Admins can view tournament payouts" on public.tournament_payouts;
create policy "Admins can view tournament payouts"
on public.tournament_payouts
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'moderator'::public.app_role)
);

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  destination text not null,
  method text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  processed_by uuid references public.profiles(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.withdrawal_requests
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists amount numeric,
  add column if not exists destination text,
  add column if not exists method text,
  add column if not exists status text not null default 'pending',
  add column if not exists admin_note text,
  add column if not exists processed_by uuid references public.profiles(id) on delete set null,
  add column if not exists processed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'withdrawal_requests_amount_check'
  ) then
    alter table public.withdrawal_requests
      add constraint withdrawal_requests_amount_check check (amount > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'withdrawal_requests_status_check'
  ) then
    alter table public.withdrawal_requests
      add constraint withdrawal_requests_status_check check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists withdrawal_requests_user_status_idx
  on public.withdrawal_requests(user_id, status, created_at desc);

create index if not exists withdrawal_requests_status_created_idx
  on public.withdrawal_requests(status, created_at desc);

alter table public.withdrawal_requests enable row level security;

drop policy if exists "Users can view own withdrawal requests" on public.withdrawal_requests;
drop policy if exists "Users can insert own withdrawal requests" on public.withdrawal_requests;
drop policy if exists "Finance admins can view withdrawal requests" on public.withdrawal_requests;
drop policy if exists "Finance admins can update withdrawal requests" on public.withdrawal_requests;

create policy "Users can view own withdrawal requests"
on public.withdrawal_requests
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own withdrawal requests"
on public.withdrawal_requests
for insert
to authenticated
with check (auth.uid() = user_id and status = 'pending');

create policy "Finance admins can view withdrawal requests"
on public.withdrawal_requests
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
);

create policy "Finance admins can update withdrawal requests"
on public.withdrawal_requests
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

drop policy if exists "Allow authenticated full access to tournaments" on public.tournaments;
drop policy if exists "Admins can manage tournaments" on public.tournaments;
create policy "Admins can manage tournaments"
on public.tournaments
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'moderator'::public.app_role)
)
with check (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  or public.has_role(auth.uid(), 'moderator'::public.app_role)
);

drop policy if exists "Allow users to update own participation" on public.tournament_participants;
drop policy if exists "Users can update own tournament participation" on public.tournament_participants;
create policy "Users can update own tournament participation"
on public.tournament_participants
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.jsonb_boolean_value(
  p_source jsonb,
  p_key text,
  p_default boolean
)
returns boolean
language sql
immutable
as $$
  select case
    when jsonb_typeof(coalesce(p_source, '{}'::jsonb) -> p_key) = 'boolean'
      then (p_source ->> p_key)::boolean
    else p_default
  end;
$$;

create or replace function public.notification_email_settings_for_user(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_preferences jsonb := '{}'::jsonb;
begin
  select coalesce(u.raw_user_meta_data->'notificationPreferences', '{}'::jsonb)
  into v_preferences
  from auth.users u
  where u.id = p_user_id;

  return jsonb_build_object(
    'emailDepositsWithdrawals', public.jsonb_boolean_value(v_preferences, 'emailDepositsWithdrawals', true),
    'emailTradeExecution', public.jsonb_boolean_value(v_preferences, 'emailTradeExecution', true),
    'emailPromotionsBonuses', public.jsonb_boolean_value(v_preferences, 'emailPromotionsBonuses', true),
    'emailTournaments', public.jsonb_boolean_value(v_preferences, 'emailTournaments', true),
    'emailSecurityKyc', public.jsonb_boolean_value(v_preferences, 'emailSecurityKyc', true)
  );
end;
$$;

create or replace function public.notification_email_enabled_for_type(
  p_user_id uuid,
  p_type text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_settings jsonb := public.notification_email_settings_for_user(p_user_id);
begin
  if p_type = 'announcement' then
    return public.jsonb_boolean_value(v_settings, 'emailPromotionsBonuses', true);
  end if;

  if p_type in (
    'deposit_requested',
    'deposit_approved',
    'deposit_rejected',
    'crypto_deposit_confirmed',
    'withdrawal_requested',
    'withdrawal_approved',
    'withdrawal_rejected'
  ) then
    return public.jsonb_boolean_value(v_settings, 'emailDepositsWithdrawals', true);
  end if;

  if p_type = 'trade_result' then
    return public.jsonb_boolean_value(v_settings, 'emailTradeExecution', true);
  end if;

  if p_type in (
    'welcome_bonus',
    'deposit_bonus',
    'referral_commission',
    'promo_code_activated'
  ) then
    return public.jsonb_boolean_value(v_settings, 'emailPromotionsBonuses', true);
  end if;

  if p_type in (
    'tournament_joined',
    'tournament_started',
    'tournament_ended',
    'tournament_prize',
    'tournament_cancelled'
  ) then
    return public.jsonb_boolean_value(v_settings, 'emailTournaments', true);
  end if;

  if p_type in ('kyc_approved', 'kyc_rejected') then
    return public.jsonb_boolean_value(v_settings, 'emailSecurityKyc', true);
  end if;

  return false;
end;
$$;

create or replace function public.queue_notification_email_internal(
  p_notification_id uuid,
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link_url text default null,
  p_data jsonb default '{}'::jsonb,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery_id uuid;
  v_dedupe_key text;
  v_payload jsonb;
  v_recipient_email text;
begin
  select nullif(trim(u.email), '')
  into v_recipient_email
  from auth.users u
  where u.id = p_user_id;

  if v_recipient_email is null then
    return null;
  end if;

  if not public.notification_email_enabled_for_type(p_user_id, p_type) then
    return null;
  end if;

  v_dedupe_key := coalesce(
    nullif(trim(coalesce(p_dedupe_key, '')), ''),
    concat('notification-email:', p_notification_id::text)
  );

  v_payload := jsonb_strip_nulls(
    coalesce(p_data, '{}'::jsonb) || jsonb_build_object(
      'notification_id', p_notification_id,
      'type', p_type,
      'title', p_title,
      'message', p_message,
      'link_url', p_link_url
    )
  );

  insert into public.notification_email_deliveries (
    notification_id,
    user_id,
    recipient_email,
    notification_type,
    subject,
    payload,
    dedupe_key,
    status,
    retry_count,
    next_attempt_at,
    updated_at
  )
  values (
    p_notification_id,
    p_user_id,
    v_recipient_email,
    p_type,
    p_title,
    v_payload,
    v_dedupe_key,
    'pending',
    0,
    now(),
    now()
  )
  on conflict (dedupe_key)
  do update set
    notification_id = excluded.notification_id,
    user_id = excluded.user_id,
    recipient_email = excluded.recipient_email,
    notification_type = excluded.notification_type,
    subject = excluded.subject,
    payload = excluded.payload,
    updated_at = now(),
    next_attempt_at = case
      when public.notification_email_deliveries.status = 'sent' then public.notification_email_deliveries.next_attempt_at
      else now()
    end,
    status = case
      when public.notification_email_deliveries.status = 'sent' then public.notification_email_deliveries.status
      else 'pending'
    end,
    last_error = case
      when public.notification_email_deliveries.status = 'sent' then public.notification_email_deliveries.last_error
      else null
    end
  returning id into v_delivery_id;

  return v_delivery_id;
end;
$$;

create or replace function public.create_notification_internal(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link_url text default null,
  p_data jsonb default '{}'::jsonb,
  p_external_key text default null,
  p_expires_at timestamp with time zone default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification public.notifications%rowtype;
  v_email_dedupe_key text;
begin
  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    link_url,
    data,
    external_key,
    expires_at
  )
  values (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_link_url,
    coalesce(p_data, '{}'::jsonb),
    p_external_key,
    p_expires_at
  )
  on conflict (user_id, external_key) where external_key is not null
  do update
    set
      title = excluded.title,
      message = excluded.message,
      link_url = excluded.link_url,
      data = excluded.data,
      expires_at = excluded.expires_at
  returning * into v_notification;

  v_email_dedupe_key := case
    when p_external_key is not null then concat('notification-email:', p_user_id::text, ':', p_external_key)
    else concat('notification-email:', v_notification.id::text)
  end;

  perform public.queue_notification_email_internal(
    v_notification.id,
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_link_url,
    coalesce(p_data, '{}'::jsonb),
    v_email_dedupe_key
  );

  return v_notification.id;
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

  perform public.create_notification_internal(
    auth.uid(),
    'deposit_requested',
    'Deposit request received',
    format(
      'Your %s deposit request for $%s was received and is now pending review.',
      trim(p_method),
      trim(to_char(p_amount, 'FM999999990.00'))
    ),
    '/deposit',
    jsonb_build_object(
      'amount', p_amount,
      'deposit_request_id', v_request.id,
      'method', trim(p_method),
      'promo_bonus', v_promo_bonus
    ),
    concat('deposit_request:', v_request.id::text, ':requested'),
    null
  );

  if p_promo_id is not null and v_promo_bonus > 0 then
    perform public.create_notification_internal(
      auth.uid(),
      'promo_code_activated',
      'Promo code activated',
      format(
        'Promo code %s was attached to your deposit request. If the deposit is approved, a $%s bonus will be credited automatically.',
        coalesce(v_promo.code, 'promotion'),
        trim(to_char(v_promo_bonus, 'FM999999990.00'))
      ),
      '/deposit',
      jsonb_build_object(
        'amount', v_promo_bonus,
        'code', v_promo.code,
        'deposit_request_id', v_request.id,
        'promo_id', p_promo_id
      ),
      concat('promo_code_activated:', v_request.id::text),
      null
    );
  end if;

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

create or replace function public.request_withdrawal(
  p_amount numeric,
  p_method text,
  p_destination text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus_total numeric := 0;
  v_pending_exists boolean := false;
  v_profile public.profiles%rowtype;
  v_request public.withdrawal_requests%rowtype;
  v_require_kyc boolean := true;
  v_required_turnover numeric := 0;
  v_turnover_done numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Withdrawal amount must be positive';
  end if;

  if p_amount < 10 then
    raise exception 'Minimum withdrawal is $10';
  end if;

  if trim(coalesce(p_method, '')) = '' then
    raise exception 'Withdrawal method is required';
  end if;

  if trim(coalesce(p_destination, '')) = '' then
    raise exception 'Withdrawal destination is required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if coalesce(v_profile.balance, 0) < p_amount then
    raise exception 'Insufficient balance';
  end if;

  select ps.require_kyc_withdrawal
  into v_require_kyc
  from public.platform_settings ps
  order by ps.updated_at desc
  limit 1;

  if coalesce(v_require_kyc, true) and lower(coalesce(v_profile.kyc_status, '')) not in ('verified', 'approved') then
    raise exception 'Account verification is required before withdrawal';
  end if;

  select exists(
    select 1
    from public.withdrawal_requests wr
    where wr.user_id = auth.uid()
      and wr.status = 'pending'
  )
  into v_pending_exists;

  if v_pending_exists then
    raise exception 'You already have a pending withdrawal request';
  end if;

  select coalesce(sum(coalesce(dr.welcome_bonus, 0) + coalesce(dr.deposit_bonus, 0) + coalesce(dr.promo_bonus, 0)), 0)
  into v_bonus_total
  from public.deposit_requests dr
  where dr.user_id = auth.uid()
    and dr.status = 'approved';

  if v_bonus_total > 0 then
    v_required_turnover := round(v_bonus_total * 30, 2);

    select coalesce(sum(t.amount), 0)
    into v_turnover_done
    from public.trades t
    where t.user_id = auth.uid()
      and t.status in ('won', 'lost', 'expired')
      and t.tournament_participant_id is null;

    if v_turnover_done < v_required_turnover then
      raise exception 'Bonus turnover requirement not met. Required volume: $%, completed: $%.',
        trim(to_char(v_required_turnover, 'FM999999990.00')),
        trim(to_char(v_turnover_done, 'FM999999990.00'));
    end if;
  end if;

  update public.profiles
  set
    balance = balance - p_amount,
    updated_at = now()
  where id = auth.uid();

  insert into public.withdrawal_requests (
    amount,
    destination,
    method,
    user_id
  )
  values (
    p_amount,
    trim(p_destination),
    trim(p_method),
    auth.uid()
  )
  returning *
  into v_request;

  perform public.create_notification_internal(
    auth.uid(),
    'withdrawal_requested',
    'Withdrawal request received',
    format(
      'Your withdrawal request for $%s was submitted and is now pending review.',
      trim(to_char(p_amount, 'FM999999990.00'))
    ),
    '/withdraw',
    jsonb_build_object(
      'amount', p_amount,
      'destination', trim(p_destination),
      'method', trim(p_method),
      'withdrawal_request_id', v_request.id
    ),
    concat('withdrawal_request:', v_request.id::text, ':requested'),
    null
  );

  return jsonb_build_object(
    'amount', v_request.amount,
    'destination', v_request.destination,
    'method', v_request.method,
    'request_id', v_request.id,
    'status', v_request.status
  );
end;
$$;

create or replace function public.admin_update_withdrawal_status(
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
  v_request public.withdrawal_requests%rowtype;
  v_next_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
  ) then
    raise exception 'Only finance managers or super admins can update withdrawal requests';
  end if;

  v_next_status := lower(trim(coalesce(p_status, '')));

  if v_next_status not in ('approved', 'rejected') then
    raise exception 'Withdrawal status must be approved or rejected';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending withdrawal requests can be processed';
  end if;

  update public.withdrawal_requests
  set
    admin_note = p_admin_note,
    processed_at = now(),
    processed_by = auth.uid(),
    status = v_next_status,
    updated_at = now()
  where id = v_request.id;

  if v_next_status = 'rejected' then
    update public.profiles
    set
      balance = balance + v_request.amount,
      updated_at = now()
    where id = v_request.user_id;

    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_rejected',
      'Withdrawal rejected',
      format(
        'Your withdrawal of $%s was rejected and the funds were returned to your balance.',
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/withdraw',
      jsonb_build_object(
        'admin_note', p_admin_note,
        'amount', v_request.amount,
        'method', v_request.method,
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':rejected'),
      null
    );
  else
    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_approved',
      'Withdrawal approved',
      format(
        'Your withdrawal of $%s has been approved and is being processed.',
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/withdraw',
      jsonb_build_object(
        'amount', v_request.amount,
        'method', v_request.method,
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':approved'),
      null
    );
  end if;

  return jsonb_build_object(
    'amount', v_request.amount,
    'request_id', v_request.id,
    'status', v_next_status
  );
end;
$$;

create or replace function public.join_tournament(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_tournament public.tournaments%rowtype;
  v_existing_participant public.tournament_participants%rowtype;
  v_participant public.tournament_participants%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;

  if not found then
    raise exception 'Tournament not found';
  end if;

  if v_tournament.status in ('completed', 'cancelled') then
    raise exception 'This tournament is no longer accepting new participants';
  end if;

  select *
  into v_existing_participant
  from public.tournament_participants
  where tournament_id = p_tournament_id
    and user_id = auth.uid()
  limit 1;

  if found then
    return jsonb_build_object(
      'already_joined', true,
      'current_balance', v_existing_participant.current_balance,
      'participant_id', v_existing_participant.id,
      'tournament_id', p_tournament_id
    );
  end if;

  select *
  into v_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if coalesce(v_tournament.entry_fee, 0) > 0 and coalesce(v_profile.balance, 0) < coalesce(v_tournament.entry_fee, 0) then
    raise exception 'Insufficient balance to join this tournament';
  end if;

  if coalesce(v_tournament.entry_fee, 0) > 0 then
    update public.profiles
    set
      balance = balance - v_tournament.entry_fee,
      updated_at = now()
    where id = auth.uid();
  end if;

  insert into public.tournament_participants (
    tournament_id,
    user_id,
    current_balance
  )
  values (
    p_tournament_id,
    auth.uid(),
    coalesce(v_tournament.starting_balance, 0)
  )
  returning *
  into v_participant;

  perform public.create_notification_internal(
    auth.uid(),
    'tournament_joined',
    'Tournament joined',
    format(
      'You joined %s. Your tournament balance is $%s.',
      v_tournament.title,
      trim(to_char(v_participant.current_balance, 'FM999999990.00'))
    ),
    '/trade',
    jsonb_build_object(
      'entry_fee', v_tournament.entry_fee,
      'starting_balance', v_participant.current_balance,
      'tournament_id', v_tournament.id,
      'tournament_title', v_tournament.title
    ),
    concat('tournament_joined:', v_tournament.id::text, ':', auth.uid()::text),
    null
  );

  return jsonb_build_object(
    'already_joined', false,
    'current_balance', v_participant.current_balance,
    'participant_id', v_participant.id,
    'tournament_id', p_tournament_id
  );
end;
$$;

create or replace function public.notify_tournament_participants_internal(
  p_tournament_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link_url text default '/trade',
  p_data jsonb default '{}'::jsonb,
  p_external_key_prefix text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant record;
  v_count integer := 0;
begin
  for v_participant in
    select tp.user_id
    from public.tournament_participants tp
    where tp.tournament_id = p_tournament_id
  loop
    perform public.create_notification_internal(
      v_participant.user_id,
      p_type,
      p_title,
      p_message,
      p_link_url,
      coalesce(p_data, '{}'::jsonb) || jsonb_build_object('tournament_id', p_tournament_id),
      case
        when p_external_key_prefix is null then null
        else concat(p_external_key_prefix, ':', v_participant.user_id::text)
      end,
      null
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.award_tournament_prizes_internal(p_tournament_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_share numeric;
  v_awarded integer := 0;
  v_ranked record;
  v_inserted_payout_id uuid;
begin
  select *
  into v_tournament
  from public.tournaments
  where id = p_tournament_id;

  if not found or coalesce(v_tournament.prize_pool, 0) <= 0 then
    return 0;
  end if;

  for v_ranked in
    with ranked as (
      select
        tp.id as participant_id,
        tp.user_id,
        tp.current_balance,
        row_number() over (
          order by tp.current_balance desc, tp.updated_at asc, tp.created_at asc
        ) as placement
      from public.tournament_participants tp
      where tp.tournament_id = p_tournament_id
    )
    select *
    from ranked
    where placement <= 3
    order by placement asc
  loop
    v_share := case v_ranked.placement
      when 1 then 0.50
      when 2 then 0.30
      when 3 then 0.20
      else 0
    end;

    if v_share <= 0 then
      continue;
    end if;

    insert into public.tournament_payouts (
      tournament_id,
      participant_id,
      user_id,
      placement,
      amount
    )
    values (
      p_tournament_id,
      v_ranked.participant_id,
      v_ranked.user_id,
      v_ranked.placement,
      round(v_tournament.prize_pool * v_share, 2)
    )
    on conflict (tournament_id, user_id)
    do nothing
    returning id into v_inserted_payout_id;

    if v_inserted_payout_id is null then
      continue;
    end if;

    update public.profiles
    set
      balance = balance + round(v_tournament.prize_pool * v_share, 2),
      updated_at = now()
    where id = v_ranked.user_id;

    perform public.create_notification_internal(
      v_ranked.user_id,
      'tournament_prize',
      'Tournament prize awarded',
      format(
        'You finished #%s in %s and won $%s.',
        v_ranked.placement,
        v_tournament.title,
        trim(to_char(round(v_tournament.prize_pool * v_share, 2), 'FM999999990.00'))
      ),
      '/trade',
      jsonb_build_object(
        'amount', round(v_tournament.prize_pool * v_share, 2),
        'placement', v_ranked.placement,
        'tournament_id', v_tournament.id,
        'tournament_title', v_tournament.title
      ),
      concat('tournament_prize:', v_tournament.id::text, ':', v_ranked.user_id::text),
      null
    );

    v_awarded := v_awarded + 1;
    v_inserted_payout_id := null;
  end loop;

  return v_awarded;
end;
$$;

create or replace function public.admin_update_tournament_status(
  p_tournament_id uuid,
  p_status public.tournament_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_notified integer := 0;
  v_awarded integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'moderator'::public.app_role)
  ) then
    raise exception 'Only admins or moderators can update tournaments';
  end if;

  select *
  into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;

  if not found then
    raise exception 'Tournament not found';
  end if;

  update public.tournaments
  set
    status = p_status,
    updated_at = now()
  where id = p_tournament_id;

  if p_status = 'active' then
    v_notified := public.notify_tournament_participants_internal(
      p_tournament_id,
      'tournament_started',
      'Tournament started',
      format('%s is now live. Open your tournament desk and start competing.', v_tournament.title),
      '/trade',
      jsonb_build_object(
        'tournament_id', v_tournament.id,
        'tournament_title', v_tournament.title,
        'prize_pool', v_tournament.prize_pool,
        'start_date', v_tournament.start_date
      ),
      concat('tournament_started:', v_tournament.id::text)
    );
  elsif p_status = 'completed' then
    v_notified := public.notify_tournament_participants_internal(
      p_tournament_id,
      'tournament_ended',
      'Tournament ended',
      format('%s has ended. Final standings are now available.', v_tournament.title),
      '/notifications',
      jsonb_build_object(
        'tournament_id', v_tournament.id,
        'tournament_title', v_tournament.title,
        'end_date', v_tournament.end_date
      ),
      concat('tournament_ended:', v_tournament.id::text)
    );

    v_awarded := public.award_tournament_prizes_internal(p_tournament_id);
  elsif p_status = 'cancelled' then
    v_notified := public.notify_tournament_participants_internal(
      p_tournament_id,
      'tournament_cancelled',
      'Tournament cancelled',
      format('%s was cancelled. Any entry adjustments will be handled by support.', v_tournament.title),
      '/notifications',
      jsonb_build_object(
        'tournament_id', v_tournament.id,
        'tournament_title', v_tournament.title
      ),
      concat('tournament_cancelled:', v_tournament.id::text)
    );
  end if;

  return jsonb_build_object(
    'awarded_prizes', v_awarded,
    'notified_participants', v_notified,
    'status', p_status,
    'tournament_id', p_tournament_id
  );
end;
$$;

create or replace function public.notify_trade_result(p_trade_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade public.trades%rowtype;
  v_title text;
  v_message text;
  v_notification_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_trade
  from public.trades
  where id = p_trade_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Trade not found';
  end if;

  if v_trade.status = 'open' or v_trade.closed_at is null then
    raise exception 'Trade is still open';
  end if;

  v_title := case
    when v_trade.status = 'won' then 'Trade won'
    when v_trade.status = 'lost' then 'Trade lost'
    else 'Trade closed'
  end;

  v_message := case
    when v_trade.status = 'won' then format(
      'Your %s position on %s closed in profit for $%s.',
      upper(coalesce(v_trade.direction, 'trade')),
      v_trade.asset_symbol,
      trim(to_char(coalesce(v_trade.profit, 0), 'FM999999990.00'))
    )
    else format(
      'Your %s position on %s closed with a result of $%s.',
      upper(coalesce(v_trade.direction, 'trade')),
      v_trade.asset_symbol,
      trim(to_char(coalesce(v_trade.profit, 0), 'FM999999990.00'))
    )
  end;

  v_notification_id := public.create_notification_internal(
    v_trade.user_id,
    'trade_result',
    v_title,
    v_message,
    '/trade',
    jsonb_build_object(
      'amount', v_trade.amount,
      'asset_symbol', v_trade.asset_symbol,
      'direction', v_trade.direction,
      'profit', v_trade.profit,
      'status', v_trade.status,
      'trade_id', v_trade.id,
      'tournament_trade', v_trade.tournament_participant_id is not null
    ),
    concat('trade_result:', v_trade.id::text),
    null
  );

  return v_notification_id;
end;
$$;

create or replace function public.handle_profile_notification_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.kyc_status, '') is distinct from coalesce(old.kyc_status, '') then
    if lower(coalesce(new.kyc_status, '')) in ('verified', 'approved') then
      perform public.create_notification_internal(
        new.id,
        'kyc_approved',
        'KYC approved',
        'Your identity verification has been approved. You can continue with full account access.',
        '/trade',
        jsonb_build_object('kyc_status', new.kyc_status),
        concat('kyc_status:', new.id::text, ':approved'),
        null
      );
    elsif lower(coalesce(new.kyc_status, '')) = 'rejected' then
      perform public.create_notification_internal(
        new.id,
        'kyc_rejected',
        'KYC rejected',
        'Your verification was rejected. Review your submitted details and upload updated documents.',
        '/trade',
        jsonb_build_object('kyc_status', new.kyc_status),
        concat('kyc_status:', new.id::text, ':rejected'),
        null
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profile_notification_events on public.profiles;
create trigger profile_notification_events
after update of kyc_status on public.profiles
for each row
execute function public.handle_profile_notification_events();

grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;
grant execute on function public.admin_update_withdrawal_status(uuid, text, text) to authenticated;
grant execute on function public.join_tournament(uuid) to authenticated;
grant execute on function public.admin_update_tournament_status(uuid, public.tournament_status) to authenticated;
grant execute on function public.notify_trade_result(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'withdrawal_requests'
  ) then
    alter publication supabase_realtime add table public.withdrawal_requests;
  end if;
end $$;
