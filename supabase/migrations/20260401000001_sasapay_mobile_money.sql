alter table public.deposit_requests
  add column if not exists provider_name text,
  add column if not exists provider_request_id text,
  add column if not exists provider_checkout_id text,
  add column if not exists provider_transaction_ref text,
  add column if not exists provider_channel text,
  add column if not exists provider_phone_number text,
  add column if not exists provider_currency text,
  add column if not exists provider_amount numeric,
  add column if not exists provider_status text,
  add column if not exists provider_result_code text,
  add column if not exists provider_result_desc text,
  add column if not exists provider_callback_received_at timestamptz,
  add column if not exists provider_payload jsonb not null default '{}'::jsonb;

alter table public.withdrawal_requests
  add column if not exists provider_name text,
  add column if not exists provider_request_id text,
  add column if not exists provider_checkout_id text,
  add column if not exists provider_transaction_ref text,
  add column if not exists provider_channel text,
  add column if not exists provider_phone_number text,
  add column if not exists provider_currency text,
  add column if not exists provider_amount numeric,
  add column if not exists provider_status text,
  add column if not exists provider_result_code text,
  add column if not exists provider_result_desc text,
  add column if not exists provider_callback_received_at timestamptz,
  add column if not exists provider_payload jsonb not null default '{}'::jsonb;

create index if not exists deposit_requests_provider_lookup_idx
  on public.deposit_requests(provider_name, provider_request_id, provider_checkout_id);

create index if not exists withdrawal_requests_provider_lookup_idx
  on public.withdrawal_requests(provider_name, provider_request_id, provider_checkout_id);

create unique index if not exists deposit_requests_provider_request_uidx
  on public.deposit_requests(provider_name, provider_request_id)
  where provider_request_id is not null;

create unique index if not exists deposit_requests_provider_checkout_uidx
  on public.deposit_requests(provider_name, provider_checkout_id)
  where provider_checkout_id is not null;

create unique index if not exists withdrawal_requests_provider_request_uidx
  on public.withdrawal_requests(provider_name, provider_request_id)
  where provider_request_id is not null;

create unique index if not exists withdrawal_requests_provider_checkout_uidx
  on public.withdrawal_requests(provider_name, provider_checkout_id)
  where provider_checkout_id is not null;

create or replace function public.process_mobile_money_deposit_callback(
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
  v_bonus_offer public.deposit_bonus_offers%rowtype;
  v_credit_payload jsonb := '{}'::jsonb;
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
  v_request public.deposit_requests%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Only the service role can process mobile money deposit callbacks';
  end if;

  if p_request_id is null and v_provider_request_id is null and v_provider_checkout_id is null then
    raise exception 'A deposit request identifier is required';
  end if;

  select *
  into v_request
  from public.deposit_requests
  where (p_request_id is not null and id = p_request_id)
     or (v_provider_request_id is not null and provider_request_id = v_provider_request_id)
     or (v_provider_checkout_id is not null and provider_checkout_id = v_provider_checkout_id)
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Deposit request not found';
  end if;

  update public.deposit_requests
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

  if v_request.status <> 'pending' then
    return jsonb_build_object(
      'credited', v_request.status = 'approved',
      'request_id', v_request.id,
      'status', v_request.status
    );
  end if;

  if v_provider_result_code is distinct from '0' then
    update public.deposit_requests
    set
      admin_note = coalesce(v_provider_result_desc, 'Mobile money deposit failed'),
      processed_at = v_now,
      processed_by = null,
      status = 'rejected',
      updated_at = v_now
    where id = v_request.id;

    if v_request.bonus_offer_id is not null then
      update public.deposit_bonus_redemptions
      set
        credited_at = null,
        released_at = v_now,
        status = 'released',
        updated_at = v_now
      where deposit_request_id = v_request.id;
    end if;

    perform public.create_notification_internal(
      v_request.user_id,
      'deposit_rejected',
      'Deposit failed',
      format(
        'Your %s deposit request for $%s could not be completed. %s',
        coalesce(v_request.method, 'mobile money'),
        trim(to_char(v_request.amount, 'FM999999990.00')),
        coalesce(v_provider_result_desc, 'The payment was not completed.')
      ),
      '/deposit',
      jsonb_build_object(
        'amount', v_request.amount,
        'deposit_request_id', v_request.id,
        'method', v_request.method,
        'provider', v_provider_name,
        'provider_amount', p_provider_amount,
        'provider_currency', v_provider_currency,
        'provider_result_code', v_provider_result_code,
        'provider_result_desc', v_provider_result_desc
      ),
      concat('deposit_request:', v_request.id::text, ':mobile_money_rejected'),
      null
    );

    return jsonb_build_object(
      'credited', false,
      'request_id', v_request.id,
      'status', 'rejected'
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
    admin_note = coalesce(admin_note, 'Auto-credited by mobile money callback'),
    credited_amount = nullif(v_credit_payload->>'credited_amount', '')::numeric,
    deposit_bonus = coalesce(nullif(v_credit_payload->>'deposit_bonus', '')::numeric, 0),
    processed_at = v_now,
    processed_by = null,
    promo_bonus = coalesce(nullif(v_credit_payload->>'promo_bonus', '')::numeric, promo_bonus),
    referral_commission = coalesce(nullif(v_credit_payload->>'referral_commission', '')::numeric, 0),
    status = 'approved',
    updated_at = v_now,
    welcome_bonus = coalesce(nullif(v_credit_payload->>'welcome_bonus', '')::numeric, 0)
  where id = v_request.id;

  if v_request.bonus_offer_id is not null then
    update public.deposit_bonus_redemptions
    set
      credited_at = v_now,
      released_at = null,
      status = 'credited',
      updated_at = v_now
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
        concat('deposit_bonus:', v_request.id::text, ':mobile_money_credited'),
        null
      );
    end if;
  end if;

  perform public.create_notification_internal(
    v_request.user_id,
    'deposit_approved',
    'Deposit confirmed',
    format(
      'Your %s deposit of $%s was confirmed and credited automatically.',
      coalesce(v_request.method, 'mobile money'),
      trim(to_char(v_request.amount, 'FM999999990.00'))
    ),
    '/deposit',
    jsonb_build_object(
      'amount', v_request.amount,
      'credited_amount', nullif(v_credit_payload->>'credited_amount', '')::numeric,
      'deposit_request_id', v_request.id,
      'method', v_request.method,
      'provider', v_provider_name,
      'provider_amount', p_provider_amount,
      'provider_currency', v_provider_currency,
      'provider_phone_number', v_provider_phone,
      'provider_transaction_ref', v_provider_transaction_ref
    ),
    concat('deposit_request:', v_request.id::text, ':mobile_money_approved'),
    null
  );

  return jsonb_build_object(
    'credited', true,
    'credited_amount', coalesce(v_credit_payload->>'credited_amount', null),
    'request_id', v_request.id,
    'status', 'approved'
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
  where (p_request_id is not null and id = p_request_id)
     or (v_provider_request_id is not null and provider_request_id = v_provider_request_id)
     or (v_provider_checkout_id is not null and provider_checkout_id = v_provider_checkout_id)
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

  if v_request.status <> 'pending' then
    return jsonb_build_object(
      'request_id', v_request.id,
      'status', v_request.status,
      'succeeded', v_request.status = 'approved'
    );
  end if;

  if v_provider_result_code = '0' then
    update public.withdrawal_requests
    set
      admin_note = coalesce(admin_note, 'Auto-approved by mobile money callback'),
      processed_at = v_now,
      processed_by = null,
      status = 'approved',
      updated_at = v_now
    where id = v_request.id;

    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_approved',
      'Withdrawal completed',
      format(
        'Your %s withdrawal of $%s was sent successfully.',
        coalesce(v_request.method, 'mobile money'),
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
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':mobile_money_approved'),
      null
    );

    return jsonb_build_object(
      'request_id', v_request.id,
      'status', 'approved',
      'succeeded', true
    );
  end if;

  update public.withdrawal_requests
  set
    admin_note = coalesce(v_provider_result_desc, 'Mobile money payout failed'),
    processed_at = v_now,
    processed_by = null,
    status = 'rejected',
    updated_at = v_now
  where id = v_request.id;

  update public.profiles
  set
    balance = balance + v_request.amount,
    updated_at = v_now
  where id = v_request.user_id;

  perform public.create_notification_internal(
    v_request.user_id,
    'withdrawal_rejected',
    'Withdrawal failed',
    format(
      'Your %s withdrawal of $%s failed and the funds were returned to your balance. %s',
      coalesce(v_request.method, 'mobile money'),
      trim(to_char(v_request.amount, 'FM999999990.00')),
      coalesce(v_provider_result_desc, 'Please try again or contact support.')
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
      'withdrawal_request_id', v_request.id
    ),
    concat('withdrawal_request:', v_request.id::text, ':mobile_money_rejected'),
    null
  );

  return jsonb_build_object(
    'request_id', v_request.id,
    'status', 'rejected',
    'succeeded', false
  );
end;
$$;

grant execute on function public.process_mobile_money_deposit_callback(
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
