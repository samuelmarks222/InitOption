create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  v_code text;
begin
  v_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  return v_code;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referred_by uuid;
  v_referral_code text;
  v_retries int := 0;
begin
  select id
  into v_referred_by
  from public.profiles
  where referral_code = upper(coalesce(NEW.raw_user_meta_data->>'referred_by_code', ''))
  limit 1;

  loop
    begin
      v_referral_code := public.generate_referral_code();
      insert into public.profiles (id, username, display_name, referral_code, referred_by, balance)
      values (
        NEW.id,
        coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        coalesce(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        v_referral_code,
        v_referred_by,
        0
      );
      exit;
    exception when unique_violation then
      v_retries := v_retries + 1;
      if v_retries >= 5 then
        raise;
      end if;
    end;
  end loop;

  return NEW;
end;
$$;

update public.profiles
set referral_code = coalesce(referral_code, public.generate_referral_code())
where referral_code is null;
