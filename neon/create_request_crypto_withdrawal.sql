CREATE OR REPLACE FUNCTION public.request_crypto_withdrawal(
    p_amount numeric,
    p_crypto_currency text,
    p_crypto_network text,
    p_destination text,
    p_crypto_memo text,
    p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_profile public.profiles%rowtype;
    v_balance numeric;
    v_reserved_balance numeric;
    v_available_balance numeric;
    v_method_label text;
    v_now timestamptz := now();
    v_merchant_ref text;
    v_forfeited_bonus numeric := 0;
    v_bonus_total numeric := 0;
    v_completed_turnover numeric := 0;
    v_required_turnover numeric := 0;
    v_turnover_complete boolean := false;
    v_pending_count integer := 0;
    v_request_id uuid;
    v_next_balance numeric;
    v_next_reserved numeric;
BEGIN
    -- Check profile exists
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Profile not found');
    END IF;

    v_balance := COALESCE(v_profile.balance, 0);
    v_reserved_balance := COALESCE(v_profile.reserved_withdrawal_balance, 0);
    v_available_balance := GREATEST(0, v_balance - v_reserved_balance);

    -- Method label
    v_method_label := 'CRYPTO ' || upper(p_crypto_currency) || ' (' || upper(p_crypto_network) || ')';

    -- Check pending withdrawal count
    SELECT COUNT(*) INTO v_pending_count FROM public.withdrawal_requests WHERE user_id = p_user_id AND status = 'pending';
    IF v_pending_count > 0 THEN
        RETURN jsonb_build_object('error', 'You already have a pending withdrawal request');
    END IF;

    -- Minimum amount check
    IF p_amount < 10 THEN
        RETURN jsonb_build_object('error', 'Minimum withdrawal is $10');
    END IF;

    -- Destination required
    IF p_destination IS NULL OR p_destination = '' THEN
        RETURN jsonb_build_object('error', 'Withdrawal destination (wallet address) is required');
    END IF;

    -- Generate merchant reference
    v_merchant_ref := 'CRYPTO_' || replace(p_user_id::text, '-', '') || '_' || extract(epoch from v_now)::text;

    -- Insert withdrawal request
    INSERT INTO public.withdrawal_requests (
        amount, destination, method, status, user_id,
        crypto_currency, crypto_network, crypto_wallet_address, crypto_memo,
        merchant_ref, provider_name, audit_log, next_retry_at
    ) VALUES (
        p_amount, p_destination, v_method_label, 'pending', p_user_id,
        upper(p_crypto_currency), upper(p_crypto_network), p_destination, p_crypto_memo,
        v_merchant_ref, 'plisio',
        '[{"action": "requested", "amount": ' || p_amount || ', "crypto_currency": "' || upper(p_crypto_currency) || '", "crypto_network": "' || upper(p_crypto_network) || '", "created_at": "' || to_char(v_now, 'YYYY-MM-DD"T"HH24:MI:SS') || '", "method": "' || v_method_label || '", "status": "pending", "turnover_multiplier": 10}]',
        v_now
    )
    RETURNING id INTO v_request_id;

    -- Update profile balance and reserved balance
    v_next_balance := v_balance - p_amount;
    v_next_reserved := v_reserved_balance + p_amount;

    UPDATE public.profiles
    SET balance = v_next_balance,
        reserved_withdrawal_balance = v_next_reserved,
        updated_at = v_now
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'amount', p_amount,
        'destination', p_destination,
        'method', v_method_label,
        'request_id', v_request_id::text,
        'status', 'pending'
    );
END;
$$;