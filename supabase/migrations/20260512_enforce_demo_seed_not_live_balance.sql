alter table public.profiles
alter column balance set default 0;

update public.profiles
set
  balance = 0,
  welcome_bonus_granted_at = null,
  updated_at = now()
where coalesce(balance, 0) = 10000
  and coalesce(total_deposit, 0) = 0
  and coalesce(total_trades, 0) = 0
  and coalesce(total_profit, 0) = 0
  and coalesce(reserved_withdrawal_balance, 0) = 0
  and welcome_bonus_granted_at is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referred_by uuid;
  v_referral_code text;
begin
  select id
  into v_referred_by
  from public.profiles
  where referral_code = upper(coalesce(NEW.raw_user_meta_data->>'referred_by_code', ''))
  limit 1;

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

  return NEW;
end;
$$;
