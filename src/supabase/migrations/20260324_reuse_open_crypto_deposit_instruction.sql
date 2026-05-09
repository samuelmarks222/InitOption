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

  select i.*
  into v_instruction
  from public.crypto_deposit_instructions i
  join public.deposit_requests r
    on r.id = i.deposit_request_id
  where i.user_id = auth.uid()
    and i.payment_method_id = v_method.id
    and i.instruction_status in ('awaiting_payment', 'payment_detected', 'confirming')
    and r.status = 'pending'
    and i.expected_amount_usd = p_amount
    and (
      (p_promo_id is null and r.promo_id is null)
      or r.promo_id = p_promo_id
    )
  order by i.created_at desc
  limit 1
  for update;

  if found then
    return jsonb_build_object(
      'address', v_instruction.deposit_address,
      'amount', v_instruction.expected_amount_usd,
      'confirmations_required', v_instruction.required_confirmations,
      'created_at', v_instruction.created_at,
      'deposit_request_id', v_instruction.deposit_request_id,
      'instruction_id', v_instruction.id,
      'instruction_status', v_instruction.instruction_status,
      'memo_label', v_instruction.memo_label,
      'memo_value', v_instruction.memo_value,
      'payment_method_id', v_instruction.payment_method_id,
      'promo_bonus', v_instruction.promo_bonus
    );
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
    'created_at', v_instruction.created_at,
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
