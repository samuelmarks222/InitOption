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
      'withdrawal_processing',
      'withdrawal_completed',
      'withdrawal_failed',
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
      'trade_copied',
      'email_verification_code',
      'email_verified'
    )
  );

alter table public.platform_settings
  add column if not exists mpesa_withdrawal_approval_threshold_kes numeric not null default 10000;

alter table public.profiles
  add column if not exists reserved_withdrawal_balance numeric not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_reserved_withdrawal_balance_check'
  ) then
    alter table public.profiles
      add constraint profiles_reserved_withdrawal_balance_check
      check (reserved_withdrawal_balance >= 0);
  end if;
end
$$;

alter table public.withdrawal_requests
  add column if not exists approval_required boolean not null default false,
  add column if not exists approval_threshold_kes numeric,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists auto_approved boolean not null default false,
  add column if not exists audit_log jsonb not null default '[]'::jsonb,
  add column if not exists completed_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists failure_reason text,
  add column if not exists last_processing_error text,
  add column if not exists merchant_ref text,
  add column if not exists next_retry_at timestamptz not null default now(),
  add column if not exists processing_attempts integer not null default 0,
  add column if not exists processing_started_at timestamptz,
  add column if not exists queued_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists request_ip text,
  add column if not exists request_user_agent text;

update public.withdrawal_requests
set
  approval_threshold_kes = coalesce(approval_threshold_kes, 10000),
  audit_log = coalesce(audit_log, '[]'::jsonb),
  next_retry_at = coalesce(next_retry_at, created_at, now()),
  processing_attempts = coalesce(processing_attempts, 0)
where approval_threshold_kes is null
   or audit_log is null
   or next_retry_at is null
   or processing_attempts is null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'withdrawal_requests_status_check'
  ) then
    alter table public.withdrawal_requests
      drop constraint withdrawal_requests_status_check;
  end if;

  alter table public.withdrawal_requests
    add constraint withdrawal_requests_status_check
    check (status in ('pending', 'approved', 'processing', 'completed', 'failed', 'rejected'));
end
$$;

create index if not exists withdrawal_requests_provider_queue_idx
  on public.withdrawal_requests(provider_name, status, next_retry_at, created_at);

create unique index if not exists withdrawal_requests_merchant_ref_uidx
  on public.withdrawal_requests(merchant_ref)
  where merchant_ref is not null;

create or replace function public.request_mobile_money_withdrawal(
  p_amount numeric,
  p_amount_kes numeric,
  p_phone_number text,
  p_provider_channel text default '63902',
  p_request_ip text default null,
  p_request_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available_balance numeric := 0;
  v_bonus_total numeric := 0;
  v_phone_number text := nullif(trim(coalesce(p_phone_number, '')), '');
  v_profile public.profiles%rowtype;
  v_request public.withdrawal_requests%rowtype;
  v_require_kyc boolean := true;
  v_required_turnover numeric := 0;
  v_threshold_kes numeric := 10000;
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

  if coalesce(p_amount_kes, 0) <= 0 then
    raise exception 'Withdrawal amount in KES must be positive';
  end if;

  if v_phone_number is null then
    raise exception 'A valid M-PESA number is required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  select
    coalesce(ps.require_kyc_withdrawal, true),
    coalesce(ps.mpesa_withdrawal_approval_threshold_kes, 10000)
  into
    v_require_kyc,
    v_threshold_kes
  from public.platform_settings ps
  order by ps.updated_at desc
  limit 1;

  if coalesce(v_require_kyc, true) and lower(coalesce(v_profile.kyc_status, '')) not in ('verified', 'approved') then
    raise exception 'Account verification is required before withdrawal';
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

  v_available_balance := greatest(
    0,
    coalesce(v_profile.balance, 0) - coalesce(v_profile.reserved_withdrawal_balance, 0)
  );

  if v_available_balance < p_amount then
    raise exception 'Insufficient available balance';
  end if;

  update public.profiles
  set
    reserved_withdrawal_balance = coalesce(reserved_withdrawal_balance, 0) + p_amount,
    updated_at = now()
  where id = auth.uid();

  insert into public.withdrawal_requests (
    amount,
    approval_required,
    approval_threshold_kes,
    approved_at,
    auto_approved,
    audit_log,
    destination,
    merchant_ref,
    method,
    next_retry_at,
    provider_amount,
    provider_channel,
    provider_currency,
    provider_name,
    provider_phone_number,
    provider_status,
    queued_at,
    request_ip,
    request_user_agent,
    status,
    user_id
  )
  values (
    p_amount,
    p_amount_kes > v_threshold_kes,
    v_threshold_kes,
    case when p_amount_kes > v_threshold_kes then null else now() end,
    p_amount_kes <= v_threshold_kes,
    jsonb_build_array(
      jsonb_build_object(
        'action', 'requested',
        'actor_id', auth.uid(),
        'amount', p_amount,
        'amount_kes', p_amount_kes,
        'created_at', now(),
        'status', case when p_amount_kes > v_threshold_kes then 'pending' else 'approved' end
      )
    ),
    v_phone_number,
    concat('WITHDRAW_', replace(auth.uid()::text, '-', ''), '_', floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
    'M-PESA Mobile Money',
    now(),
    p_amount_kes,
    nullif(trim(coalesce(p_provider_channel, '')), ''),
    'KES',
    'sasapay',
    v_phone_number,
    case when p_amount_kes > v_threshold_kes then 'awaiting_approval' else 'queued' end,
    case when p_amount_kes > v_threshold_kes then null else now() end,
    nullif(trim(coalesce(p_request_ip, '')), ''),
    nullif(trim(coalesce(p_request_user_agent, '')), ''),
    case when p_amount_kes > v_threshold_kes then 'pending' else 'approved' end,
    auth.uid()
  )
  returning *
  into v_request;

  perform public.create_notification_internal(
    auth.uid(),
    'withdrawal_requested',
    'Withdrawal request received',
    format(
      'Your M-PESA withdrawal request for $%s was received and %s.',
      trim(to_char(p_amount, 'FM999999990.00')),
      case
        when v_request.status = 'pending' then 'is waiting for approval'
        else 'is queued for processing'
      end
    ),
    '/withdraw',
    jsonb_build_object(
      'amount', v_request.amount,
      'amount_kes', p_amount_kes,
      'approval_required', v_request.approval_required,
      'destination', v_request.destination,
      'method', v_request.method,
      'status', v_request.status,
      'withdrawal_request_id', v_request.id
    ),
    concat('withdrawal_request:', v_request.id::text, ':requested'),
    null
  );

  return jsonb_build_object(
    'amount', v_request.amount,
    'amount_kes', p_amount_kes,
    'approval_required', v_request.approval_required,
    'auto_approved', v_request.auto_approved,
    'masked_destination', v_request.destination,
    'request_id', v_request.id,
    'status', v_request.status
  );
end;
$$;

create or replace function public.admin_review_mobile_money_withdrawal(
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
  v_now timestamptz := now();
  v_request public.withdrawal_requests%rowtype;
  v_status text := lower(trim(coalesce(p_status, '')));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'finance_manager'::public.app_role)
  ) then
    raise exception 'Only finance managers or super admins can review mobile money withdrawal requests';
  end if;

  if v_status not in ('approved', 'rejected') then
    raise exception 'Mobile money withdrawal status must be approved or rejected';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where id = p_request_id
    and provider_name = 'sasapay'
  for update;

  if not found then
    raise exception 'Mobile money withdrawal request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending mobile money withdrawal requests can be reviewed';
  end if;

  if v_status = 'approved' then
    update public.withdrawal_requests
    set
      admin_note = p_admin_note,
      approved_at = v_now,
      approved_by = auth.uid(),
      audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'action', 'approved',
          'actor_id', auth.uid(),
          'admin_note', p_admin_note,
          'created_at', v_now
        )
      ),
      next_retry_at = v_now,
      processed_at = null,
      processed_by = null,
      provider_result_code = null,
      provider_result_desc = null,
      provider_status = 'approved',
      queued_at = coalesce(queued_at, v_now),
      status = 'approved',
      updated_at = v_now
    where id = v_request.id
    returning *
    into v_request;

    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_approved',
      'Withdrawal approved',
      format(
        'Your M-PESA withdrawal of $%s has been approved and is queued for processing.',
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/withdraw',
      jsonb_build_object(
        'amount', v_request.amount,
        'method', v_request.method,
        'status', v_request.status,
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':approved'),
      null
    );
  else
    update public.withdrawal_requests
    set
      admin_note = p_admin_note,
      audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'action', 'rejected',
          'actor_id', auth.uid(),
          'admin_note', p_admin_note,
          'created_at', v_now
        )
      ),
      failure_reason = coalesce(nullif(trim(coalesce(p_admin_note, '')), ''), 'Rejected by finance team'),
      processed_at = v_now,
      processed_by = auth.uid(),
      provider_result_desc = coalesce(nullif(trim(coalesce(p_admin_note, '')), ''), provider_result_desc),
      provider_status = 'rejected',
      rejected_at = v_now,
      status = 'rejected',
      updated_at = v_now
    where id = v_request.id
    returning *
    into v_request;

    update public.profiles
    set
      reserved_withdrawal_balance = greatest(0, coalesce(reserved_withdrawal_balance, 0) - v_request.amount),
      updated_at = v_now
    where id = v_request.user_id;

    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_rejected',
      'Withdrawal rejected',
      format(
        'Your M-PESA withdrawal of $%s was rejected. The funds remain available in your balance.',
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/withdraw',
      jsonb_build_object(
        'admin_note', p_admin_note,
        'amount', v_request.amount,
        'method', v_request.method,
        'status', v_request.status,
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':rejected'),
      null
    );
  end if;

  return jsonb_build_object(
    'amount', v_request.amount,
    'request_id', v_request.id,
    'status', v_request.status
  );
end;
$$;

create or replace function public.claim_mobile_money_withdrawal(
  p_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_request public.withdrawal_requests%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the service role can claim mobile money withdrawals';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where provider_name = 'sasapay'
    and status = 'approved'
    and coalesce(next_retry_at, now()) <= now()
    and (p_request_id is null or id = p_request_id)
  order by queued_at asc nulls first, created_at asc
  limit 1
  for update skip locked;

  if not found then
    return jsonb_build_object('request_id', null);
  end if;

  update public.withdrawal_requests
  set
    audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'action', 'processing_started',
        'created_at', v_now,
        'status', 'processing'
      )
    ),
    last_processing_error = null,
    processing_attempts = coalesce(processing_attempts, 0) + 1,
    processing_started_at = v_now,
    provider_status = 'processing',
    status = 'processing',
    updated_at = v_now
  where id = v_request.id
  returning *
  into v_request;

  if coalesce(v_request.processing_attempts, 0) = 1 then
    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_processing',
      'Withdrawal processing',
      format(
        'Your M-PESA withdrawal of $%s is now being sent to your phone.',
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/withdraw',
      jsonb_build_object(
        'amount', v_request.amount,
        'method', v_request.method,
        'status', v_request.status,
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':processing'),
      null
    );
  end if;

  return jsonb_build_object(
    'amount', v_request.amount,
    'amount_kes', v_request.provider_amount,
    'merchant_ref', v_request.merchant_ref,
    'phone_number', coalesce(v_request.provider_phone_number, v_request.destination),
    'processing_attempts', v_request.processing_attempts,
    'request_id', v_request.id,
    'status', v_request.status,
    'user_id', v_request.user_id
  );
end;
$$;

create or replace function public.update_mobile_money_withdrawal_dispatch_state(
  p_request_id uuid,
  p_next_status text,
  p_failure_reason text default null,
  p_next_retry_at timestamptz default null,
  p_provider_payload jsonb default '{}'::jsonb,
  p_provider_result_code text default null,
  p_provider_result_desc text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failure_reason text := nullif(trim(coalesce(p_failure_reason, '')), '');
  v_now timestamptz := now();
  v_next_status text := lower(trim(coalesce(p_next_status, '')));
  v_request public.withdrawal_requests%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the service role can update mobile money withdrawal dispatch state';
  end if;

  if v_next_status not in ('approved', 'failed') then
    raise exception 'Dispatch state must move to approved or failed';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where id = p_request_id
    and provider_name = 'sasapay'
  for update;

  if not found then
    raise exception 'Mobile money withdrawal request not found';
  end if;

  if v_request.status in ('completed', 'failed', 'rejected') then
    return jsonb_build_object(
      'request_id', v_request.id,
      'status', v_request.status
    );
  end if;

  if v_next_status = 'approved' then
    update public.withdrawal_requests
    set
      audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'action', 'retry_scheduled',
          'created_at', v_now,
          'failure_reason', coalesce(v_failure_reason, p_provider_result_desc)
        )
      ),
      last_processing_error = coalesce(v_failure_reason, p_provider_result_desc),
      next_retry_at = coalesce(p_next_retry_at, v_now + interval '5 minutes'),
      provider_payload = coalesce(p_provider_payload, provider_payload, '{}'::jsonb),
      provider_result_code = coalesce(nullif(trim(coalesce(p_provider_result_code, '')), ''), provider_result_code),
      provider_result_desc = coalesce(nullif(trim(coalesce(p_provider_result_desc, '')), ''), provider_result_desc),
      provider_status = 'retry_scheduled',
      status = 'approved',
      updated_at = v_now
    where id = v_request.id
    returning *
    into v_request;
  else
    update public.withdrawal_requests
    set
      audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'action', 'dispatch_failed',
          'created_at', v_now,
          'failure_reason', coalesce(v_failure_reason, p_provider_result_desc)
        )
      ),
      failed_at = v_now,
      failure_reason = coalesce(v_failure_reason, p_provider_result_desc, 'Mobile money payout failed'),
      last_processing_error = coalesce(v_failure_reason, p_provider_result_desc, 'Mobile money payout failed'),
      processed_at = v_now,
      processed_by = null,
      provider_payload = coalesce(p_provider_payload, provider_payload, '{}'::jsonb),
      provider_result_code = coalesce(nullif(trim(coalesce(p_provider_result_code, '')), ''), provider_result_code),
      provider_result_desc = coalesce(nullif(trim(coalesce(p_provider_result_desc, '')), ''), provider_result_desc),
      provider_status = 'failed',
      status = 'failed',
      updated_at = v_now
    where id = v_request.id
    returning *
    into v_request;

    update public.profiles
    set
      reserved_withdrawal_balance = greatest(0, coalesce(reserved_withdrawal_balance, 0) - v_request.amount),
      updated_at = v_now
    where id = v_request.user_id;

    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_failed',
      'Withdrawal failed',
      format(
        'Your M-PESA withdrawal of $%s could not be processed. The funds remain available in your balance. %s',
        trim(to_char(v_request.amount, 'FM999999990.00')),
        coalesce(v_request.failure_reason, 'Please try again later.')
      ),
      '/withdraw',
      jsonb_build_object(
        'amount', v_request.amount,
        'failure_reason', v_request.failure_reason,
        'method', v_request.method,
        'status', v_request.status,
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':dispatch_failed'),
      null
    );
  end if;

  return jsonb_build_object(
    'request_id', v_request.id,
    'status', v_request.status
  );
end;
$$;

create or replace function public.process_mobile_money_withdrawal_callback(
  p_request_id uuid default null,
  p_provider_name text default 'sasapay',
  p_provider_request_id text default null,
  p_provider_checkout_id text default null,
  p_provider_transaction_ref text default null,
  p_provider_channel text default null,
  p_provider_phone_number text default null,
  p_provider_amount numeric default null,
  p_provider_currency text default 'KES',
  p_provider_result_code text default null,
  p_provider_result_desc text default null,
  p_provider_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_provider_channel text := nullif(trim(coalesce(p_provider_channel, '')), '');
  v_provider_checkout_id text := nullif(trim(coalesce(p_provider_checkout_id, '')), '');
  v_provider_currency text := coalesce(nullif(trim(coalesce(p_provider_currency, '')), ''), 'KES');
  v_provider_name text := coalesce(nullif(trim(coalesce(p_provider_name, '')), ''), 'sasapay');
  v_provider_phone text := nullif(trim(coalesce(p_provider_phone_number, '')), '');
  v_provider_request_id text := nullif(trim(coalesce(p_provider_request_id, '')), '');
  v_provider_result_code text := nullif(trim(coalesce(p_provider_result_code, '')), '');
  v_provider_result_desc text := nullif(trim(coalesce(p_provider_result_desc, '')), '');
  v_provider_transaction_ref text := nullif(trim(coalesce(p_provider_transaction_ref, '')), '');
  v_request public.withdrawal_requests%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the service role can process mobile money withdrawal callbacks';
  end if;

  if p_request_id is null and v_provider_request_id is null and v_provider_checkout_id is null then
    raise exception 'A withdrawal request identifier is required';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where provider_name = 'sasapay'
    and (
      (p_request_id is not null and id = p_request_id)
      or (v_provider_request_id is not null and provider_request_id = v_provider_request_id)
      or (v_provider_checkout_id is not null and provider_checkout_id = v_provider_checkout_id)
    )
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Withdrawal request not found';
  end if;

  update public.withdrawal_requests
  set
    provider_amount = coalesce(p_provider_amount, provider_amount),
    provider_callback_received_at = v_now,
    provider_channel = coalesce(v_provider_channel, provider_channel),
    provider_checkout_id = coalesce(v_provider_checkout_id, provider_checkout_id),
    provider_currency = coalesce(v_provider_currency, provider_currency),
    provider_name = coalesce(v_provider_name, provider_name),
    provider_payload = coalesce(p_provider_payload, provider_payload, '{}'::jsonb),
    provider_phone_number = coalesce(v_provider_phone, provider_phone_number),
    provider_request_id = coalesce(v_provider_request_id, provider_request_id),
    provider_result_code = coalesce(v_provider_result_code, provider_result_code),
    provider_result_desc = coalesce(v_provider_result_desc, provider_result_desc),
    provider_status = case
      when v_provider_result_code is null then provider_status
      when v_provider_result_code = '0' then 'completed'
      else 'failed'
    end,
    provider_transaction_ref = coalesce(v_provider_transaction_ref, provider_transaction_ref),
    updated_at = v_now
  where id = v_request.id
  returning *
  into v_request;

  if v_request.status in ('completed', 'failed', 'rejected') then
    return jsonb_build_object(
      'request_id', v_request.id,
      'status', v_request.status,
      'succeeded', v_request.status = 'completed'
    );
  end if;

  if v_provider_result_code = '0' then
    update public.profiles
    set
      balance = greatest(0, coalesce(balance, 0) - v_request.amount),
      reserved_withdrawal_balance = greatest(0, coalesce(reserved_withdrawal_balance, 0) - v_request.amount),
      updated_at = v_now
    where id = v_request.user_id;

    update public.withdrawal_requests
    set
      admin_note = coalesce(admin_note, 'Completed by mobile money callback'),
      audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'action', 'completed',
          'created_at', v_now,
          'provider_result_code', v_provider_result_code
        )
      ),
      completed_at = v_now,
      failed_at = null,
      failure_reason = null,
      last_processing_error = null,
      processed_at = v_now,
      processed_by = null,
      status = 'completed',
      updated_at = v_now
    where id = v_request.id
    returning *
    into v_request;

    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_completed',
      'Withdrawal completed',
      format(
        'Your M-PESA withdrawal of $%s was sent successfully.',
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/withdraw',
      jsonb_build_object(
        'amount', v_request.amount,
        'method', v_request.method,
        'provider', v_provider_name,
        'provider_amount', p_provider_amount,
        'provider_currency', v_provider_currency,
        'provider_phone_number', v_provider_phone,
        'provider_transaction_ref', v_provider_transaction_ref,
        'status', v_request.status,
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':completed'),
      null
    );

    return jsonb_build_object(
      'request_id', v_request.id,
      'status', 'completed',
      'succeeded', true
    );
  end if;

  update public.withdrawal_requests
  set
    admin_note = coalesce(v_provider_result_desc, 'Mobile money payout failed'),
    audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'action', 'failed',
        'created_at', v_now,
        'provider_result_code', v_provider_result_code,
        'provider_result_desc', v_provider_result_desc
      )
    ),
    failed_at = v_now,
    failure_reason = coalesce(v_provider_result_desc, 'Mobile money payout failed'),
    last_processing_error = coalesce(v_provider_result_desc, 'Mobile money payout failed'),
    processed_at = v_now,
    processed_by = null,
    status = 'failed',
    updated_at = v_now
  where id = v_request.id
  returning *
  into v_request;

  update public.profiles
  set
    reserved_withdrawal_balance = greatest(0, coalesce(reserved_withdrawal_balance, 0) - v_request.amount),
    updated_at = v_now
  where id = v_request.user_id;

  perform public.create_notification_internal(
    v_request.user_id,
    'withdrawal_failed',
    'Withdrawal failed',
    format(
      'Your M-PESA withdrawal of $%s failed. The funds remain available in your balance. %s',
      trim(to_char(v_request.amount, 'FM999999990.00')),
      coalesce(v_provider_result_desc, 'Please try again later.')
    ),
    '/withdraw',
    jsonb_build_object(
      'amount', v_request.amount,
      'method', v_request.method,
      'provider', v_provider_name,
      'provider_amount', p_provider_amount,
      'provider_currency', v_provider_currency,
      'provider_phone_number', v_provider_phone,
      'provider_result_code', v_provider_result_code,
      'provider_result_desc', v_provider_result_desc,
      'status', v_request.status,
      'withdrawal_request_id', v_request.id
    ),
    concat('withdrawal_request:', v_request.id::text, ':failed'),
    null
  );

  return jsonb_build_object(
    'request_id', v_request.id,
    'status', 'failed',
    'succeeded', false
  );
end;
$$;

grant execute on function public.request_mobile_money_withdrawal(
  numeric,
  numeric,
  text,
  text,
  text,
  text
) to authenticated;

grant execute on function public.admin_review_mobile_money_withdrawal(
  uuid,
  text,
  text
) to authenticated;

grant execute on function public.claim_mobile_money_withdrawal(uuid) to service_role;

grant execute on function public.update_mobile_money_withdrawal_dispatch_state(
  uuid,
  text,
  text,
  timestamptz,
  jsonb,
  text,
  text
) to service_role;

grant execute on function public.process_mobile_money_withdrawal_callback(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text,
  jsonb
) to service_role;
