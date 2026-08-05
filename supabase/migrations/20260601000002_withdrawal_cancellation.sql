alter table public.withdrawal_requests
  add column if not exists cancelled_at timestamptz;

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
    check (status in ('pending', 'approved', 'processing', 'completed', 'failed', 'rejected', 'cancelled'));
end
$$;

create or replace function public.cancel_withdrawal(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.withdrawal_requests%rowtype;
  v_user_id uuid;
  v_audit_entry jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found';
  end if;

  if v_request.user_id <> v_user_id then
    raise exception 'You can only cancel your own withdrawal requests';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending withdrawal requests can be cancelled';
  end if;

  if v_request.provider_name = 'sasapay' then
    raise exception 'Mobile money withdrawals cannot be cancelled';
  end if;

  v_audit_entry := jsonb_build_object(
    'action', 'cancelled',
    'cancelled_at', now(),
    'cancelled_by', v_user_id
  );

  update public.withdrawal_requests
  set
    audit_log = coalesce(audit_log, '[]'::jsonb) || v_audit_entry,
    cancelled_at = now(),
    processed_at = now(),
    status = 'cancelled',
    updated_at = now()
  where id = v_request.id;

  update public.profiles
  set
    balance = balance + v_request.amount,
    updated_at = now()
  where id = v_request.user_id;

  perform public.create_notification_internal(
    v_request.user_id,
    'withdrawal_cancelled',
    'Withdrawal cancelled',
    format(
      'Your withdrawal of $%s was cancelled and the funds have been returned to your balance.',
      trim(to_char(v_request.amount, 'FM999999990.00'))
    ),
    '/withdraw',
    jsonb_build_object(
      'amount', v_request.amount,
      'method', v_request.method,
      'withdrawal_request_id', v_request.id
    ),
    concat('withdrawal_request:', v_request.id::text, ':cancelled'),
    null
  );

  return jsonb_build_object(
    'amount', v_request.amount,
    'request_id', v_request.id,
    'status', 'cancelled'
  );
end;
$$;

grant execute on function public.cancel_withdrawal(uuid) to authenticated;
