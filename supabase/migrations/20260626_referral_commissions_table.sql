create table if not exists public.referral_commissions (
  id uuid not null default gen_random_uuid() primary key,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null references public.profiles(id) on delete cascade,
  deposit_request_id uuid references public.deposit_requests(id) on delete set null,
  deposit_amount numeric not null default 0,
  commission_rate numeric not null default 0,
  commission_amount numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_commissions_referrer on public.referral_commissions(referrer_id);
create index if not exists idx_referral_commissions_referred on public.referral_commissions(referred_user_id);
create index if not exists idx_referral_commissions_created on public.referral_commissions(created_at desc);

alter table public.referral_commissions enable row level security;

create policy "Users can view their own referral commissions"
  on public.referral_commissions for select
  using (auth.uid() = referrer_id);

create policy "Admins can view all referral commissions"
  on public.referral_commissions for select
  using (
    exists (
      select 1 from public.admin_roles
      where user_id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

create or replace function public.credit_deposit_internal(
  p_user_id uuid,
  p_amount numeric,
  p_promo_bonus numeric default 0,
  p_method text default 'card'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_bonus public.bonus_settings%rowtype;
  v_deposit public.deposit_requests%rowtype;
  v_is_first_deposit boolean;
  v_referred_deposit_bonus numeric := 0;
  v_deposit_bonus numeric := 0;
  v_welcome_bonus numeric := 0;
  v_referral_bonus numeric := 0;
  v_total_credit numeric := 0;
  v_referrer_username text;
begin
  if p_user_id is null then
    raise exception 'Target user is required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Deposit amount must be positive';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  select *
  into v_bonus
  from public.bonus_settings
  order by created_at asc
  limit 1;

  select *
  into v_deposit
  from public.deposit_requests
  where user_id = p_user_id
  order by created_at desc
  limit 1;

  v_is_first_deposit := coalesce(v_profile.total_deposit, 0) <= 0;

  if v_profile.referred_by is not null
    and v_is_first_deposit
    and coalesce(v_bonus.referred_deposit_bonus_percent, 0) > 0 then
    v_referred_deposit_bonus := p_amount * (v_bonus.referred_deposit_bonus_percent / 100.0);
  end if;

  if coalesce(v_bonus.deposit_bonus_enabled, false)
    and p_amount >= coalesce(v_bonus.deposit_bonus_min, 0)
    and coalesce(v_bonus.deposit_bonus_percent, 0) > 0 then
    v_deposit_bonus := p_amount * (v_bonus.deposit_bonus_percent / 100.0);
    if coalesce(v_bonus.deposit_bonus_max, 0) > 0 then
      v_deposit_bonus := least(v_deposit_bonus, v_bonus.deposit_bonus_max);
    end if;
  end if;

  if coalesce(v_bonus.welcome_bonus_enabled, false)
    and coalesce(v_bonus.welcome_bonus_trigger, 'first_deposit') = 'first_deposit'
    and v_is_first_deposit
    and v_profile.welcome_bonus_granted_at is null then
    v_welcome_bonus := coalesce(v_bonus.welcome_bonus_amount, 0);
  end if;

  v_total_credit := p_amount + coalesce(p_promo_bonus, 0) + v_referred_deposit_bonus + v_deposit_bonus + v_welcome_bonus;

  update public.profiles
  set
    balance = balance + v_total_credit,
    total_deposit = coalesce(total_deposit, 0) + p_amount,
    welcome_bonus_granted_at = case
      when v_welcome_bonus > 0 and welcome_bonus_granted_at is null then now()
      else welcome_bonus_granted_at
    end,
    updated_at = now()
  where id = p_user_id;

  if v_referred_deposit_bonus > 0 then
    perform public.create_notification_internal(
      p_user_id,
      'deposit_bonus',
      'Referral welcome bonus credited',
      format('You received a %s%% referral welcome bonus: +$%s added to your balance.', trim(to_char(coalesce(v_bonus.referred_deposit_bonus_percent, 0), 'FM999990.0')), trim(to_char(v_referred_deposit_bonus, 'FM999999990.00'))),
      '/deposit',
      jsonb_build_object(
        'amount', v_referred_deposit_bonus,
        'base_amount', p_amount,
        'method', p_method
      ),
      null,
      null
    );
  end if;

  if v_deposit_bonus > 0 then
    perform public.create_notification_internal(
      p_user_id,
      'deposit_bonus',
      'Deposit bonus credited',
      format('Deposit bonus credited: +$%s added to your balance.', trim(to_char(v_deposit_bonus, 'FM999999990.00'))),
      '/deposit',
      jsonb_build_object(
        'amount', v_deposit_bonus,
        'base_amount', p_amount,
        'method', p_method
      ),
      null,
      null
    );
  end if;

  if v_welcome_bonus > 0 then
    perform public.create_notification_internal(
      p_user_id,
      'welcome_bonus',
      'Welcome bonus unlocked',
      format('Welcome! You''ve received a $%s welcome bonus. Start trading now!', trim(to_char(v_welcome_bonus, 'FM999999990.00'))),
      '/trade',
      jsonb_build_object(
        'amount', v_welcome_bonus,
        'trigger', 'first_deposit'
      ),
      concat('welcome_bonus:first_deposit:', p_user_id::text),
      null
    );
  end if;

  if v_profile.referred_by is not null
    and coalesce(v_bonus.referral_commission_enabled, false)
    and coalesce(v_bonus.referral_commission_type, 'deposit') = 'deposit'
    and coalesce(v_bonus.referral_commission_percent, 0) > 0 then
    v_referral_bonus := p_amount * (v_bonus.referral_commission_percent / 100.0);

    update public.profiles
    set
      balance = balance + v_referral_bonus,
      referral_earnings = coalesce(referral_earnings, 0) + v_referral_bonus,
      updated_at = now()
    where id = v_profile.referred_by;

    insert into public.referral_commissions (
      referrer_id, referred_user_id, deposit_request_id,
      deposit_amount, commission_rate, commission_amount, status
    ) values (
      v_profile.referred_by, p_user_id, v_deposit.id,
      p_amount, v_bonus.referral_commission_percent, v_referral_bonus, 'paid'
    );

    select coalesce(username, display_name, 'your referral')
    into v_referrer_username
    from public.profiles
    where id = p_user_id;

    perform public.create_notification_internal(
      v_profile.referred_by,
      'referral_commission',
      'Referral commission earned',
      format('You earned $%s referral commission from %s.', trim(to_char(v_referral_bonus, 'FM999999990.00')), coalesce(v_referrer_username, 'your referral')),
      '/trade',
      jsonb_build_object(
        'amount', v_referral_bonus,
        'base_amount', p_amount,
        'source_user_id', p_user_id,
        'source_type', 'deposit'
      ),
      null,
      null
    );
  end if;

  return jsonb_build_object(
    'credited_amount', v_total_credit,
    'referred_deposit_bonus', v_referred_deposit_bonus,
    'deposit_bonus', v_deposit_bonus,
    'welcome_bonus', v_welcome_bonus,
    'promo_bonus', coalesce(p_promo_bonus, 0),
    'referral_commission', v_referral_bonus
  );
end;
$$;
