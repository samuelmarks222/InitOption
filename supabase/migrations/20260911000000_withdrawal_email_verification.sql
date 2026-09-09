-- Withdrawal Email Verification System
-- Creates withdrawal-specific verification codes that are required before processing withdrawals

-- Add withdrawal_verification_codes table
create table if not exists public.withdrawal_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  withdrawal_request_id uuid not null references public.withdrawal_requests(id) on delete cascade,
  code_hash text not null,
  email text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists withdrawal_verification_codes_user_idx
  on public.withdrawal_verification_codes(user_id, created_at desc);

create index if not exists withdrawal_verification_codes_withdrawal_idx
  on public.withdrawal_verification_codes(withdrawal_request_id, consumed_at);

-- Function to generate withdrawal verification code hash
create or replace function public.withdrawal_verification_code_hash(
  p_user_id uuid,
  p_withdrawal_request_id uuid,
  p_code text
)
returns text
language sql
immutable
as $$
  select md5(
    concat(
      coalesce(p_user_id::text, ''),
      ':',
      coalesce(p_withdrawal_request_id::text, ''),
      ':',
      trim(coalesce(p_code, ''))
    )
  );
$$;

-- Send withdrawal verification code
create or replace function public.send_withdrawal_verification_code(
  p_withdrawal_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_withdrawal public.withdrawal_requests%rowtype;
  v_user_id uuid;
  v_email text;
  v_code text;
  v_expires_at timestamptz;
  v_code_hash text;
  v_notification_id uuid;
  v_code_text text;
begin
  -- Get withdrawal request and user info
  select wr.*, p.email
  into v_withdrawal
  from public.withdrawal_requests wr
  join public.users u on u.id = wr.user_id
  where wr.id = p_withdrawal_request_id;

  if not found then
    raise exception 'Withdrawal request not found';
  end if;

  v_email := v_withdrawal.email;
  v_user_id := v_withdrawal.user_id;

  if v_withdrawal.status not in ('pending', 'awaiting_approval', 'awaiting_verification') then
    raise exception 'Withdrawal is not in a state that requires verification';
  end if;

  -- Generate 6-digit code
  v_code_text := lpad(floor(random() * 1000000)::integer::text, 6, '0');
  v_code_hash := public.withdrawal_verification_code_hash(
    v_withdrawal.user_id,
    v_withdrawal.id,
    trim(v_code_text)
  );

  -- Delete any existing unconsumed codes for this withdrawal
  delete from public.withdrawal_verification_codes
  where withdrawal_request_id = p_withdrawal_request_id
    and consumed_at is null;

  -- Insert new verification code
  insert into public.withdrawal_verification_codes (
    user_id,
    withdrawal_request_id,
    code_hash,
    email,
    expires_at
  )
  values (
    v_withdrawal.user_id,
    p_withdrawal_request_id,
    public.withdrawal_verification_code_hash(v_withdrawal.user_id, p_withdrawal_request_id, trim(v_code_text)),
    v_withdrawal.email,
    now() + interval '10 minutes'
  );

  -- Send email notification
  perform public.queue_notification_email_internal_v2(
    gen_random_uuid(),
    v_withdrawal.user_id,
    'withdrawal_verification',
    'Confirm Your Withdrawal',
    'Use the 6-digit code below to confirm your withdrawal request.',
    '/withdraw',
    jsonb_build_object(
      'withdrawal_request_id', p_withdrawal_request_id,
      'verification_code', v_code_text,
      'expires_at', now() + interval '10 minutes'
    ),
    concat('withdrawal_verification:', p_withdrawal_request_id::text),
    true
  );

  return jsonb_build_object(
    'status', 'sent',
    'email', v_withdrawal.email,
    'expires_at', now() + interval '10 minutes',
    'message', 'A 6-digit verification code has been sent to your email. Please enter it to confirm your withdrawal.'
  );
end;
$$;

-- Verify withdrawal verification code
create or replace function public.verify_withdrawal_code(
  p_withdrawal_request_id uuid,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_withdrawal public.withdrawal_requests%rowtype;
  v_code_input text := trim(coalesce(p_code, ''));
  v_match public.withdrawal_verification_codes%rowtype;
  v_verified_at timestamptz := now();
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if v_code_input !~ '^[0-9]{6}$' then
    raise exception 'Enter the 6-digit code sent to your email';
  end if;

  -- Get withdrawal request
  select *
  into v_withdrawal
  from public.withdrawal_requests
  where id = p_withdrawal_request_id
    and user_id = current_setting('app.current_user_id', true)::uuid;

  if not found then
    raise exception 'Withdrawal request not found';
  end if;

  -- Find matching verification code
  select *
  into v_withdrawal
  from public.withdrawal_verification_codes
  where withdrawal_request_id = p_withdrawal_request_id
    and consumed_at is null
    and expires_at > now()
    and code_hash = public.withdrawal_verification_code_hash(
      current_setting('app.current_user_id', true)::uuid,
      p_withdrawal_request_id,
      trim(p_code)
    )
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Invalid or expired verification code';
  end if;

  -- Mark code as consumed
  update public.withdrawal_verification_codes
  set
    consumed_at = now(),
    updated_at = now()
  where id = v_withdrawal.id;

  -- Update withdrawal request status to await approval/processing
  update public.withdrawal_requests
  set
    status = 'awaiting_approval',
    updated_at = now()
  where id = p_withdrawal_request_id
    and status = 'awaiting_verification';

  return jsonb_build_object(
    'status', 'verified',
    'message', 'Withdrawal verified successfully. Your request is now pending approval.',
    'verified_at', now()
  );
end;
$$;

-- Send email change verification code
create or replace function public.send_email_change_verification_code(
  p_new_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := current_setting('app.current_user_id', true)::uuid;
  v_email text;
  v_is_verified boolean;
  v_code text;
  v_expires_at timestamptz;
  v_notification_id uuid;
  v_code_text text;
  v_verification_row public.email_verification_codes%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- Validate email format
  if trim(coalesce(p_new_email, '')) = '' then
    raise exception 'New email address is required';
  end if;

  if trim(p_new_email) !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' then
    raise exception 'Invalid email format';
  end if;

  -- Get current email and verification status
  select
    nullif(trim(u.email), ''),
    public.is_email_verified_internal(u.id)
  into
    v_email,
    v_is_verified
  from public.users u
  where u.id = current_setting('app.current_user_id', true)::uuid;

  if v_email is null then
    raise exception 'No email address is available for this account';
  end if;

  -- Check if new email is different
  if lower(trim(p_new_email)) = lower(trim(v_email)) then
    raise exception 'New email must be different from current email';
  end if;

  -- Check if new email is already in use
  if exists (select 1 from public.users where lower(email) = lower(trim(p_new_email))) then
    raise exception 'This email is already in use';
  end if;

  -- Delete any existing unconsumed email change codes for this user
  delete from public.email_verification_codes
  where user_id = current_setting('app.current_user_id', true)::uuid
    and email = trim(p_new_email)
    and consumed_at is null;

  -- Generate 6-digit code
  v_code_text := lpad(floor(random() * 1000000)::integer::text, 6, '0');

  -- Insert new verification code
  insert into public.email_verification_codes (
    user_id,
    email,
    code_hash,
    expires_at
  )
  values (
    current_setting('app.current_user_id', true)::uuid,
    trim(p_new_email),
    public.email_verification_code_hash(
      current_setting('app.current_user_id', true)::uuid,
      trim(p_new_email),
      trim(v_code_text)
    ),
    now() + interval '10 minutes'
  )
  returning *
  into v_verification_row;

  -- Send email notification
  perform public.queue_notification_email_internal_v2(
    gen_random_uuid(),
    current_setting('app.current_user_id', true)::uuid,
    'email_change_verification',
    'Confirm Your New Email Address',
    'Use the 6-digit code below to confirm your new email address.',
    '/settings',
    jsonb_build_object(
      'new_email', trim(p_new_email),
      'verification_code', v_code_text,
      'expires_at', now() + interval '10 minutes'
    ),
    concat('email_change_verification:', current_setting('app.current_user_id', true)::uuid::text, ':', trim(p_new_email)),
    true
  );

  return jsonb_build_object(
    'status', 'sent',
    'email', trim(p_new_email),
    'expires_at', now() + interval '10 minutes',
    'message', 'A 6-digit verification code has been sent to your new email. Please enter it to confirm the email change.'
  );
end;
$$;

-- Verify email change code and update email
create or replace function public.verify_email_change_code(
  p_new_email text,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := current_setting('app.current_user_id', true)::uuid;
  v_email text;
  v_is_verified boolean;
  v_match public.email_verification_codes%rowtype;
  v_verified_at timestamptz := now();
  v_code_input text := trim(coalesce(p_code, ''));
  v_new_email text := trim(coalesce(p_new_email, ''));
  v_code_hash text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if v_code_input !~ '^[0-9]{6}$' then
    raise exception 'Enter the 6-digit code sent to your email';
  end if;

  if v_new_email = '' then
    raise exception 'New email address is required';
  end if;

  -- Get current email
  select
    nullif(trim(u.email), ''),
    public.is_email_verified_internal(u.id)
  into
    v_email,
    v_is_verified
  from public.users u
  where u.id = current_setting('app.current_user_id', true)::uuid;

  if v_email is null then
    raise exception 'No email address is available for this account';
  end if;

  if lower(trim(p_new_email)) = lower(trim(v_email)) then
    raise exception 'New email must be different from current email';
  end if;

  -- Check if new email is already in use
  if exists (select 1 from public.users where lower(email) = lower(trim(p_new_email))) then
    raise exception 'This email is already in use';
  end if;

  -- Find matching verification code
  select *
  into v_match
  from public.email_verification_codes
  where user_id = current_setting('app.current_user_id', true)::uuid
    and email = trim(p_new_email)
    and consumed_at is null
    and expires_at > now()
    and code_hash = public.email_verification_code_hash(
      current_setting('app.current_user_id', true)::uuid,
      trim(p_new_email),
      trim(p_code)
    )
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Invalid or expired verification code';
  end if;

  -- Mark code as consumed
  update public.email_verification_codes
  set
    consumed_at = now(),
    updated_at = now()
  where id = v_match.id;

  -- Update user email
  update public.users
  set
    email = trim(p_new_email),
    email_confirmed_at = now(),
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'platform_email_verified_at', now()
    ),
    updated_at = now()
  where id = current_setting('app.current_user_id', true)::uuid;

  -- Update email in withdrawal_requests if needed
  update public.withdrawal_requests
  set
    provider_email = trim(p_new_email),
    updated_at = now()
  where user_id = current_setting('app.current_user_id', true)::uuid
    and provider_email is not null;

  -- Send confirmation notification
  perform public.create_notification_internal(
    current_setting('app.current_user_id', true)::uuid,
    'email_changed',
    'Email Changed Successfully',
    'Your email address has been updated to ' || trim(p_new_email) || '.',
    '/settings',
    jsonb_build_object(
      'old_email', v_email,
      'new_email', trim(p_new_email),
      'changed_at', now()
    ),
    concat('email_changed:', current_setting('app.current_user_id', true)::uuid::text)
  );

  return jsonb_build_object(
    'status', 'verified',
    'email', trim(p_new_email),
    'message', 'Your email address has been successfully updated.',
    'verified_at', now()
  );
end;
$$;

-- Grant execute permissions
grant execute on function public.send_withdrawal_verification_code(uuid) to authenticated;
grant execute on function public.verify_withdrawal_code(uuid, text) to authenticated;
grant execute on function public.send_email_change_verification_code(text) to authenticated;
grant execute on function public.verify_email_change_code(text, text) to authenticated;

grant select, insert, update on public.withdrawal_verification_codes to authenticated;

-- Update withdrawal request to have awaiting_verification status
alter table public.withdrawal_requests
  add column if not exists verification_sent_at timestamptz,
  add column if not exists verification_completed_at timestamptz;

-- Update status check constraint if needed
alter table public.withdrawal_requests
  drop constraint if exists withdrawal_requests_status_check;

alter table public.withdrawal_requests
  add constraint withdrawal_requests_status_check
  check (status in ('pending', 'awaiting_approval', 'awaiting_verification', 'approved', 'processing', 'completed', 'failed', 'rejected', 'payout_failed', 'payout_failed_manual'));