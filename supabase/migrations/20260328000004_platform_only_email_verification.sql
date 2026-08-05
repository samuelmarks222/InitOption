create or replace function public.is_email_verified_internal(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_platform_verified_at text;
begin
  select nullif(trim(u.raw_user_meta_data ->> 'platform_email_verified_at'), '')
  into v_platform_verified_at
  from auth.users u
  where u.id = p_user_id;

  return v_platform_verified_at is not null;
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
