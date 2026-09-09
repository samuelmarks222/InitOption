-- Ensure demo balance is always available for new users (persistent across devices)
-- Adds demo_balance column to profiles and seeds existing users

alter table public.profiles
  add column if not exists demo_balance numeric not null default 10000;

-- Backfill existing profiles that have no demo_balance or 0
update public.profiles set demo_balance = 10000 where coalesce(demo_balance, 0) <= 0;

-- Update handle_new_user to explicitly set demo_balance = 10000 for every new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referred_by uuid;
  v_referral_code text;
  v_retries integer := 0;
begin
  select id into v_referred_by
  from public.profiles
  where referral_code = upper(coalesce(NEW.raw_user_meta_data->>'referred_by_code', ''))
  limit 1;

  loop
    begin
      v_referral_code := public.generate_referral_code();
      insert into public.profiles (id, username, display_name, referral_code, referred_by, balance, demo_balance)
      values (
        NEW.id,
        coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        coalesce(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        v_referral_code,
        v_referred_by,
        0,
        10000
      );
      exit;
    exception when unique_violation then
      v_retries := v_retries + 1;
      if v_retries >= 5 then raise; end if;
    end;
  end loop;

  return NEW;
end;
$$;
