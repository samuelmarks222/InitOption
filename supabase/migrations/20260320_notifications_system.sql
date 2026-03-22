alter table public.profiles
  add column if not exists vip_tier text default 'none',
  add column if not exists total_deposit double precision default 0,
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.profiles(id) on delete set null,
  add column if not exists referral_earnings numeric not null default 0,
  add column if not exists welcome_bonus_granted_at timestamp with time zone;

create or replace function public.generate_referral_code()
returns text
language sql
as $$
  select upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 10));
$$;

update public.profiles
set referral_code = coalesce(referral_code, public.generate_referral_code())
where referral_code is null;

alter table public.profiles
  alter column referral_code set default public.generate_referral_code(),
  alter column referral_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_referral_code_key'
  ) then
    alter table public.profiles add constraint profiles_referral_code_key unique (referral_code);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'app_role'
  ) then
    create type public.app_role as enum ('admin', 'moderator', 'user');
  end if;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

drop policy if exists "Users can view own roles" on public.user_roles;
create policy "Users can view own roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

create or replace function public.has_role(_role public.app_role, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, _role);
$$;

create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role::text = _role
  );
$$;

create or replace function public.has_role(_role text, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(_user_id, _role);
$$;

create table if not exists public.bonus_settings (
  id uuid primary key default gen_random_uuid(),
  welcome_bonus_enabled boolean not null default false,
  welcome_bonus_amount numeric not null default 0,
  welcome_bonus_trigger text not null default 'first_deposit' check (welcome_bonus_trigger in ('signup', 'first_deposit')),
  deposit_bonus_enabled boolean not null default false,
  deposit_bonus_percent numeric not null default 0,
  deposit_bonus_min numeric not null default 0,
  deposit_bonus_max numeric not null default 0,
  referral_commission_enabled boolean not null default false,
  referral_commission_percent numeric not null default 0,
  referral_commission_type text not null default 'deposit' check (referral_commission_type in ('deposit', 'trade_volume')),
  referral_commission_payout_timing text not null default 'immediate' check (referral_commission_payout_timing in ('immediate', 'after_trade_close')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

insert into public.bonus_settings (
  welcome_bonus_enabled,
  welcome_bonus_amount,
  welcome_bonus_trigger,
  deposit_bonus_enabled,
  deposit_bonus_percent,
  deposit_bonus_min,
  deposit_bonus_max,
  referral_commission_enabled,
  referral_commission_percent,
  referral_commission_type,
  referral_commission_payout_timing
)
select
  false,
  0,
  'first_deposit',
  false,
  0,
  0,
  0,
  false,
  0,
  'deposit',
  'immediate'
where not exists (select 1 from public.bonus_settings);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  link_url text,
  target_roles jsonb not null default '{"all": true}'::jsonb,
  scheduled_at timestamp with time zone,
  expires_at timestamp with time zone,
  status text not null default 'sent' check (status in ('draft', 'scheduled', 'sent')),
  created_by uuid references auth.users(id) on delete set null,
  sent_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('announcement', 'welcome_bonus', 'deposit_bonus', 'referral_commission')),
  title text not null,
  message text not null,
  link_url text,
  data jsonb not null default '{}'::jsonb,
  external_key text,
  is_read boolean not null default false,
  expires_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create unique index if not exists notifications_user_external_key_idx
  on public.notifications(user_id, external_key)
  where external_key is not null;

create index if not exists notifications_user_created_at_idx
  on public.notifications(user_id, created_at desc);

alter table public.bonus_settings enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Admins can view bonus settings" on public.bonus_settings;
create policy "Admins can view bonus settings"
on public.bonus_settings
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins can update bonus settings" on public.bonus_settings;
create policy "Admins can update bonus settings"
on public.bonus_settings
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins can insert bonus settings" on public.bonus_settings;
create policy "Admins can insert bonus settings"
on public.bonus_settings
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins can view announcements" on public.announcements;
create policy "Admins can view announcements"
on public.announcements
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins can insert announcements" on public.announcements;
create policy "Admins can insert announcements"
on public.announcements
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins can update announcements" on public.announcements;
create policy "Admins can update announcements"
on public.announcements
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
on public.notifications
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

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
  v_notification_id uuid;
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
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

create or replace function public.dispatch_announcement_internal(p_announcement_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_announcement public.announcements%rowtype;
  v_inserted_count integer := 0;
begin
  select *
  into v_announcement
  from public.announcements
  where id = p_announcement_id;

  if not found then
    raise exception 'Announcement not found';
  end if;

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
  select
    p.id,
    'announcement',
    v_announcement.title,
    v_announcement.message,
    v_announcement.link_url,
    jsonb_build_object(
      'announcement_id', v_announcement.id,
      'target', v_announcement.target_roles
    ),
    concat('announcement:', v_announcement.id::text),
    v_announcement.expires_at
  from public.profiles p
  left join public.user_roles ur
    on ur.user_id = p.id
  where
    coalesce((v_announcement.target_roles->>'all')::boolean, false)
    or p.id in (
      select value::uuid
      from jsonb_array_elements_text(coalesce(v_announcement.target_roles->'user_ids', '[]'::jsonb))
    )
    or lower(coalesce(p.vip_tier, '')) in (
      select lower(value)
      from jsonb_array_elements_text(coalesce(v_announcement.target_roles->'tiers', '[]'::jsonb))
    )
    or coalesce(ur.role::text, '') in (
      select value
      from jsonb_array_elements_text(coalesce(v_announcement.target_roles->'roles', '[]'::jsonb))
    )
  on conflict (user_id, external_key) where external_key is not null
  do nothing;

  get diagnostics v_inserted_count = row_count;

  update public.announcements
  set
    status = 'sent',
    sent_at = now()
  where id = v_announcement.id;

  return v_inserted_count;
end;
$$;

create or replace function public.admin_create_announcement(
  p_title text,
  p_message text,
  p_target_roles jsonb default '{"all": true}'::jsonb,
  p_link_url text default null,
  p_scheduled_at timestamp with time zone default null,
  p_expires_at timestamp with time zone default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_announcement_id uuid;
  v_status text := case when p_scheduled_at is not null and p_scheduled_at > now() then 'scheduled' else 'sent' end;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Only admins can create announcements';
  end if;

  insert into public.announcements (
    title,
    message,
    link_url,
    target_roles,
    scheduled_at,
    expires_at,
    status,
    created_by,
    sent_at
  )
  values (
    p_title,
    p_message,
    p_link_url,
    coalesce(p_target_roles, '{"all": true}'::jsonb),
    p_scheduled_at,
    p_expires_at,
    v_status,
    auth.uid(),
    case when v_status = 'sent' then now() else null end
  )
  returning id into v_announcement_id;

  if v_status = 'sent' then
    perform public.dispatch_announcement_internal(v_announcement_id);
  end if;

  return v_announcement_id;
end;
$$;

create or replace function public.dispatch_due_announcements()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_announcement record;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Only admins can dispatch scheduled announcements';
  end if;

  for v_announcement in
    select id
    from public.announcements
    where status = 'scheduled'
      and scheduled_at is not null
      and scheduled_at <= now()
    order by scheduled_at asc
  loop
    perform public.dispatch_announcement_internal(v_announcement.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.process_deposit_event(
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
  v_is_first_deposit boolean;
  v_deposit_bonus numeric := 0;
  v_welcome_bonus numeric := 0;
  v_referral_bonus numeric := 0;
  v_total_credit numeric := 0;
  v_referrer_username text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Deposit amount must be positive';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  select *
  into v_bonus
  from public.bonus_settings
  order by created_at asc
  limit 1;

  v_is_first_deposit := coalesce(v_profile.total_deposit, 0) <= 0;

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

  v_total_credit := p_amount + coalesce(p_promo_bonus, 0) + v_deposit_bonus + v_welcome_bonus;

  update public.profiles
  set
    balance = balance + v_total_credit,
    total_deposit = coalesce(total_deposit, 0) + p_amount,
    welcome_bonus_granted_at = case
      when v_welcome_bonus > 0 and welcome_bonus_granted_at is null then now()
      else welcome_bonus_granted_at
    end,
    updated_at = now()
  where id = auth.uid();

  if v_deposit_bonus > 0 then
    perform public.create_notification_internal(
      auth.uid(),
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
      auth.uid(),
      'welcome_bonus',
      'Welcome bonus unlocked',
      format('Welcome! You''ve received a $%s welcome bonus. Start trading now!', trim(to_char(v_welcome_bonus, 'FM999999990.00'))),
      '/trade',
      jsonb_build_object(
        'amount', v_welcome_bonus,
        'trigger', 'first_deposit'
      ),
      concat('welcome_bonus:first_deposit:', auth.uid()::text),
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

    select coalesce(username, display_name, 'your referral')
    into v_referrer_username
    from public.profiles
    where id = auth.uid();

    perform public.create_notification_internal(
      v_profile.referred_by,
      'referral_commission',
      'Referral commission earned',
      format('You earned $%s referral commission from %s.', trim(to_char(v_referral_bonus, 'FM999999990.00')), coalesce(v_referrer_username, 'your referral')),
      '/trade',
      jsonb_build_object(
        'amount', v_referral_bonus,
        'base_amount', p_amount,
        'source_user_id', auth.uid(),
        'source_type', 'deposit'
      ),
      null,
      null
    );
  end if;

  return jsonb_build_object(
    'credited_amount', v_total_credit,
    'deposit_bonus', v_deposit_bonus,
    'welcome_bonus', v_welcome_bonus,
    'referral_commission', v_referral_bonus
  );
end;
$$;

create or replace function public.process_trade_referral_commission(
  p_trade_id uuid,
  p_event text
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade public.trades%rowtype;
  v_profile public.profiles%rowtype;
  v_bonus public.bonus_settings%rowtype;
  v_commission numeric := 0;
  v_referral_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_trade
  from public.trades
  where id = p_trade_id
    and user_id = auth.uid();

  if not found then
    raise exception 'Trade not found';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = auth.uid();

  if v_profile.referred_by is null then
    return 0;
  end if;

  select *
  into v_bonus
  from public.bonus_settings
  order by created_at asc
  limit 1;

  if not coalesce(v_bonus.referral_commission_enabled, false)
    or coalesce(v_bonus.referral_commission_type, 'deposit') <> 'trade_volume'
    or coalesce(v_bonus.referral_commission_percent, 0) <= 0 then
    return 0;
  end if;

  if coalesce(v_bonus.referral_commission_payout_timing, 'immediate') = 'immediate' and p_event <> 'trade_open' then
    return 0;
  end if;

  if coalesce(v_bonus.referral_commission_payout_timing, 'immediate') = 'after_trade_close' and p_event <> 'trade_close' then
    return 0;
  end if;

  v_commission := coalesce(v_trade.amount, 0) * (v_bonus.referral_commission_percent / 100.0);
  if v_commission <= 0 then
    return 0;
  end if;

  update public.profiles
  set
    balance = balance + v_commission,
    referral_earnings = coalesce(referral_earnings, 0) + v_commission,
    updated_at = now()
  where id = v_profile.referred_by;

  select coalesce(username, display_name, 'your referral')
  into v_referral_name
  from public.profiles
  where id = auth.uid();

  perform public.create_notification_internal(
    v_profile.referred_by,
    'referral_commission',
    'Referral commission earned',
    format('You earned $%s referral commission from %s.', trim(to_char(v_commission, 'FM999999990.00')), coalesce(v_referral_name, 'your referral')),
    '/trade/history',
    jsonb_build_object(
      'amount', v_commission,
      'source_trade_id', v_trade.id,
      'source_user_id', auth.uid(),
      'source_type', 'trade_volume',
      'payout_event', p_event
    ),
    concat('referral_commission:trade:', p_event, ':', v_trade.id::text),
    null
  );

  return v_commission;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus public.bonus_settings%rowtype;
  v_referred_by uuid;
  v_referral_code text;
begin
  select id
  into v_referred_by
  from public.profiles
  where referral_code = upper(coalesce(NEW.raw_user_meta_data->>'referred_by_code', ''))
  limit 1;

  v_referral_code := public.generate_referral_code();

  insert into public.profiles (id, username, display_name, referral_code, referred_by)
  values (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    v_referral_code,
    v_referred_by
  );

  select *
  into v_bonus
  from public.bonus_settings
  order by created_at asc
  limit 1;

  if coalesce(v_bonus.welcome_bonus_enabled, false)
    and coalesce(v_bonus.welcome_bonus_trigger, 'first_deposit') = 'signup'
    and coalesce(v_bonus.welcome_bonus_amount, 0) > 0 then
    update public.profiles
    set
      balance = balance + v_bonus.welcome_bonus_amount,
      welcome_bonus_granted_at = now(),
      updated_at = now()
    where id = NEW.id;

    perform public.create_notification_internal(
      NEW.id,
      'welcome_bonus',
      'Welcome bonus unlocked',
      format('Welcome! You''ve received a $%s welcome bonus. Start trading now!', trim(to_char(v_bonus.welcome_bonus_amount, 'FM999999990.00'))),
      '/trade',
      jsonb_build_object(
        'amount', v_bonus.welcome_bonus_amount,
        'trigger', 'signup'
      ),
      concat('welcome_bonus:signup:', NEW.id::text),
      null
    );
  end if;

  return NEW;
end;
$$;
