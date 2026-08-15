-- Migration: Add Plisio crypto withdrawal provider support to withdrawal_requests
-- This extends the existing withdrawal_requests table with columns needed for Plisio payouts
-- while reusing existing provider_* columns where possible.

-- Add crypto-specific provider columns to withdrawal_requests
alter table public.withdrawal_requests
  add column if not exists crypto_currency text,
  add column if not exists crypto_network text,
  add column if not exists crypto_wallet_address text,
  add column if not exists crypto_memo text,
  add column if not exists plisio_operation_id text,
  add column if not exists plisio_fee numeric,
  add column if not exists plisio_status text;

-- Add index for Plisio operation lookups
create index if not exists withdrawal_requests_plisio_lookup_idx
  on public.withdrawal_requests(provider_name, plisio_operation_id)
  where plisio_operation_id is not null;

-- Update status check constraint to include crypto-specific statuses
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
end $$;

-- Create request_crypto_withdrawal function
create or replace function public.request_crypto_withdrawal(
    p_amount numeric,
    p_crypto_currency text,
    p_crypto_network text,
    p_destination text,
    p_crypto_memo text,
    p_user_id uuid
)
returns jsonb
language plpgsql
set search_path = public
as \$\$\$
declare
    v_profile public.profiles%rowtype;
    v_balance numeric;
    v_reserved_balance numeric;
    v_available_balance numeric;
    v_method_label text;
    v_now timestamptz := now();
    v_merchant_ref text;
    v_pending_count integer := 0;
    v_request_id uuid;
    v_next_balance numeric;
    v_next_reserved numeric;
begin
    -- Check profile exists
    select * into v_profile from public.profiles where id = p_user_id;
    if not found then
        return jsonb_build_object('error', 'Profile not found');
    end if;

    v_balance := coalesce(v_profile.balance, 0);
    v_reserved_balance := coalesce(v_profile.reserved_withdrawal_balance, 0);
    v_available_balance := greatest(0, v_balance - v_reserved_balance);

    -- Method label
    v_method_label := 'CRYPTO ' || upper(p_crypto_currency) || ' (' || upper(p_crypto_network) || ')';

    -- Check pending withdrawal count
    select count(*) into v_pending_count from public.withdrawal_requests where user_id = p_user_id and status = 'pending';
    if v_pending_count > 0 then
        return jsonb_build_object('error', 'You already have a pending withdrawal request');
    end if;

    -- Minimum amount check
    if p_amount < 10 then
        return jsonb_build_object('error', 'Minimum withdrawal is \$10');
    end if;

    -- Destination required
    if p_destination is null or p_destination = '' then
        return jsonb_build_object('error', 'Withdrawal destination (wallet address) is required');
    end if;

    -- Generate merchant reference
    v_merchant_ref := 'CRYPTO_' || replace(p_user_id::text, '-', '') || '_' || extract(epoch from v_now)::text;

    -- Insert withdrawal request
    insert into public.withdrawal_requests (
        amount, destination, method, status, user_id,
        crypto_currency, crypto_network, crypto_wallet_address, crypto_memo,
        merchant_ref, provider_name, audit_log, next_retry_at
    ) values (
        p_amount, p_destination, v_method_label, 'pending', p_user_id,
        upper(p_crypto_currency), upper(p_crypto_network), p_destination, p_crypto_memo,
        v_merchant_ref, 'plisio',
        '[{"action": "requested", "amount": ' || p_amount || ', "crypto_currency": "' || upper(p_crypto_currency) || '", "crypto_network": "' || upper(p_crypto_network) || '", "created_at": "' || to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS') || '", "method": "' || v_method_label || '", "status": "pending", "turnover_multiplier": 10}]',
        v_now
    )
    returning id into v_request_id;

    -- Update profile balance and reserved balance
    v_next_balance := v_balance - p_amount;
    v_next_reserved := v_reserved_balance + p_amount;

    update public.profiles
    set balance = v_next_balance,
        reserved_withdrawal_balance = v_next_reserved,
        updated_at = v_now
    where id = p_user_id;

    return jsonb_build_object(
        'amount', p_amount,
        'destination', p_destination,
        'method', v_method_label,
        'request_id', v_request_id::text,
        'status', 'pending'
    );
end;
\$\$\$;

-- Grant execute on new crypto withdrawal functions
grant execute on function public.request_crypto_withdrawal(numeric, text, text, text, text, text) to authenticated;
grant execute on function public.admin_approve_crypto_withdrawal(uuid, text) to authenticated;
grant execute on function public.admin_reject_crypto_withdrawal(uuid, text) to authenticated;
grant execute on function public.process_plisio_crypto_payout(uuid) to service_role;
grant execute on function public.handle_plisio_payout_callback(text, text, text, text, numeric, text, jsonb) to service_role;