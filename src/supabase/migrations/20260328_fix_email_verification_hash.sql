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
