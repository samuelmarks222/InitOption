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
      'trade_copied',
      'email_verification_code',
      'email_verified'
    )
  );

create table if not exists public.email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_verification_codes_user_idx
  on public.email_verification_codes(user_id, created_at desc);

create index if not exists email_verification_codes_pending_idx
  on public.email_verification_codes(user_id, expires_at)
  where consumed_at is null;

alter table public.email_verification_codes enable row level security;

create or replace function public.is_email_verified_internal(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_confirmed_at timestamptz;
  v_platform_verified_at text;
begin
  select
    coalesce(u.email_confirmed_at, u.confirmed_at),
    nullif(trim(u.raw_user_meta_data ->> 'platform_email_verified_at'), '')
  into
    v_confirmed_at,
    v_platform_verified_at
  from auth.users u
  where u.id = p_user_id;

  return v_confirmed_at is not null or v_platform_verified_at is not null;
end;
$$;

create or replace function public.email_verification_code_hash(
  p_user_id uuid,
  p_email text,
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
      lower(trim(coalesce(p_email, ''))),
      ':',
      trim(coalesce(p_code, ''))
    )
  );
$$;

create or replace function public.queue_notification_email_internal_v2(
  p_notification_id uuid,
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link_url text default null,
  p_data jsonb default '{}'::jsonb,
  p_dedupe_key text default null,
  p_force_send boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery_id uuid;
  v_dedupe_key text;
  v_email_verified boolean := false;
  v_payload jsonb;
  v_recipient_email text;
begin
  select
    nullif(trim(u.email), ''),
    public.is_email_verified_internal(u.id)
  into
    v_recipient_email,
    v_email_verified
  from auth.users u
  where u.id = p_user_id;

  if v_recipient_email is null then
    return null;
  end if;

  if not coalesce(p_force_send, false) and not v_email_verified then
    return null;
  end if;

  if not coalesce(p_force_send, false) and not public.notification_email_enabled_for_type(p_user_id, p_type) then
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

  perform public.queue_notification_email_internal_v2(
    v_notification.id,
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_link_url,
    coalesce(p_data, '{}'::jsonb),
    v_email_dedupe_key,
    false
  );

  return v_notification.id;
end;
$$;

create or replace function public.send_email_verification_code()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_cooldown_seconds integer;
  v_email text;
  v_expires_at timestamptz;
  v_is_verified boolean := false;
  v_notification_id uuid;
  v_recent_code public.email_verification_codes%rowtype;
  v_verification_row public.email_verification_codes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select
    nullif(trim(u.email), ''),
    public.is_email_verified_internal(u.id)
  into
    v_email,
    v_is_verified
  from auth.users u
  where u.id = auth.uid();

  if v_email is null then
    raise exception 'No email address is available for this account';
  end if;

  if v_is_verified then
    return jsonb_build_object(
      'email', v_email,
      'status', 'already_verified'
    );
  end if;

  select *
  into v_recent_code
  from public.email_verification_codes
  where user_id = auth.uid()
    and email = v_email
    and consumed_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if found and v_recent_code.created_at >= now() - interval '60 seconds' then
    v_cooldown_seconds := greatest(
      0,
      60 - floor(extract(epoch from (now() - v_recent_code.created_at)))::integer
    );

    return jsonb_build_object(
      'cooldown_seconds', v_cooldown_seconds,
      'email', v_email,
      'expires_at', v_recent_code.expires_at,
      'status', 'cooldown'
    );
  end if;

  delete from public.email_verification_codes
  where user_id = auth.uid()
    and email = v_email
    and consumed_at is null;

  v_code := lpad(floor(random() * 1000000)::integer::text, 6, '0');
  v_expires_at := now() + interval '10 minutes';

  insert into public.email_verification_codes (
    user_id,
    email,
    code_hash,
    expires_at
  )
  values (
    auth.uid(),
    v_email,
    public.email_verification_code_hash(auth.uid(), v_email, v_code),
    v_expires_at
  )
  returning *
  into v_verification_row;

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    link_url,
    data,
    external_key
  )
  values (
    auth.uid(),
    'email_verification_code',
    'Verify your email',
    'Use the 6-digit code we sent to confirm your email address.',
    '/settings',
    jsonb_build_object(
      'email', v_email,
      'expires_at', v_expires_at
    ),
    concat('email_verification_code:', v_verification_row.id::text)
  )
  returning id into v_notification_id;

  perform public.queue_notification_email_internal_v2(
    v_notification_id,
    auth.uid(),
    'email_verification_code',
    'Verify your email',
    'Use the 6-digit code we sent to confirm your email address.',
    '/settings',
    jsonb_build_object(
      'email', v_email,
      'verification_code', v_code,
      'verification_code_expires_at', v_expires_at,
      'verification_code_expires_in_minutes', 10
    ),
    concat('email-verification:', v_verification_row.id::text),
    true
  );

  return jsonb_build_object(
    'email', v_email,
    'expires_at', v_expires_at,
    'status', 'sent'
  );
end;
$$;

create or replace function public.verify_email_with_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code_input text := trim(coalesce(p_code, ''));
  v_email text;
  v_is_verified boolean := false;
  v_match public.email_verification_codes%rowtype;
  v_verified_at timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if v_code_input !~ '^[0-9]{6}$' then
    raise exception 'Enter the 6-digit code sent to your email';
  end if;

  select
    nullif(trim(u.email), ''),
    public.is_email_verified_internal(u.id)
  into
    v_email,
    v_is_verified
  from auth.users u
  where u.id = auth.uid();

  if v_email is null then
    raise exception 'No email address is available for this account';
  end if;

  if v_is_verified then
    return jsonb_build_object(
      'email', v_email,
      'status', 'already_verified',
      'verified_at', v_verified_at
    );
  end if;

  select *
  into v_match
  from public.email_verification_codes
  where user_id = auth.uid()
    and email = v_email
    and consumed_at is null
    and expires_at > now()
    and code_hash = public.email_verification_code_hash(auth.uid(), v_email, v_code_input)
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Invalid or expired verification code';
  end if;

  update public.email_verification_codes
  set
    consumed_at = v_verified_at,
    updated_at = v_verified_at
  where id = v_match.id;

  update auth.users
  set
    confirmed_at = coalesce(confirmed_at, v_verified_at),
    email_confirmed_at = coalesce(email_confirmed_at, v_verified_at),
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'platform_email_verified_at', v_verified_at
    )
  where id = auth.uid();

  perform public.create_notification_internal(
    auth.uid(),
    'email_verified',
    'Email verified',
    'Your email address is verified and ready for account alerts.',
    '/settings',
    jsonb_build_object(
      'email', v_email,
      'verified_at', v_verified_at
    ),
    concat('email_verified:', auth.uid()::text),
    null
  );

  return jsonb_build_object(
    'email', v_email,
    'status', 'verified',
    'verified_at', v_verified_at
  );
end;
$$;

grant execute on function public.send_email_verification_code() to authenticated;
grant execute on function public.verify_email_with_code(text) to authenticated;
