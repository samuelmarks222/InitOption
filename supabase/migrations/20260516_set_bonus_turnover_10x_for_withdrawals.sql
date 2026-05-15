-- Keep withdrawal eligibility aligned with the platform bonus terms.
-- The public site communicates 10x bonus turnover, so withdrawal RPCs should
-- enforce 10x instead of the older 30x requirement.

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
    v_required_turnover := round(v_bonus_total * 10, 2);

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

grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;

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
    v_required_turnover := round(v_bonus_total * 10, 2);

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
        'status', case when p_amount_kes > v_threshold_kes then 'pending' else 'approved' end,
        'turnover_multiplier', 10
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

grant execute on function public.request_mobile_money_withdrawal(
  numeric,
  numeric,
  text,
  text,
  text,
  text
) to authenticated;
