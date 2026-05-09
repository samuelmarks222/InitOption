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
