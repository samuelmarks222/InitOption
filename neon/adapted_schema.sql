-- Neon-ready schema (generated from supabase/migrations/*.sql)
-- DO NOT EDIT BY HAND — regenerate via: node neon/build_schema.mjs
--
-- Supabase-specific runtime identity (auth.uid) is mapped to a Clerk user id
-- carried through a PostgreSQL custom GUC set per-request by the API layer:
--   SET LOCAL app.current_user_id = '<clerk_user_id>';
--   current_setting('app.current_user_id', true)  -- validates the GUC exists at runtime
-- Clerk users are mirrored into public.users by /api/webhooks/clerk (user.created/updated/deleted).
-- public.users is the auth table this schema now references.

-- Supabase exposes roles (authenticated/anon/service_role) at runtime.
-- CREATE EXTENSION / CREATE ROLE are non-transactional, so apply_schema.mjs runs
-- them in autocommit before the transactional schema load. They gate policies/grants.
create extension if not exists pgcrypto;
create role authenticated;
create role anon;
create role service_role;
-- app.current_user_id session variable carries the Clerk user id per-request:
--   SET LOCAL app.current_user_id = '<clerk_user_id>';

-- Mirror of the Supabase auth.users table, populated by Clerk webhooks.
create table if not exists public.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb,
  email_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

-- Ensure the custom GUC exists for current_setting(..., true) reads.
select current_setting('app.current_user_id', true);


-- ===== MIGRATION: 20260316095743_ab793478-21e7-4dd1-bd88-58eb5d191046.sql =====

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  balance NUMERIC NOT NULL DEFAULT 10000,
  total_trades INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_profit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (current_setting('app.current_user_id', true)::uuid = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (current_setting('app.current_user_id', true)::uuid = id);

-- Create trades table
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  asset_symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('higher', 'lower')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  expiry_seconds INTEGER NOT NULL,
  payout_rate NUMERIC NOT NULL DEFAULT 0.86,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'expired')),
  profit NUMERIC DEFAULT 0,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT TO authenticated USING (current_setting('app.current_user_id', true)::uuid = user_id);
CREATE POLICY "Users can insert own trades" ON public.trades FOR INSERT TO authenticated WITH CHECK (current_setting('app.current_user_id', true)::uuid = user_id);
CREATE POLICY "Users can update own trades" ON public.trades FOR UPDATE TO authenticated USING (current_setting('app.current_user_id', true)::uuid = user_id);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chat messages" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (current_setting('app.current_user_id', true)::uuid = user_id);




-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User roles table for admin
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (current_setting('app.current_user_id', true)::uuid = user_id);

-- ===== MIGRATION: 20260320000000_kyc_review_system.sql =====
alter table public.profiles
  add column if not exists kyc_status text default 'Pending',
  add column if not exists kyc_documents jsonb default '{}'::jsonb;

comment on column public.profiles.kyc_status is 'KYC review status for the user profile.';
comment on column public.profiles.kyc_documents is 'Uploaded KYC documents metadata for admin review.';

drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
on public.profiles
for update
to authenticated
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role) or current_setting('app.current_user_id', true)::uuid = id)
with check (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role) or current_setting('app.current_user_id', true)::uuid = id);

-- ===== MIGRATION: 20260320000001_notifications_system.sql =====
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
  user_id uuid not null references public.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

drop policy if exists "Users can view own roles" on public.user_roles;
create policy "Users can view own roles"
on public.user_roles
for select
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id);

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
  created_by uuid references public.users(id) on delete set null,
  sent_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
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
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

drop policy if exists "Admins can update bonus settings" on public.bonus_settings;
create policy "Admins can update bonus settings"
on public.bonus_settings
for update
to authenticated
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role))
with check (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

drop policy if exists "Admins can insert bonus settings" on public.bonus_settings;
create policy "Admins can insert bonus settings"
on public.bonus_settings
for insert
to authenticated
with check (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

drop policy if exists "Admins can view announcements" on public.announcements;
create policy "Admins can view announcements"
on public.announcements
for select
to authenticated
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

drop policy if exists "Admins can insert announcements" on public.announcements;
create policy "Admins can insert announcements"
on public.announcements
for insert
to authenticated
with check (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

drop policy if exists "Admins can update announcements" on public.announcements;
create policy "Admins can update announcements"
on public.announcements
for update
to authenticated
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role))
with check (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
on public.notifications
for select
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id)
with check (current_setting('app.current_user_id', true)::uuid = user_id);

;

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
  if not public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role) then
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
    current_setting('app.current_user_id', true)::uuid,
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
  if not public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role) then
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
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Deposit amount must be positive';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = current_setting('app.current_user_id', true)::uuid
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
  where id = current_setting('app.current_user_id', true)::uuid;

  if v_deposit_bonus > 0 then
    perform public.create_notification_internal(
      current_setting('app.current_user_id', true)::uuid,
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
      current_setting('app.current_user_id', true)::uuid,
      'welcome_bonus',
      'Welcome bonus unlocked',
      format('Welcome! You''ve received a $%s welcome bonus. Start trading now!', trim(to_char(v_welcome_bonus, 'FM999999990.00'))),
      '/trade',
      jsonb_build_object(
        'amount', v_welcome_bonus,
        'trigger', 'first_deposit'
      ),
      concat('welcome_bonus:first_deposit:', current_setting('app.current_user_id', true)::uuid::text),
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
    where id = current_setting('app.current_user_id', true)::uuid;

    perform public.create_notification_internal(
      v_profile.referred_by,
      'referral_commission',
      'Referral commission earned',
      format('You earned $%s referral commission from %s.', trim(to_char(v_referral_bonus, 'FM999999990.00')), coalesce(v_referrer_username, 'your referral')),
      '/trade',
      jsonb_build_object(
        'amount', v_referral_bonus,
        'base_amount', p_amount,
        'source_user_id', current_setting('app.current_user_id', true)::uuid,
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
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_trade
  from public.trades
  where id = p_trade_id
    and user_id = current_setting('app.current_user_id', true)::uuid;

  if not found then
    raise exception 'Trade not found';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = current_setting('app.current_user_id', true)::uuid;

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
  where id = current_setting('app.current_user_id', true)::uuid;

  perform public.create_notification_internal(
    v_profile.referred_by,
    'referral_commission',
    'Referral commission earned',
    format('You earned $%s referral commission from %s.', trim(to_char(v_commission, 'FM999999990.00')), coalesce(v_referral_name, 'your referral')),
    '/trade/history',
    jsonb_build_object(
      'amount', v_commission,
      'source_trade_id', v_trade.id,
      'source_user_id', current_setting('app.current_user_id', true)::uuid,
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

-- ===== MIGRATION: 20260320000002_tournaments_schema.sql =====
-- Create ENUM for tournament status (safe check before creating)
DO $$ BEGIN
  CREATE TYPE tournament_status AS ENUM ('upcoming', 'active', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    entry_fee NUMERIC NOT NULL DEFAULT 0,
    prize_pool NUMERIC NOT NULL DEFAULT 0,
    starting_balance NUMERIC NOT NULL DEFAULT 100.00,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status tournament_status DEFAULT 'upcoming'::tournament_status,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Ensure RLS is enabled and appropriate policies are set if necessary.
-- For now, allow all read and admin-write, but to keep it simple we disable RLS if standard platform handles auth elsewhere,
-- or we can open read access to everyone:
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to tournaments" 
ON public.tournaments FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated full access to tournaments" 
ON public.tournaments FOR ALL 
USING ('authenticated'::text = 'authenticated');


-- Create tournament_participants table
CREATE TABLE IF NOT EXISTS public.tournament_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_balance NUMERIC NOT NULL DEFAULT 0.00, -- will be initialized to tournament's starting_balance
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, user_id)
);

ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to participants" 
ON public.tournament_participants FOR SELECT 
USING (true);

CREATE POLICY "Allow users to update own participation" 
ON public.tournament_participants FOR ALL 
USING (current_setting('app.current_user_id', true)::uuid = user_id);

-- Optional: Create trigger to initialize current_balance automatically based on the tournament starting balance
CREATE OR REPLACE FUNCTION set_initial_tournament_balance()
RETURNS TRIGGER AS $$
BEGIN
  SELECT starting_balance INTO NEW.current_balance FROM public.tournaments WHERE id = NEW.tournament_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER initialize_tournament_balance
BEFORE INSERT ON public.tournament_participants
FOR EACH ROW
EXECUTE FUNCTION set_initial_tournament_balance();

-- ===== MIGRATION: 20260320000003_vip_badge_system.sql =====
alter table public.profiles
  add column if not exists vip_tier text default 'none',
  add column if not exists vip_tier_override text,
  add column if not exists total_deposit double precision default 0,
  add column if not exists total_trade_volume_30d double precision default 0,
  add column if not exists trade_count_30d integer default 0;

comment on column public.profiles.vip_tier is 'Current automatically calculated VIP tier.';
comment on column public.profiles.vip_tier_override is 'Optional admin override for VIP tier.';
comment on column public.profiles.total_deposit is 'Lifetime deposited amount used by the VIP system.';
comment on column public.profiles.total_trade_volume_30d is 'Rolling 30-day closed trade volume for the VIP system.';
comment on column public.profiles.trade_count_30d is 'Rolling 30-day closed trade count for the VIP system.';

-- ===== MIGRATION: 20260321000000_platform_settings_seo_metadata.sql =====
alter table if exists public.platform_settings
  add column if not exists chart_up_color text not null default '#00C076',
  add column if not exists chart_down_color text not null default '#F6465D',
  add column if not exists chart_bg_color text not null default '#0E1217',
  add column if not exists site_title text not null default '',
  add column if not exists meta_description text not null default '',
  add column if not exists meta_keywords text not null default '',
  add column if not exists og_title text not null default '',
  add column if not exists og_description text not null default '',
  add column if not exists og_image_url text not null default '',
  add column if not exists twitter_card_type text not null default 'summary_large_image',
  add column if not exists twitter_title text not null default '',
  add column if not exists twitter_description text not null default '',
  add column if not exists twitter_image_url text not null default '',
  add column if not exists canonical_url text not null default '',
  add column if not exists robots_directive text not null default 'index, follow',
  add column if not exists custom_meta_tags text not null default '';

do $$
begin
  if to_regclass('public.platform_settings') is not null then
    update public.platform_settings
    set
      chart_up_color = coalesce(nullif(chart_up_color, ''), '#00C076'),
      chart_down_color = coalesce(nullif(chart_down_color, ''), '#F6465D'),
      chart_bg_color = coalesce(nullif(chart_bg_color, ''), '#0E1217'),
      site_title = coalesce(site_title, ''),
      meta_description = coalesce(meta_description, ''),
      meta_keywords = coalesce(meta_keywords, ''),
      og_title = coalesce(og_title, ''),
      og_description = coalesce(og_description, ''),
      og_image_url = coalesce(og_image_url, ''),
      twitter_card_type = case
        when twitter_card_type in ('summary', 'summary_large_image') then twitter_card_type
        else 'summary_large_image'
      end,
      twitter_title = coalesce(twitter_title, ''),
      twitter_description = coalesce(twitter_description, ''),
      twitter_image_url = coalesce(twitter_image_url, ''),
      canonical_url = coalesce(canonical_url, ''),
      robots_directive = coalesce(nullif(robots_directive, ''), 'index, follow'),
      custom_meta_tags = coalesce(custom_meta_tags, '');
  end if;
end
$$;

-- ===== MIGRATION: 20260321000001_zero_live_balance_for_new_users.sql =====
alter table public.profiles
alter column balance set default 0;

update public.profiles
set
  balance = 0,
  welcome_bonus_granted_at = null,
  updated_at = now()
where coalesce(total_deposit, 0) <= 0
  and coalesce(balance, 0) > 0;

update public.bonus_settings
set
  welcome_bonus_trigger = 'first_deposit',
  updated_at = now()
where welcome_bonus_trigger <> 'first_deposit';

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
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    v_referral_code,
    v_referred_by,
    0
  );

  return NEW;
end;
$$;

-- ===== MIGRATION: 20260321000002_zzzz_platform_settings_meta_seo_patch.sql =====
create extension if not exists pgcrypto;

create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  platform_name text not null default 'Init Option',
  support_email text not null default 'support@initoption.com',
  timezone text not null default 'UTC',
  min_trade_amount numeric not null default 1,
  max_trade_amount numeric not null default 10000,
  enforce_max_exposure boolean not null default true,
  enforce_2fa boolean not null default false,
  require_kyc_withdrawal boolean not null default true,
  strict_password boolean not null default true,
  welcome_bonus_pct numeric not null default 50,
  referral_commission_pct numeric not null default 10,
  logo_url text not null default '',
  favicon_url text not null default '',
  chart_up_color text not null default '#00C076',
  chart_down_color text not null default '#F6465D',
  chart_bg_color text not null default '#0E1217',
  site_title text not null default '',
  meta_description text not null default '',
  meta_keywords text not null default '',
  og_title text not null default '',
  og_description text not null default '',
  og_image_url text not null default '',
  twitter_card_type text not null default 'summary_large_image',
  twitter_title text not null default '',
  twitter_description text not null default '',
  twitter_image_url text not null default '',
  canonical_url text not null default '',
  robots_directive text not null default 'index, follow',
  custom_meta_tags text not null default '',
  website_content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.platform_settings
  add column if not exists platform_name text not null default 'Init Option',
  add column if not exists support_email text not null default 'support@initoption.com',
  add column if not exists timezone text not null default 'UTC',
  add column if not exists min_trade_amount numeric not null default 1,
  add column if not exists max_trade_amount numeric not null default 10000,
  add column if not exists enforce_max_exposure boolean not null default true,
  add column if not exists enforce_2fa boolean not null default false,
  add column if not exists require_kyc_withdrawal boolean not null default true,
  add column if not exists strict_password boolean not null default true,
  add column if not exists welcome_bonus_pct numeric not null default 50,
  add column if not exists referral_commission_pct numeric not null default 10,
  add column if not exists logo_url text not null default '',
  add column if not exists favicon_url text not null default '',
  add column if not exists chart_up_color text not null default '#00C076',
  add column if not exists chart_down_color text not null default '#F6465D',
  add column if not exists chart_bg_color text not null default '#0E1217',
  add column if not exists site_title text not null default '',
  add column if not exists meta_description text not null default '',
  add column if not exists meta_keywords text not null default '',
  add column if not exists og_title text not null default '',
  add column if not exists og_description text not null default '',
  add column if not exists og_image_url text not null default '',
  add column if not exists twitter_card_type text not null default 'summary_large_image',
  add column if not exists twitter_title text not null default '',
  add column if not exists twitter_description text not null default '',
  add column if not exists twitter_image_url text not null default '',
  add column if not exists canonical_url text not null default '',
  add column if not exists robots_directive text not null default 'index, follow',
  add column if not exists custom_meta_tags text not null default '',
  add column if not exists website_content text not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.platform_settings
set
  platform_name = coalesce(nullif(platform_name, ''), 'Init Option'),
  support_email = coalesce(nullif(support_email, ''), 'support@initoption.com'),
  timezone = coalesce(nullif(timezone, ''), 'UTC'),
  logo_url = coalesce(logo_url, ''),
  favicon_url = coalesce(favicon_url, ''),
  chart_up_color = coalesce(nullif(chart_up_color, ''), '#00C076'),
  chart_down_color = coalesce(nullif(chart_down_color, ''), '#F6465D'),
  chart_bg_color = coalesce(nullif(chart_bg_color, ''), '#0E1217'),
  site_title = coalesce(site_title, ''),
  meta_description = coalesce(meta_description, ''),
  meta_keywords = coalesce(meta_keywords, ''),
  og_title = coalesce(og_title, ''),
  og_description = coalesce(og_description, ''),
  og_image_url = coalesce(og_image_url, ''),
  twitter_card_type = coalesce(nullif(twitter_card_type, ''), 'summary_large_image'),
  twitter_title = coalesce(twitter_title, ''),
  twitter_description = coalesce(twitter_description, ''),
  twitter_image_url = coalesce(twitter_image_url, ''),
  canonical_url = coalesce(canonical_url, ''),
  robots_directive = coalesce(nullif(robots_directive, ''), 'index, follow'),
  custom_meta_tags = coalesce(custom_meta_tags, ''),
  website_content = coalesce(website_content, ''),
  updated_at = now();

insert into public.platform_settings (
  platform_name,
  support_email,
  timezone,
  logo_url,
  favicon_url,
  chart_up_color,
  chart_down_color,
  chart_bg_color,
  site_title,
  meta_description,
  meta_keywords,
  og_title,
  og_description,
  og_image_url,
  twitter_card_type,
  twitter_title,
  twitter_description,
  twitter_image_url,
  canonical_url,
  robots_directive,
  custom_meta_tags,
  website_content
)
select
  'Init Option',
  'support@initoption.com',
  'UTC',
  '',
  '',
  '#00C076',
  '#F6465D',
  '#0E1217',
  '',
  '',
  '',
  '',
  '',
  '',
  'summary_large_image',
  '',
  '',
  '',
  '',
  'index, follow',
  '',
  ''
where not exists (
  select 1 from public.platform_settings
);

-- ===== MIGRATION: 20260321000003_zzz_admin_operational_tables_and_tournament_trade_links.sql =====
create extension if not exists pgcrypto;

create table if not exists public.assets_config (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  name text not null,
  category text not null,
  status text not null default 'active',
  min_trade numeric not null default 1,
  max_trade numeric not null default 5000,
  payout_pct numeric not null default 85,
  spread numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assets_config
  add column if not exists symbol text,
  add column if not exists name text,
  add column if not exists category text,
  add column if not exists status text not null default 'active',
  add column if not exists min_trade numeric not null default 1,
  add column if not exists max_trade numeric not null default 5000,
  add column if not exists payout_pct numeric not null default 85,
  add column if not exists spread numeric not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.assets_config
set
  name = coalesce(nullif(name, ''), symbol),
  category = coalesce(nullif(category, ''), 'OTC'),
  status = coalesce(nullif(status, ''), 'active'),
  updated_at = now()
where
  name is null
  or category is null
  or status is null
  or name = ''
  or category = ''
  or status = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assets_config_symbol_key'
  ) then
    alter table public.assets_config
      add constraint assets_config_symbol_key unique (symbol);
  end if;
end $$;

create index if not exists assets_config_status_idx
  on public.assets_config(status);

create table if not exists public.crypto_payment_methods (
  id uuid primary key default gen_random_uuid(),
  coin_name text not null,
  symbol text not null,
  network text not null,
  wallet_address text,
  qr_code_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crypto_payment_methods
  add column if not exists coin_name text,
  add column if not exists symbol text,
  add column if not exists network text,
  add column if not exists wallet_address text,
  add column if not exists qr_code_url text,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.crypto_payment_methods
set
  status = coalesce(nullif(status, ''), 'active'),
  updated_at = now()
where status is null or status = '';

create index if not exists crypto_payment_methods_status_idx
  on public.crypto_payment_methods(status);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  type text not null,
  reward_value text not null,
  usages integer not null default 0,
  max_usages integer not null default 1000,
  expiry_date timestamptz not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.promo_codes
  add column if not exists code text,
  add column if not exists type text,
  add column if not exists reward_value text,
  add column if not exists usages integer not null default 0,
  add column if not exists max_usages integer not null default 1000,
  add column if not exists expiry_date timestamptz,
  add column if not exists status text not null default 'active',
  add column if not exists created_at timestamptz not null default now();

update public.promo_codes
set
  code = upper(code),
  usages = greatest(coalesce(usages, 0), 0),
  max_usages = greatest(coalesce(max_usages, 0), 0),
  status = coalesce(nullif(status, ''), 'active')
where
  code is distinct from upper(code)
  or usages is null
  or max_usages is null
  or status is null
  or status = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'promo_codes_code_key'
  ) then
    alter table public.promo_codes
      add constraint promo_codes_code_key unique (code);
  end if;
end $$;

create index if not exists promo_codes_status_expiry_idx
  on public.promo_codes(status, expiry_date);

alter table public.trades
  add column if not exists tournament_participant_id uuid references public.tournament_participants(id) on delete set null;

comment on column public.trades.tournament_participant_id is 'Links a trade to a tournament participant when it was opened in a tournament account.';

create index if not exists trades_tournament_participant_id_idx
  on public.trades(tournament_participant_id)
  where tournament_participant_id is not null;

alter table public.assets_config enable row level security;
alter table public.crypto_payment_methods enable row level security;
alter table public.promo_codes enable row level security;

drop policy if exists "Authenticated users can view active assets" on public.assets_config;
drop policy if exists "Admins can view all assets" on public.assets_config;
drop policy if exists "Admins can insert assets" on public.assets_config;
drop policy if exists "Admins can update assets" on public.assets_config;
drop policy if exists "Admins can delete assets" on public.assets_config;

create policy "Authenticated users can view active assets"
on public.assets_config
for select
to authenticated
using (status = 'active');

create policy "Admins can view all assets"
on public.assets_config
for select
to authenticated
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

create policy "Admins can insert assets"
on public.assets_config
for insert
to authenticated
with check (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

create policy "Admins can update assets"
on public.assets_config
for update
to authenticated
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role))
with check (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

create policy "Admins can delete assets"
on public.assets_config
for delete
to authenticated
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

drop policy if exists "Authenticated users can view active crypto payment methods" on public.crypto_payment_methods;
drop policy if exists "Admins can view all crypto payment methods" on public.crypto_payment_methods;
drop policy if exists "Admins can insert crypto payment methods" on public.crypto_payment_methods;
drop policy if exists "Admins can update crypto payment methods" on public.crypto_payment_methods;
drop policy if exists "Admins can delete crypto payment methods" on public.crypto_payment_methods;

create policy "Authenticated users can view active crypto payment methods"
on public.crypto_payment_methods
for select
to authenticated
using (status = 'active');

create policy "Admins can view all crypto payment methods"
on public.crypto_payment_methods
for select
to authenticated
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

create policy "Admins can insert crypto payment methods"
on public.crypto_payment_methods
for insert
to authenticated
with check (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

create policy "Admins can update crypto payment methods"
on public.crypto_payment_methods
for update
to authenticated
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role))
with check (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

create policy "Admins can delete crypto payment methods"
on public.crypto_payment_methods
for delete
to authenticated
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

drop policy if exists "Authenticated users can view redeemable promo codes" on public.promo_codes;
drop policy if exists "Admins can view all promo codes" on public.promo_codes;
drop policy if exists "Admins can insert promo codes" on public.promo_codes;
drop policy if exists "Admins can update promo codes" on public.promo_codes;
drop policy if exists "Admins can delete promo codes" on public.promo_codes;

create policy "Authenticated users can view redeemable promo codes"
on public.promo_codes
for select
to authenticated
using (
  status = 'active'
  and expiry_date > now()
  and (max_usages <= 0 or usages < max_usages)
);

create policy "Admins can view all promo codes"
on public.promo_codes
for select
to authenticated
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

create policy "Admins can insert promo codes"
on public.promo_codes
for insert
to authenticated
with check (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

create policy "Admins can update promo codes"
on public.promo_codes
for update
to authenticated
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role))
with check (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

create policy "Admins can delete promo codes"
on public.promo_codes
for delete
to authenticated
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

create or replace function public.process_deposit_checkout(
  p_amount numeric,
  p_method text default 'card',
  p_promo_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promo public.promo_codes%rowtype;
  v_numeric_value numeric := 0;
  v_promo_bonus numeric := 0;
  v_payload jsonb;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Deposit amount must be positive';
  end if;

  if p_promo_id is not null then
    select *
    into v_promo
    from public.promo_codes
    where id = p_promo_id
    for update;

    if not found then
      raise exception 'Promo code not found';
    end if;

    if v_promo.status <> 'active' then
      raise exception 'Promo code is not active';
    end if;

    if v_promo.expiry_date <= now() then
      update public.promo_codes
      set status = 'expired'
      where id = v_promo.id and status <> 'expired';

      raise exception 'Promo code has expired';
    end if;

    if v_promo.max_usages > 0 and coalesce(v_promo.usages, 0) >= v_promo.max_usages then
      update public.promo_codes
      set status = 'expired'
      where id = v_promo.id and status <> 'expired';

      raise exception 'Promo code usage limit reached';
    end if;

    v_numeric_value := coalesce(nullif(regexp_replace(v_promo.reward_value, '[^0-9.]', '', 'g'), ''), '0')::numeric;

    if v_promo.type = 'Percentage' then
      v_promo_bonus := p_amount * (v_numeric_value / 100.0);
    elsif v_promo.type = 'Fixed Bonus' then
      v_promo_bonus := v_numeric_value;
    else
      raise exception 'Unsupported promo code type: %', v_promo.type;
    end if;

    update public.promo_codes
    set
      usages = coalesce(usages, 0) + 1,
      status = case
        when max_usages > 0 and coalesce(usages, 0) + 1 >= max_usages then 'expired'
        else status
      end
    where id = v_promo.id;
  end if;

  v_payload := public.process_deposit_event(
    p_amount,
    v_promo_bonus,
    p_method
  );

  return coalesce(v_payload, '{}'::jsonb)
    || jsonb_build_object(
      'promo_bonus', v_promo_bonus,
      'promo_code_id', p_promo_id
    );
end;
$$;

grant execute on function public.process_deposit_checkout(numeric, text, uuid) to authenticated;

insert into public.assets_config (
  symbol,
  name,
  category,
  min_trade,
  max_trade,
  payout_pct,
  spread,
  status
)
select *
from (
  values
    ('EUR/USD', 'Euro / US Dollar', 'OTC', 1::numeric, 5000::numeric, 85::numeric, 0::numeric, 'active'),
    ('GBP/USD', 'British Pound / US Dollar', 'OTC', 1::numeric, 5000::numeric, 85::numeric, 0::numeric, 'active'),
    ('USD/JPY', 'US Dollar / Japanese Yen', 'OTC', 1::numeric, 5000::numeric, 85::numeric, 0::numeric, 'active'),
    ('BTC', 'Bitcoin', 'CRYPTO', 5::numeric, 10000::numeric, 80::numeric, 0::numeric, 'active'),
    ('ETH', 'Ethereum', 'CRYPTO', 5::numeric, 10000::numeric, 80::numeric, 0::numeric, 'active'),
    ('AAPL', 'Apple Inc.', 'STOCKS', 5::numeric, 5000::numeric, 75::numeric, 0::numeric, 'active'),
    ('TSLA', 'Tesla, Inc.', 'STOCKS', 5::numeric, 5000::numeric, 75::numeric, 0::numeric, 'active'),
    ('XAU/USD', 'Gold', 'COMMODITIES', 5::numeric, 5000::numeric, 78::numeric, 0::numeric, 'active')
) as seed(symbol, name, category, min_trade, max_trade, payout_pct, spread, status)
where not exists (
  select 1
  from public.assets_config
  limit 1
)
on conflict (symbol) do nothing;

insert into public.crypto_payment_methods (
  coin_name,
  symbol,
  network,
  wallet_address,
  qr_code_url,
  status
)
select *
from (
  values
    ('Bitcoin', 'BTC', 'Bitcoin', '', null, 'active'),
    ('Ethereum', 'ETH', 'ERC20', '', null, 'active'),
    ('Tether USD', 'USDT', 'TRC20', '', null, 'active'),
    ('Tether USD', 'USDT', 'ERC20', '', null, 'active'),
    ('Binance Coin', 'BNB', 'BEP20', '', null, 'active'),
    ('Solana', 'SOL', 'Solana', '', null, 'active'),
    ('XRP', 'XRP', 'Ripple', '', null, 'active'),
    ('USD Coin', 'USDC', 'ERC20', '', null, 'active'),
    ('USD Coin', 'USDC', 'TRC20', '', null, 'active'),
    ('Cardano', 'ADA', 'Cardano', '', null, 'active'),
    ('Avalanche', 'AVAX', 'C-Chain', '', null, 'active'),
    ('Dogecoin', 'DOGE', 'Dogecoin', '', null, 'active'),
    ('Polkadot', 'DOT', 'Polkadot', '', null, 'active'),
    ('Polygon', 'MATIC', 'Polygon', '', null, 'active'),
    ('Litecoin', 'LTC', 'Litecoin', '', null, 'active'),
    ('Shiba Inu', 'SHIB', 'ERC20', '', null, 'active'),
    ('TRON', 'TRX', 'TRC20', '', null, 'active'),
    ('Chainlink', 'LINK', 'ERC20', '', null, 'active'),
    ('Uniswap', 'UNI', 'ERC20', '', null, 'active'),
    ('Toncoin', 'TON', 'TON', '', null, 'active')
) as seed(coin_name, symbol, network, wallet_address, qr_code_url, status)
where not exists (
  select 1
  from public.crypto_payment_methods
  limit 1
);

-- ===== MIGRATION: 20260321000004_zz_platform_settings_website_content.sql =====
alter table if exists public.platform_settings
  add column if not exists website_content text not null default '';

update public.platform_settings
set website_content = coalesce(website_content, '')
where website_content is null;

-- ===== MIGRATION: 20260321000005_z_platform_settings_bootstrap_and_branding_bucket.sql =====
create extension if not exists pgcrypto;

create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  platform_name text not null default 'Init Option',
  support_email text not null default 'support@initoption.com',
  timezone text not null default 'UTC',
  min_trade_amount numeric not null default 1,
  max_trade_amount numeric not null default 10000,
  enforce_max_exposure boolean not null default true,
  enforce_2fa boolean not null default false,
  require_kyc_withdrawal boolean not null default true,
  strict_password boolean not null default true,
  welcome_bonus_pct numeric not null default 50,
  referral_commission_pct numeric not null default 10,
  logo_url text not null default '',
  logo_url_light text not null default '',
  logo_url_dark text not null default '',
  favicon_url text not null default '',
  chart_up_color text not null default '#00C076',
  chart_down_color text not null default '#F6465D',
  chart_bg_color text not null default '#0E1217',
  site_title text not null default '',
  meta_description text not null default '',
  meta_keywords text not null default '',
  og_title text not null default '',
  og_description text not null default '',
  og_image_url text not null default '',
  twitter_card_type text not null default 'summary_large_image',
  twitter_title text not null default '',
  twitter_description text not null default '',
  twitter_image_url text not null default '',
  canonical_url text not null default '',
  robots_directive text not null default 'index, follow',
  custom_meta_tags text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.platform_settings
  add column if not exists platform_name text not null default 'Init Option',
  add column if not exists support_email text not null default 'support@initoption.com',
  add column if not exists timezone text not null default 'UTC',
  add column if not exists min_trade_amount numeric not null default 1,
  add column if not exists max_trade_amount numeric not null default 10000,
  add column if not exists enforce_max_exposure boolean not null default true,
  add column if not exists enforce_2fa boolean not null default false,
  add column if not exists require_kyc_withdrawal boolean not null default true,
  add column if not exists strict_password boolean not null default true,
  add column if not exists welcome_bonus_pct numeric not null default 50,
  add column if not exists referral_commission_pct numeric not null default 10,
  add column if not exists logo_url text not null default '',
  add column if not exists logo_url_light text not null default '',
  add column if not exists logo_url_dark text not null default '',
  add column if not exists favicon_url text not null default '',
  add column if not exists chart_up_color text not null default '#00C076',
  add column if not exists chart_down_color text not null default '#F6465D',
  add column if not exists chart_bg_color text not null default '#0E1217',
  add column if not exists site_title text not null default '',
  add column if not exists meta_description text not null default '',
  add column if not exists meta_keywords text not null default '',
  add column if not exists og_title text not null default '',
  add column if not exists og_description text not null default '',
  add column if not exists og_image_url text not null default '',
  add column if not exists twitter_card_type text not null default 'summary_large_image',
  add column if not exists twitter_title text not null default '',
  add column if not exists twitter_description text not null default '',
  add column if not exists twitter_image_url text not null default '',
  add column if not exists canonical_url text not null default '',
  add column if not exists robots_directive text not null default 'index, follow',
  add column if not exists custom_meta_tags text not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.platform_settings
set
  platform_name = coalesce(nullif(platform_name, ''), 'Init Option'),
  support_email = coalesce(nullif(support_email, ''), 'support@initoption.com'),
  timezone = coalesce(nullif(timezone, ''), 'UTC'),
  logo_url = coalesce(logo_url, ''),
  logo_url_light = coalesce(logo_url_light, ''),
  logo_url_dark = coalesce(logo_url_dark, ''),
  favicon_url = coalesce(favicon_url, ''),
  chart_up_color = coalesce(nullif(chart_up_color, ''), '#00C076'),
  chart_down_color = coalesce(nullif(chart_down_color, ''), '#F6465D'),
  chart_bg_color = coalesce(nullif(chart_bg_color, ''), '#0E1217'),
  site_title = coalesce(site_title, ''),
  meta_description = coalesce(meta_description, ''),
  meta_keywords = coalesce(meta_keywords, ''),
  og_title = coalesce(og_title, ''),
  og_description = coalesce(og_description, ''),
  og_image_url = coalesce(og_image_url, ''),
  twitter_card_type = coalesce(nullif(twitter_card_type, ''), 'summary_large_image'),
  twitter_title = coalesce(twitter_title, ''),
  twitter_description = coalesce(twitter_description, ''),
  twitter_image_url = coalesce(twitter_image_url, ''),
  canonical_url = coalesce(canonical_url, ''),
  robots_directive = coalesce(nullif(robots_directive, ''), 'index, follow'),
  custom_meta_tags = coalesce(custom_meta_tags, ''),
  updated_at = now();

insert into public.platform_settings (
  platform_name,
  support_email,
  timezone,
  logo_url,
  logo_url_light,
  logo_url_dark,
  favicon_url,
  chart_up_color,
  chart_down_color,
  chart_bg_color,
  site_title,
  meta_description,
  meta_keywords,
  og_title,
  og_description,
  og_image_url,
  twitter_card_type,
  twitter_title,
  twitter_description,
  twitter_image_url,
  canonical_url,
  robots_directive,
  custom_meta_tags
)
select
  'Init Option',
  'support@initoption.com',
  'UTC',
  '',
  '',
  '',
  '',
  '#00C076',
  '#F6465D',
  '#0E1217',
  '',
  '',
  '',
  '',
  '',
  '',
  'summary_large_image',
  '',
  '',
  '',
  '',
  'index, follow',
  ''
where not exists (
  select 1 from public.platform_settings
);

alter table public.platform_settings enable row level security;

drop policy if exists "Allow public read on settings" on public.platform_settings;
drop policy if exists "Allow admin full access on settings" on public.platform_settings;
drop policy if exists "settings_select" on public.platform_settings;
drop policy if exists "settings_insert" on public.platform_settings;
drop policy if exists "settings_update" on public.platform_settings;
drop policy if exists "settings_delete" on public.platform_settings;
drop policy if exists "platform_settings_select_public" on public.platform_settings;
drop policy if exists "platform_settings_insert_admin" on public.platform_settings;
drop policy if exists "platform_settings_update_admin" on public.platform_settings;
drop policy if exists "platform_settings_delete_admin" on public.platform_settings;

create policy "platform_settings_select_public"
on public.platform_settings
for select
using (true);

create policy "platform_settings_insert_admin"
on public.platform_settings
for insert
with check (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

create policy "platform_settings_update_admin"
on public.platform_settings
for update
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role))
with check (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

create policy "platform_settings_delete_admin"
on public.platform_settings
for delete
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

-- (removed: Supabase storage bucket + policies -> Cloudinary)

-- ===== MIGRATION: 20260321000006_add_admin_role_enum_values.sql =====
alter type public.app_role add value if not exists 'support_agent';
alter type public.app_role add value if not exists 'finance_manager';
alter type public.app_role add value if not exists 'trade_risk_manager';
alter type public.app_role add value if not exists 'content_marketing_manager';
alter type public.app_role add value if not exists 'auditor';

-- ===== MIGRATION: 20260322000000_a_chat_support_and_admin_roles.sql =====
create extension if not exists pgcrypto;

alter table public.chat_messages
  add column if not exists sender_name text not null default 'Trader';

update public.chat_messages cm
set sender_name = coalesce(nullif(p.username, ''), nullif(p.display_name, ''), 'Trader')
from public.profiles p
where p.id = cm.user_id
  and (cm.sender_name is null or cm.sender_name = '' or cm.sender_name = 'Trader');

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  subject text not null default 'General support',
  category text not null default 'General',
  status text not null default 'open' check (status in ('open', 'pending', 'resolved')),
  assigned_role public.app_role,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_threads
  add column if not exists user_id uuid references public.users(id) on delete cascade,
  add column if not exists subject text not null default 'General support',
  add column if not exists category text not null default 'General',
  add column if not exists status text not null default 'open',
  add column if not exists assigned_role public.app_role,
  add column if not exists last_message_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_threads_status_check'
  ) then
    alter table public.support_threads
      add constraint support_threads_status_check check (status in ('open', 'pending', 'resolved'));
  end if;
end $$;

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  sender_role text not null default 'user' check (sender_role in ('user', 'staff', 'system')),
  sender_name text not null default 'Support',
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.support_messages
  add column if not exists thread_id uuid references public.support_threads(id) on delete cascade,
  add column if not exists sender_id uuid references public.users(id) on delete cascade,
  add column if not exists sender_role text not null default 'user',
  add column if not exists sender_name text not null default 'Support',
  add column if not exists message text,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_messages_sender_role_check'
  ) then
    alter table public.support_messages
      add constraint support_messages_sender_role_check check (sender_role in ('user', 'staff', 'system'));
  end if;
end $$;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  category text not null default 'General',
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'pending', 'resolved')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets
  add column if not exists user_id uuid references public.users(id) on delete cascade,
  add column if not exists category text not null default 'General',
  add column if not exists subject text,
  add column if not exists message text,
  add column if not exists status text not null default 'open',
  add column if not exists priority text not null default 'normal',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_tickets_status_check'
  ) then
    alter table public.support_tickets
      add constraint support_tickets_status_check check (status in ('open', 'pending', 'resolved'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_tickets_priority_check'
  ) then
    alter table public.support_tickets
      add constraint support_tickets_priority_check check (priority in ('low', 'normal', 'high', 'urgent'));
  end if;
end $$;

create index if not exists chat_messages_created_at_idx
  on public.chat_messages(created_at desc);

create index if not exists support_threads_user_status_idx
  on public.support_threads(user_id, status, last_message_at desc);

create index if not exists support_messages_thread_created_idx
  on public.support_messages(thread_id, created_at asc);

create index if not exists support_tickets_user_status_idx
  on public.support_tickets(user_id, status, created_at desc);

create or replace function public.is_staff(_user_id uuid)
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
      and role in (
        'admin'::public.app_role,
        'support_agent'::public.app_role,
        'finance_manager'::public.app_role,
        'trade_risk_manager'::public.app_role,
        'content_marketing_manager'::public.app_role,
        'auditor'::public.app_role
      )
  );
$$;

create or replace function public.touch_support_thread_from_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_threads
  set
    last_message_at = new.created_at,
    updated_at = now(),
    status = case
      when new.sender_role = 'staff' and status = 'resolved' then 'pending'
      when new.sender_role = 'user' and status = 'resolved' then 'open'
      else status
    end
  where id = new.thread_id;

  return new;
end;
$$;

drop trigger if exists support_messages_touch_thread on public.support_messages;
create trigger support_messages_touch_thread
  after insert on public.support_messages
  for each row
  execute function public.touch_support_thread_from_message();

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_tickets enable row level security;

drop policy if exists "support_threads_select" on public.support_threads;
drop policy if exists "support_threads_insert" on public.support_threads;
drop policy if exists "support_threads_update_staff" on public.support_threads;

create policy "support_threads_select"
on public.support_threads
for select
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id or public.is_staff(current_setting('app.current_user_id', true)::uuid));

create policy "support_threads_insert"
on public.support_threads
for insert
to authenticated
with check (current_setting('app.current_user_id', true)::uuid = user_id or public.is_staff(current_setting('app.current_user_id', true)::uuid));

create policy "support_threads_update_staff"
on public.support_threads
for update
to authenticated
using (public.is_staff(current_setting('app.current_user_id', true)::uuid))
with check (public.is_staff(current_setting('app.current_user_id', true)::uuid));

drop policy if exists "support_messages_select" on public.support_messages;
drop policy if exists "support_messages_insert" on public.support_messages;

create policy "support_messages_select"
on public.support_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.support_threads st
    where st.id = thread_id
      and (st.user_id = current_setting('app.current_user_id', true)::uuid or public.is_staff(current_setting('app.current_user_id', true)::uuid))
  )
);

create policy "support_messages_insert"
on public.support_messages
for insert
to authenticated
with check (
  current_setting('app.current_user_id', true)::uuid = sender_id
  and exists (
    select 1
    from public.support_threads st
    where st.id = thread_id
      and (
        st.user_id = current_setting('app.current_user_id', true)::uuid
        or public.is_staff(current_setting('app.current_user_id', true)::uuid)
      )
  )
  and (
    (sender_role = 'user' and exists (
      select 1
      from public.support_threads st
      where st.id = thread_id
        and st.user_id = current_setting('app.current_user_id', true)::uuid
    ))
    or (sender_role in ('staff', 'system') and public.is_staff(current_setting('app.current_user_id', true)::uuid))
  )
);

drop policy if exists "support_tickets_select" on public.support_tickets;
drop policy if exists "support_tickets_insert" on public.support_tickets;
drop policy if exists "support_tickets_update_staff" on public.support_tickets;

create policy "support_tickets_select"
on public.support_tickets
for select
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id or public.is_staff(current_setting('app.current_user_id', true)::uuid));

create policy "support_tickets_insert"
on public.support_tickets
for insert
to authenticated
with check (current_setting('app.current_user_id', true)::uuid = user_id);

create policy "support_tickets_update_staff"
on public.support_tickets
for update
to authenticated
using (public.is_staff(current_setting('app.current_user_id', true)::uuid))
with check (public.is_staff(current_setting('app.current_user_id', true)::uuid));

drop policy if exists "Admins can view all roles" on public.user_roles;
create policy "Admins can view all roles"
on public.user_roles
for select
to authenticated
using (public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role));

create or replace function public.assign_staff_role(
  p_user_id uuid,
  p_role public.app_role
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role) then
    raise exception 'Only super admins can assign staff roles';
  end if;

  if p_role not in (
    'admin'::public.app_role,
    'support_agent'::public.app_role,
    'finance_manager'::public.app_role,
    'trade_risk_manager'::public.app_role,
    'content_marketing_manager'::public.app_role,
    'auditor'::public.app_role
  ) then
    raise exception 'Unsupported staff role';
  end if;

  delete from public.user_roles
  where user_id = p_user_id
    and role in (
      'admin'::public.app_role,
      'support_agent'::public.app_role,
      'finance_manager'::public.app_role,
      'trade_risk_manager'::public.app_role,
      'content_marketing_manager'::public.app_role,
      'auditor'::public.app_role,
      'moderator'::public.app_role
    );

  insert into public.user_roles (user_id, role)
  values (p_user_id, p_role)
  on conflict (user_id, role) do nothing;

  return jsonb_build_object(
    'user_id', p_user_id,
    'role', p_role::text
  );
end;
$$;

grant execute on function public.assign_staff_role(uuid, public.app_role) to authenticated;

create or replace function public.revoke_staff_role(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role) then
    raise exception 'Only super admins can revoke staff roles';
  end if;

  if current_setting('app.current_user_id', true)::uuid = p_user_id then
    raise exception 'You cannot revoke your own super admin access from here';
  end if;

  delete from public.user_roles
  where user_id = p_user_id
    and role in (
      'admin'::public.app_role,
      'support_agent'::public.app_role,
      'finance_manager'::public.app_role,
      'trade_risk_manager'::public.app_role,
      'content_marketing_manager'::public.app_role,
      'auditor'::public.app_role,
      'moderator'::public.app_role
    );

  return jsonb_build_object(
    'user_id', p_user_id,
    'revoked', true
  );
end;
$$;

grant execute on function public.revoke_staff_role(uuid) to authenticated;

;

-- ===== MIGRATION: 20260322000001_c_pending_deposit_review.sql =====
create table if not exists public.deposit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  method text not null,
  payment_method_id uuid references public.crypto_payment_methods(id) on delete set null,
  promo_id uuid references public.promo_codes(id) on delete set null,
  promo_bonus numeric not null default 0,
  tx_hash text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  processed_by uuid references public.profiles(id) on delete set null,
  processed_at timestamptz,
  credited_amount numeric,
  deposit_bonus numeric not null default 0,
  welcome_bonus numeric not null default 0,
  referral_commission numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.deposit_requests
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists amount numeric,
  add column if not exists method text,
  add column if not exists payment_method_id uuid references public.crypto_payment_methods(id) on delete set null,
  add column if not exists promo_id uuid references public.promo_codes(id) on delete set null,
  add column if not exists promo_bonus numeric not null default 0,
  add column if not exists tx_hash text,
  add column if not exists status text not null default 'pending',
  add column if not exists admin_note text,
  add column if not exists processed_by uuid references public.profiles(id) on delete set null,
  add column if not exists processed_at timestamptz,
  add column if not exists credited_amount numeric,
  add column if not exists deposit_bonus numeric not null default 0,
  add column if not exists welcome_bonus numeric not null default 0,
  add column if not exists referral_commission numeric not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'deposit_requests_amount_check'
  ) then
    alter table public.deposit_requests
      add constraint deposit_requests_amount_check check (amount > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'deposit_requests_status_check'
  ) then
    alter table public.deposit_requests
      add constraint deposit_requests_status_check check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists deposit_requests_user_status_idx
  on public.deposit_requests(user_id, status, created_at desc);

create index if not exists deposit_requests_status_created_idx
  on public.deposit_requests(status, created_at desc);

alter table public.deposit_requests enable row level security;

drop policy if exists "Users can view own deposit requests" on public.deposit_requests;
drop policy if exists "Users can insert own deposit requests" on public.deposit_requests;
drop policy if exists "Finance admins can view deposit requests" on public.deposit_requests;
drop policy if exists "Finance admins can update deposit requests" on public.deposit_requests;

create policy "Users can view own deposit requests"
on public.deposit_requests
for select
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id);

create policy "Users can insert own deposit requests"
on public.deposit_requests
for insert
to authenticated
with check (current_setting('app.current_user_id', true)::uuid = user_id and status = 'pending');

create policy "Finance admins can view deposit requests"
on public.deposit_requests
for select
to authenticated
using (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
);

create policy "Finance admins can update deposit requests"
on public.deposit_requests
for update
to authenticated
using (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
)
with check (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
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
  v_is_first_deposit boolean;
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
  where id = p_user_id;

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
    'deposit_bonus', v_deposit_bonus,
    'welcome_bonus', v_welcome_bonus,
    'promo_bonus', coalesce(p_promo_bonus, 0),
    'referral_commission', v_referral_bonus
  );
end;
$$;

create or replace function public.request_deposit_review(
  p_amount numeric,
  p_method text,
  p_promo_id uuid default null,
  p_payment_method_id uuid default null,
  p_tx_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_promo public.promo_codes%rowtype;
  v_numeric_value numeric := 0;
  v_promo_bonus numeric := 0;
  v_request public.deposit_requests%rowtype;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Deposit amount must be positive';
  end if;

  if coalesce(trim(p_method), '') = '' then
    raise exception 'Deposit method is required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = current_setting('app.current_user_id', true)::uuid;

  if not found then
    raise exception 'Profile not found';
  end if;

  if p_payment_method_id is not null then
    perform 1
    from public.crypto_payment_methods
    where id = p_payment_method_id
      and status = 'active';

    if not found then
      raise exception 'Selected crypto deposit method is not active';
    end if;
  end if;

  if p_promo_id is not null then
    select *
    into v_promo
    from public.promo_codes
    where id = p_promo_id;

    if not found then
      raise exception 'Promo code not found';
    end if;

    if v_promo.status <> 'active' then
      raise exception 'Promo code is not active';
    end if;

    if v_promo.expiry_date <= now() then
      raise exception 'Promo code has expired';
    end if;

    if v_promo.max_usages > 0 and coalesce(v_promo.usages, 0) >= v_promo.max_usages then
      raise exception 'Promo code usage limit reached';
    end if;

    v_numeric_value := coalesce(
      nullif(regexp_replace(v_promo.reward_value, '[^0-9.]', '', 'g'), ''),
      '0'
    )::numeric;

    if v_promo.type = 'Percentage' then
      v_promo_bonus := p_amount * (v_numeric_value / 100.0);
    elsif v_promo.type = 'Fixed Bonus' then
      v_promo_bonus := v_numeric_value;
    else
      raise exception 'Unsupported promo code type: %', v_promo.type;
    end if;
  end if;

  insert into public.deposit_requests (
    amount,
    method,
    payment_method_id,
    promo_bonus,
    promo_id,
    tx_hash,
    user_id
  )
  values (
    p_amount,
    trim(p_method),
    p_payment_method_id,
    v_promo_bonus,
    p_promo_id,
    nullif(trim(coalesce(p_tx_hash, '')), ''),
    current_setting('app.current_user_id', true)::uuid
  )
  returning *
  into v_request;

  return jsonb_build_object(
    'amount', v_request.amount,
    'method', v_request.method,
    'promo_bonus', v_request.promo_bonus,
    'request_id', v_request.id,
    'status', v_request.status
  );
end;
$$;

create or replace function public.admin_update_deposit_status(
  p_request_id uuid,
  p_status text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.deposit_requests%rowtype;
  v_next_status text;
  v_credit_payload jsonb := '{}'::jsonb;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if not (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
  ) then
    raise exception 'Only finance managers or super admins can update deposit requests';
  end if;

  v_next_status := lower(trim(coalesce(p_status, '')));

  if v_next_status not in ('approved', 'rejected') then
    raise exception 'Deposit status must be approved or rejected';
  end if;

  select *
  into v_request
  from public.deposit_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Deposit request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending deposit requests can be processed';
  end if;

  if v_next_status = 'approved' then
    v_credit_payload := public.credit_deposit_internal(
      v_request.user_id,
      v_request.amount,
      coalesce(v_request.promo_bonus, 0),
      v_request.method
    );

    if v_request.promo_id is not null then
      update public.promo_codes
      set
        usages = coalesce(usages, 0) + 1,
        status = case
          when max_usages > 0 and coalesce(usages, 0) + 1 >= max_usages then 'expired'
          when expiry_date <= now() then 'expired'
          else status
        end
      where id = v_request.promo_id;
    end if;

    update public.deposit_requests
    set
      admin_note = p_admin_note,
      credited_amount = nullif(v_credit_payload->>'credited_amount', '')::numeric,
      deposit_bonus = coalesce(nullif(v_credit_payload->>'deposit_bonus', '')::numeric, 0),
      processed_at = now(),
      processed_by = current_setting('app.current_user_id', true)::uuid,
      promo_bonus = coalesce(nullif(v_credit_payload->>'promo_bonus', '')::numeric, promo_bonus),
      referral_commission = coalesce(nullif(v_credit_payload->>'referral_commission', '')::numeric, 0),
      status = v_next_status,
      updated_at = now(),
      welcome_bonus = coalesce(nullif(v_credit_payload->>'welcome_bonus', '')::numeric, 0)
    where id = v_request.id;
  else
    update public.deposit_requests
    set
      admin_note = p_admin_note,
      processed_at = now(),
      processed_by = current_setting('app.current_user_id', true)::uuid,
      status = v_next_status,
      updated_at = now()
    where id = v_request.id;
  end if;

  return jsonb_build_object(
    'credited_amount', coalesce(v_credit_payload->>'credited_amount', null),
    'request_id', v_request.id,
    'status', v_next_status
  );
end;
$$;

grant execute on function public.request_deposit_review(numeric, text, uuid, uuid, text) to authenticated;
grant execute on function public.admin_update_deposit_status(uuid, text, text) to authenticated;

revoke execute on function public.credit_deposit_internal(uuid, numeric, numeric, text) from public, anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'process_deposit_event'
  ) then
    revoke execute on function public.process_deposit_event(numeric, numeric, text) from public, anon, authenticated;
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'process_deposit_checkout'
  ) then
    revoke execute on function public.process_deposit_checkout(numeric, text, uuid) from public, anon, authenticated;
  end if;
end $$;

;

-- ===== MIGRATION: 20260323000000_auto_crypto_deposit_automation.sql =====
create table if not exists public.crypto_deposit_address_pool (
  id uuid primary key default gen_random_uuid(),
  payment_method_id uuid not null references public.crypto_payment_methods(id) on delete cascade,
  address text not null,
  status text not null default 'available',
  assigned_instruction_id uuid,
  assigned_user_id uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crypto_payment_methods
  add column if not exists attribution_mode text not null default 'static',
  add column if not exists memo_label text,
  add column if not exists minimum_deposit_amount numeric not null default 10,
  add column if not exists confirmations_required integer not null default 1;

update public.crypto_payment_methods
set
  attribution_mode = coalesce(nullif(trim(attribution_mode), ''), 'static'),
  minimum_deposit_amount = greatest(coalesce(minimum_deposit_amount, 10), 0),
  confirmations_required = greatest(coalesce(confirmations_required, 1), 0),
  updated_at = now()
where
  attribution_mode is null
  or trim(attribution_mode) = ''
  or minimum_deposit_amount is null
  or confirmations_required is null
  or minimum_deposit_amount < 0
  or confirmations_required < 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_payment_methods_attribution_mode_check'
  ) then
    alter table public.crypto_payment_methods
      add constraint crypto_payment_methods_attribution_mode_check
      check (attribution_mode in ('static', 'memo', 'dynamic_address'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_payment_methods_minimum_deposit_amount_check'
  ) then
    alter table public.crypto_payment_methods
      add constraint crypto_payment_methods_minimum_deposit_amount_check
      check (minimum_deposit_amount >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_payment_methods_confirmations_required_check'
  ) then
    alter table public.crypto_payment_methods
      add constraint crypto_payment_methods_confirmations_required_check
      check (confirmations_required >= 0);
  end if;
end $$;

alter table public.crypto_deposit_address_pool
  add column if not exists payment_method_id uuid references public.crypto_payment_methods(id) on delete cascade,
  add column if not exists address text,
  add column if not exists status text not null default 'available',
  add column if not exists assigned_instruction_id uuid,
  add column if not exists assigned_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.crypto_deposit_address_pool
set
  status = coalesce(nullif(trim(status), ''), 'available'),
  updated_at = now()
where status is null or trim(status) = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_address_pool_status_check'
  ) then
    alter table public.crypto_deposit_address_pool
      add constraint crypto_deposit_address_pool_status_check
      check (status in ('available', 'assigned', 'retired'));
  end if;
end $$;

create unique index if not exists crypto_deposit_address_pool_method_address_uidx
  on public.crypto_deposit_address_pool(payment_method_id, address);

create index if not exists crypto_deposit_address_pool_status_idx
  on public.crypto_deposit_address_pool(payment_method_id, status, created_at);

create table if not exists public.crypto_deposit_instructions (
  id uuid primary key default gen_random_uuid(),
  deposit_request_id uuid not null references public.deposit_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_method_id uuid not null references public.crypto_payment_methods(id) on delete cascade,
  instruction_status text not null default 'awaiting_payment',
  deposit_address text not null,
  memo_value text,
  memo_label text,
  expected_amount_usd numeric not null,
  detected_amount_asset numeric,
  detected_amount_usd numeric,
  detected_asset_symbol text,
  detected_tx_hash text,
  required_confirmations integer not null default 1,
  observed_confirmations integer not null default 0,
  promo_bonus numeric not null default 0,
  credited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crypto_deposit_instructions
  add column if not exists deposit_request_id uuid references public.deposit_requests(id) on delete cascade,
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists payment_method_id uuid references public.crypto_payment_methods(id) on delete cascade,
  add column if not exists instruction_status text not null default 'awaiting_payment',
  add column if not exists deposit_address text,
  add column if not exists memo_value text,
  add column if not exists memo_label text,
  add column if not exists expected_amount_usd numeric,
  add column if not exists detected_amount_asset numeric,
  add column if not exists detected_amount_usd numeric,
  add column if not exists detected_asset_symbol text,
  add column if not exists detected_tx_hash text,
  add column if not exists required_confirmations integer not null default 1,
  add column if not exists observed_confirmations integer not null default 0,
  add column if not exists promo_bonus numeric not null default 0,
  add column if not exists credited_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.crypto_deposit_instructions
set
  instruction_status = coalesce(nullif(trim(instruction_status), ''), 'awaiting_payment'),
  required_confirmations = greatest(coalesce(required_confirmations, 1), 0),
  observed_confirmations = greatest(coalesce(observed_confirmations, 0), 0),
  promo_bonus = coalesce(promo_bonus, 0),
  updated_at = now()
where
  instruction_status is null
  or trim(instruction_status) = ''
  or required_confirmations is null
  or observed_confirmations is null
  or promo_bonus is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_instructions_status_check'
  ) then
    alter table public.crypto_deposit_instructions
      add constraint crypto_deposit_instructions_status_check
      check (instruction_status in ('awaiting_payment', 'payment_detected', 'confirming', 'credited', 'expired', 'cancelled'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_instructions_expected_amount_usd_check'
  ) then
    alter table public.crypto_deposit_instructions
      add constraint crypto_deposit_instructions_expected_amount_usd_check
      check (expected_amount_usd > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_instructions_required_confirmations_check'
  ) then
    alter table public.crypto_deposit_instructions
      add constraint crypto_deposit_instructions_required_confirmations_check
      check (required_confirmations >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_instructions_observed_confirmations_check'
  ) then
    alter table public.crypto_deposit_instructions
      add constraint crypto_deposit_instructions_observed_confirmations_check
      check (observed_confirmations >= 0);
  end if;
end $$;

create unique index if not exists crypto_deposit_instructions_request_uidx
  on public.crypto_deposit_instructions(deposit_request_id);

create index if not exists crypto_deposit_instructions_user_status_idx
  on public.crypto_deposit_instructions(user_id, instruction_status, created_at desc);

create index if not exists crypto_deposit_instructions_method_address_idx
  on public.crypto_deposit_instructions(payment_method_id, deposit_address, created_at desc);

create table if not exists public.crypto_deposit_events (
  id uuid primary key default gen_random_uuid(),
  instruction_id uuid references public.crypto_deposit_instructions(id) on delete set null,
  deposit_request_id uuid references public.deposit_requests(id) on delete set null,
  payment_method_id uuid references public.crypto_payment_methods(id) on delete set null,
  provider_name text,
  external_event_id text,
  tx_hash text not null,
  blockchain_address text not null,
  memo_value text,
  event_status text not null default 'detected',
  confirmations integer not null default 0,
  amount_asset numeric,
  amount_asset_symbol text,
  amount_usd numeric,
  raw_payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crypto_deposit_events
  add column if not exists instruction_id uuid references public.crypto_deposit_instructions(id) on delete set null,
  add column if not exists deposit_request_id uuid references public.deposit_requests(id) on delete set null,
  add column if not exists payment_method_id uuid references public.crypto_payment_methods(id) on delete set null,
  add column if not exists provider_name text,
  add column if not exists external_event_id text,
  add column if not exists tx_hash text,
  add column if not exists blockchain_address text,
  add column if not exists memo_value text,
  add column if not exists event_status text not null default 'detected',
  add column if not exists confirmations integer not null default 0,
  add column if not exists amount_asset numeric,
  add column if not exists amount_asset_symbol text,
  add column if not exists amount_usd numeric,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb,
  add column if not exists processed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.crypto_deposit_events
set
  event_status = coalesce(nullif(trim(event_status), ''), 'detected'),
  confirmations = greatest(coalesce(confirmations, 0), 0),
  raw_payload = coalesce(raw_payload, '{}'::jsonb),
  updated_at = now()
where
  event_status is null
  or trim(event_status) = ''
  or confirmations is null
  or raw_payload is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_events_event_status_check'
  ) then
    alter table public.crypto_deposit_events
      add constraint crypto_deposit_events_event_status_check
      check (event_status in ('detected', 'confirming', 'confirmed', 'credited', 'unmatched', 'rejected'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_events_confirmations_check'
  ) then
    alter table public.crypto_deposit_events
      add constraint crypto_deposit_events_confirmations_check
      check (confirmations >= 0);
  end if;
end $$;

create unique index if not exists crypto_deposit_events_method_tx_hash_uidx
  on public.crypto_deposit_events(payment_method_id, tx_hash)
  where payment_method_id is not null;

create index if not exists crypto_deposit_events_request_created_idx
  on public.crypto_deposit_events(deposit_request_id, created_at desc);

create index if not exists crypto_deposit_events_address_created_idx
  on public.crypto_deposit_events(blockchain_address, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'crypto_deposit_address_pool_assigned_instruction_id_fkey'
  ) then
    alter table public.crypto_deposit_address_pool
      add constraint crypto_deposit_address_pool_assigned_instruction_id_fkey
      foreign key (assigned_instruction_id)
      references public.crypto_deposit_instructions(id)
      on delete set null;
  end if;
end $$;

alter table public.crypto_deposit_address_pool enable row level security;
alter table public.crypto_deposit_instructions enable row level security;
alter table public.crypto_deposit_events enable row level security;

drop policy if exists "Admins can view address pool" on public.crypto_deposit_address_pool;
drop policy if exists "Admins can insert address pool" on public.crypto_deposit_address_pool;
drop policy if exists "Admins can update address pool" on public.crypto_deposit_address_pool;
drop policy if exists "Admins can delete address pool" on public.crypto_deposit_address_pool;

create policy "Admins can view address pool"
on public.crypto_deposit_address_pool
for select
to authenticated
using (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
);

create policy "Admins can insert address pool"
on public.crypto_deposit_address_pool
for insert
to authenticated
with check (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
);

create policy "Admins can update address pool"
on public.crypto_deposit_address_pool
for update
to authenticated
using (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
)
with check (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
);

create policy "Admins can delete address pool"
on public.crypto_deposit_address_pool
for delete
to authenticated
using (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
);

drop policy if exists "Users can view own crypto deposit instructions" on public.crypto_deposit_instructions;
drop policy if exists "Finance admins can view crypto deposit instructions" on public.crypto_deposit_instructions;

create policy "Users can view own crypto deposit instructions"
on public.crypto_deposit_instructions
for select
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id);

create policy "Finance admins can view crypto deposit instructions"
on public.crypto_deposit_instructions
for select
to authenticated
using (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
);

drop policy if exists "Finance admins can view crypto deposit events" on public.crypto_deposit_events;

create policy "Finance admins can view crypto deposit events"
on public.crypto_deposit_events
for select
to authenticated
using (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
);

create or replace function public.create_crypto_deposit_instruction(
  p_amount numeric,
  p_payment_method_id uuid,
  p_promo_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_method public.crypto_payment_methods%rowtype;
  v_address_pool public.crypto_deposit_address_pool%rowtype;
  v_instruction public.crypto_deposit_instructions%rowtype;
  v_request_payload jsonb := '{}'::jsonb;
  v_request_id uuid;
  v_promo_bonus numeric := 0;
  v_address text;
  v_memo_value text;
  v_memo_label text;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Deposit amount must be positive';
  end if;

  select *
  into v_method
  from public.crypto_payment_methods
  where id = p_payment_method_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Selected crypto deposit method is not active';
  end if;

  if coalesce(v_method.minimum_deposit_amount, 0) > 0 and p_amount < v_method.minimum_deposit_amount then
    raise exception 'Minimum deposit for % is % USD', coalesce(v_method.symbol, 'this method'), v_method.minimum_deposit_amount;
  end if;

  if v_method.attribution_mode = 'static' then
    raise exception 'This crypto method is still in static/manual mode. Switch it to memo or dynamic address mode to enable automatic crediting.';
  end if;

  if v_method.attribution_mode = 'memo' then
    v_address := trim(coalesce(v_method.wallet_address, ''));

    if v_address = '' then
      raise exception 'A fixed wallet address is required before memo-based deposits can be generated.';
    end if;

    v_memo_label := coalesce(nullif(trim(v_method.memo_label), ''), 'Memo');
    v_memo_value := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  elsif v_method.attribution_mode = 'dynamic_address' then
    select *
    into v_address_pool
    from public.crypto_deposit_address_pool
    where payment_method_id = v_method.id
      and status = 'available'
    order by created_at asc
    limit 1
    for update skip locked;

    if not found then
      raise exception 'No unused deposit addresses are available for this method. Import more addresses in the admin crypto panel.';
    end if;

    v_address := trim(coalesce(v_address_pool.address, ''));

    if v_address = '' then
      raise exception 'The selected address pool entry is empty.';
    end if;
  else
    raise exception 'Unsupported attribution mode: %', v_method.attribution_mode;
  end if;

  v_request_payload := public.request_deposit_review(
    p_amount,
    upper(trim(v_method.symbol)),
    p_promo_id,
    p_payment_method_id,
    null
  );

  v_request_id := nullif(v_request_payload->>'request_id', '')::uuid;
  v_promo_bonus := coalesce(nullif(v_request_payload->>'promo_bonus', '')::numeric, 0);

  if v_request_id is null then
    raise exception 'Deposit request could not be created';
  end if;

  insert into public.crypto_deposit_instructions (
    deposit_request_id,
    user_id,
    payment_method_id,
    instruction_status,
    deposit_address,
    memo_label,
    memo_value,
    expected_amount_usd,
    promo_bonus,
    required_confirmations
  )
  values (
    v_request_id,
    current_setting('app.current_user_id', true)::uuid,
    v_method.id,
    'awaiting_payment',
    v_address,
    v_memo_label,
    v_memo_value,
    p_amount,
    v_promo_bonus,
    greatest(coalesce(v_method.confirmations_required, 1), 0)
  )
  returning *
  into v_instruction;

  if v_method.attribution_mode = 'dynamic_address' and v_address_pool.id is not null then
    update public.crypto_deposit_address_pool
    set
      assigned_instruction_id = v_instruction.id,
      assigned_user_id = current_setting('app.current_user_id', true)::uuid,
      assigned_at = now(),
      status = 'assigned',
      updated_at = now()
    where id = v_address_pool.id;
  end if;

  return jsonb_build_object(
    'address', v_instruction.deposit_address,
    'amount', v_instruction.expected_amount_usd,
    'confirmations_required', v_instruction.required_confirmations,
    'deposit_request_id', v_instruction.deposit_request_id,
    'instruction_id', v_instruction.id,
    'instruction_status', v_instruction.instruction_status,
    'memo_label', v_instruction.memo_label,
    'memo_value', v_instruction.memo_value,
    'payment_method_id', v_instruction.payment_method_id,
    'promo_bonus', v_instruction.promo_bonus
  );
end;
$$;

create or replace function public.admin_update_deposit_status(
  p_request_id uuid,
  p_status text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.deposit_requests%rowtype;
  v_next_status text;
  v_credit_payload jsonb := '{}'::jsonb;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if not (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
  ) then
    raise exception 'Only finance managers or super admins can update deposit requests';
  end if;

  v_next_status := lower(trim(coalesce(p_status, '')));

  if v_next_status not in ('approved', 'rejected') then
    raise exception 'Deposit status must be approved or rejected';
  end if;

  select *
  into v_request
  from public.deposit_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Deposit request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending deposit requests can be processed';
  end if;

  if v_next_status = 'approved' then
    v_credit_payload := public.credit_deposit_internal(
      v_request.user_id,
      v_request.amount,
      coalesce(v_request.promo_bonus, 0),
      v_request.method
    );

    if v_request.promo_id is not null then
      update public.promo_codes
      set
        usages = coalesce(usages, 0) + 1,
        status = case
          when max_usages > 0 and coalesce(usages, 0) + 1 >= max_usages then 'expired'
          when expiry_date <= now() then 'expired'
          else status
        end
      where id = v_request.promo_id;
    end if;

    update public.deposit_requests
    set
      admin_note = p_admin_note,
      credited_amount = nullif(v_credit_payload->>'credited_amount', '')::numeric,
      deposit_bonus = coalesce(nullif(v_credit_payload->>'deposit_bonus', '')::numeric, 0),
      processed_at = now(),
      processed_by = current_setting('app.current_user_id', true)::uuid,
      promo_bonus = coalesce(nullif(v_credit_payload->>'promo_bonus', '')::numeric, promo_bonus),
      referral_commission = coalesce(nullif(v_credit_payload->>'referral_commission', '')::numeric, 0),
      status = v_next_status,
      updated_at = now(),
      welcome_bonus = coalesce(nullif(v_credit_payload->>'welcome_bonus', '')::numeric, 0)
    where id = v_request.id;

    perform public.create_notification_internal(
      v_request.user_id,
      'deposit_approved',
      'Deposit approved',
      format(
        'Your %s deposit of $%s has been approved and credited.',
        coalesce(v_request.method, 'deposit'),
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/deposit',
      jsonb_build_object(
        'deposit_request_id', v_request.id,
        'method', v_request.method,
        'amount', v_request.amount
      ),
      concat('deposit_request:', v_request.id::text, ':approved'),
      null
    );
  else
    update public.deposit_requests
    set
      admin_note = p_admin_note,
      processed_at = now(),
      processed_by = current_setting('app.current_user_id', true)::uuid,
      status = v_next_status,
      updated_at = now()
    where id = v_request.id;
  end if;

  return jsonb_build_object(
    'credited_amount', coalesce(v_credit_payload->>'credited_amount', null),
    'request_id', v_request.id,
    'status', v_next_status
  );
end;
$$;

create or replace function public.process_crypto_deposit_detection(
  p_tx_hash text,
  p_address text,
  p_payment_method_id uuid default null,
  p_memo_value text default null,
  p_confirmations integer default 0,
  p_amount_asset numeric default null,
  p_amount_asset_symbol text default null,
  p_amount_usd numeric default null,
  p_external_event_id text default null,
  p_event_status text default 'detected',
  p_provider_name text default null,
  p_raw_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_instruction public.crypto_deposit_instructions%rowtype;
  v_request public.deposit_requests%rowtype;
  v_method public.crypto_payment_methods%rowtype;
  v_event public.crypto_deposit_events%rowtype;
  v_credit_payload jsonb := '{}'::jsonb;
  v_credit_base numeric;
  v_effective_status text := lower(trim(coalesce(p_event_status, 'detected')));
  v_next_instruction_status text := 'payment_detected';
begin
  if trim(coalesce(p_tx_hash, '')) = '' then
    raise exception 'Transaction hash is required';
  end if;

  if trim(coalesce(p_address, '')) = '' then
    raise exception 'Destination address is required';
  end if;

  select i.*
  into v_instruction
  from public.crypto_deposit_instructions i
  join public.crypto_payment_methods m
    on m.id = i.payment_method_id
  where i.instruction_status in ('awaiting_payment', 'payment_detected', 'confirming', 'credited')
    and (
      (m.attribution_mode = 'memo' and i.deposit_address = trim(p_address) and coalesce(i.memo_value, '') = trim(coalesce(p_memo_value, '')))
      or (m.attribution_mode = 'dynamic_address' and i.deposit_address = trim(p_address))
    )
    and (p_payment_method_id is null or i.payment_method_id = p_payment_method_id)
  order by i.created_at desc
  limit 1
  for update;

  if not found then
    insert into public.crypto_deposit_events (
      payment_method_id,
      provider_name,
      external_event_id,
      tx_hash,
      blockchain_address,
      memo_value,
      event_status,
      confirmations,
      amount_asset,
      amount_asset_symbol,
      amount_usd,
      raw_payload,
      updated_at
    )
    values (
      p_payment_method_id,
      nullif(trim(coalesce(p_provider_name, '')), ''),
      nullif(trim(coalesce(p_external_event_id, '')), ''),
      trim(p_tx_hash),
      trim(p_address),
      nullif(trim(coalesce(p_memo_value, '')), ''),
      case
        when v_effective_status in ('credited', 'confirmed') then 'confirmed'
        when v_effective_status = 'rejected' then 'rejected'
        else 'unmatched'
      end,
      greatest(coalesce(p_confirmations, 0), 0),
      p_amount_asset,
      nullif(trim(coalesce(p_amount_asset_symbol, '')), ''),
      p_amount_usd,
      coalesce(p_raw_payload, '{}'::jsonb),
      now()
    )
    on conflict (payment_method_id, tx_hash)
    where payment_method_id is not null
    do update
    set
      blockchain_address = excluded.blockchain_address,
      confirmations = excluded.confirmations,
      event_status = excluded.event_status,
      memo_value = excluded.memo_value,
      amount_asset = excluded.amount_asset,
      amount_asset_symbol = excluded.amount_asset_symbol,
      amount_usd = excluded.amount_usd,
      provider_name = excluded.provider_name,
      external_event_id = excluded.external_event_id,
      raw_payload = excluded.raw_payload,
      updated_at = now()
    returning *
    into v_event;

    return jsonb_build_object(
      'credited', false,
      'event_id', v_event.id,
      'status', 'unmatched',
      'tx_hash', trim(p_tx_hash)
    );
  end if;

  select *
  into v_method
  from public.crypto_payment_methods
  where id = v_instruction.payment_method_id;

  select *
  into v_request
  from public.deposit_requests
  where id = v_instruction.deposit_request_id
  for update;

  insert into public.crypto_deposit_events (
    instruction_id,
    deposit_request_id,
    payment_method_id,
    provider_name,
    external_event_id,
    tx_hash,
    blockchain_address,
    memo_value,
    event_status,
    confirmations,
    amount_asset,
    amount_asset_symbol,
    amount_usd,
    raw_payload,
    updated_at
  )
  values (
    v_instruction.id,
    v_instruction.deposit_request_id,
    v_instruction.payment_method_id,
    nullif(trim(coalesce(p_provider_name, '')), ''),
    nullif(trim(coalesce(p_external_event_id, '')), ''),
    trim(p_tx_hash),
    trim(p_address),
    nullif(trim(coalesce(p_memo_value, '')), ''),
    case
      when v_effective_status = 'rejected' then 'rejected'
      when greatest(coalesce(p_confirmations, 0), 0) >= greatest(coalesce(v_instruction.required_confirmations, 0), 0) then 'confirmed'
      when greatest(coalesce(p_confirmations, 0), 0) > 0 then 'confirming'
      else 'detected'
    end,
    greatest(coalesce(p_confirmations, 0), 0),
    p_amount_asset,
    nullif(trim(coalesce(p_amount_asset_symbol, '')), ''),
    p_amount_usd,
    coalesce(p_raw_payload, '{}'::jsonb),
    now()
  )
  on conflict (payment_method_id, tx_hash)
  where payment_method_id is not null
  do update
  set
    instruction_id = excluded.instruction_id,
    deposit_request_id = excluded.deposit_request_id,
    blockchain_address = excluded.blockchain_address,
    confirmations = excluded.confirmations,
    event_status = excluded.event_status,
    memo_value = excluded.memo_value,
    amount_asset = excluded.amount_asset,
    amount_asset_symbol = excluded.amount_asset_symbol,
    amount_usd = excluded.amount_usd,
    provider_name = excluded.provider_name,
    external_event_id = excluded.external_event_id,
    raw_payload = excluded.raw_payload,
    updated_at = now()
  returning *
  into v_event;

  if v_request.status = 'approved' or v_instruction.instruction_status = 'credited' then
    update public.crypto_deposit_instructions
    set
      detected_amount_asset = coalesce(p_amount_asset, detected_amount_asset),
      detected_amount_usd = coalesce(p_amount_usd, detected_amount_usd),
      detected_asset_symbol = coalesce(nullif(trim(coalesce(p_amount_asset_symbol, '')), ''), detected_asset_symbol),
      detected_tx_hash = trim(p_tx_hash),
      observed_confirmations = greatest(coalesce(p_confirmations, 0), observed_confirmations),
      instruction_status = 'credited',
      credited_at = coalesce(credited_at, now()),
      updated_at = now()
    where id = v_instruction.id;

    update public.crypto_deposit_events
    set
      event_status = 'credited',
      processed_at = coalesce(processed_at, now()),
      updated_at = now()
    where id = v_event.id;

    return jsonb_build_object(
      'credited', true,
      'deposit_request_id', v_request.id,
      'event_id', v_event.id,
      'instruction_id', v_instruction.id,
      'status', 'already_credited',
      'tx_hash', trim(p_tx_hash)
    );
  end if;

  if v_effective_status = 'rejected' then
    update public.crypto_deposit_instructions
    set
      detected_amount_asset = coalesce(p_amount_asset, detected_amount_asset),
      detected_amount_usd = coalesce(p_amount_usd, detected_amount_usd),
      detected_asset_symbol = coalesce(nullif(trim(coalesce(p_amount_asset_symbol, '')), ''), detected_asset_symbol),
      detected_tx_hash = trim(p_tx_hash),
      observed_confirmations = greatest(coalesce(p_confirmations, 0), observed_confirmations),
      instruction_status = 'payment_detected',
      updated_at = now()
    where id = v_instruction.id;

    return jsonb_build_object(
      'credited', false,
      'deposit_request_id', v_request.id,
      'event_id', v_event.id,
      'instruction_id', v_instruction.id,
      'status', 'rejected',
      'tx_hash', trim(p_tx_hash)
    );
  end if;

  if greatest(coalesce(p_confirmations, 0), 0) >= greatest(coalesce(v_instruction.required_confirmations, 0), 0) then
    v_next_instruction_status := 'confirming';
  elsif greatest(coalesce(p_confirmations, 0), 0) > 0 then
    v_next_instruction_status := 'confirming';
  else
    v_next_instruction_status := 'payment_detected';
  end if;

  update public.crypto_deposit_instructions
  set
    detected_amount_asset = coalesce(p_amount_asset, detected_amount_asset),
    detected_amount_usd = coalesce(p_amount_usd, detected_amount_usd),
    detected_asset_symbol = coalesce(nullif(trim(coalesce(p_amount_asset_symbol, '')), ''), detected_asset_symbol),
    detected_tx_hash = trim(p_tx_hash),
    observed_confirmations = greatest(coalesce(p_confirmations, 0), observed_confirmations),
    instruction_status = v_next_instruction_status,
    updated_at = now()
  where id = v_instruction.id;

  if greatest(coalesce(p_confirmations, 0), 0) < greatest(coalesce(v_instruction.required_confirmations, 0), 0) then
    return jsonb_build_object(
      'credited', false,
      'confirmations_observed', greatest(coalesce(p_confirmations, 0), 0),
      'confirmations_required', greatest(coalesce(v_instruction.required_confirmations, 0), 0),
      'deposit_request_id', v_request.id,
      'event_id', v_event.id,
      'instruction_id', v_instruction.id,
      'status', v_next_instruction_status,
      'tx_hash', trim(p_tx_hash)
    );
  end if;

  v_credit_base := coalesce(p_amount_usd, v_instruction.expected_amount_usd, v_request.amount);

  if coalesce(v_credit_base, 0) < coalesce(v_method.minimum_deposit_amount, 0) then
    return jsonb_build_object(
      'credited', false,
      'deposit_request_id', v_request.id,
      'event_id', v_event.id,
      'instruction_id', v_instruction.id,
      'status', 'below_minimum',
      'tx_hash', trim(p_tx_hash)
    );
  end if;

  v_credit_payload := public.credit_deposit_internal(
    v_request.user_id,
    v_credit_base,
    coalesce(v_request.promo_bonus, 0),
    v_request.method
  );

  if v_request.promo_id is not null then
    update public.promo_codes
    set
      usages = coalesce(usages, 0) + 1,
      status = case
        when max_usages > 0 and coalesce(usages, 0) + 1 >= max_usages then 'expired'
        when expiry_date <= now() then 'expired'
        else status
      end
    where id = v_request.promo_id;
  end if;

  update public.deposit_requests
  set
    admin_note = coalesce(admin_note, 'Auto-credited by crypto webhook'),
    credited_amount = nullif(v_credit_payload->>'credited_amount', '')::numeric,
    deposit_bonus = coalesce(nullif(v_credit_payload->>'deposit_bonus', '')::numeric, 0),
    processed_at = now(),
    processed_by = null,
    promo_bonus = coalesce(nullif(v_credit_payload->>'promo_bonus', '')::numeric, promo_bonus),
    referral_commission = coalesce(nullif(v_credit_payload->>'referral_commission', '')::numeric, 0),
    status = 'approved',
    tx_hash = trim(p_tx_hash),
    updated_at = now(),
    welcome_bonus = coalesce(nullif(v_credit_payload->>'welcome_bonus', '')::numeric, 0)
  where id = v_request.id;

  update public.crypto_deposit_instructions
  set
    detected_amount_asset = coalesce(p_amount_asset, detected_amount_asset),
    detected_amount_usd = coalesce(p_amount_usd, detected_amount_usd),
    detected_asset_symbol = coalesce(nullif(trim(coalesce(p_amount_asset_symbol, '')), ''), detected_asset_symbol),
    detected_tx_hash = trim(p_tx_hash),
    observed_confirmations = greatest(coalesce(p_confirmations, 0), observed_confirmations),
    instruction_status = 'credited',
    credited_at = now(),
    updated_at = now()
  where id = v_instruction.id;

  update public.crypto_deposit_events
  set
    event_status = 'credited',
    processed_at = now(),
    updated_at = now()
  where id = v_event.id;

  perform public.create_notification_internal(
    v_request.user_id,
    'crypto_deposit_confirmed',
    'Crypto deposit credited',
    format(
      'Your %s deposit of $%s has been credited after %s confirmation(s).',
      coalesce(v_request.method, 'crypto'),
      trim(to_char(v_credit_base, 'FM999999990.00')),
      greatest(coalesce(p_confirmations, 0), 0)
    ),
    '/deposit',
    jsonb_build_object(
      'amount_usd', v_credit_base,
      'confirmations', greatest(coalesce(p_confirmations, 0), 0),
      'deposit_request_id', v_request.id,
      'instruction_id', v_instruction.id,
      'tx_hash', trim(p_tx_hash)
    ),
    concat('crypto_deposit:', v_request.id::text, ':', trim(p_tx_hash)),
    null
  );

  return jsonb_build_object(
    'credited', true,
    'credited_amount', coalesce(v_credit_payload->>'credited_amount', null),
    'deposit_request_id', v_request.id,
    'event_id', v_event.id,
    'instruction_id', v_instruction.id,
    'status', 'credited',
    'tx_hash', trim(p_tx_hash)
  );
end;
$$;

grant execute on function public.create_crypto_deposit_instruction(numeric, uuid, uuid) to authenticated;
grant execute on function public.admin_update_deposit_status(uuid, text, text) to authenticated;
grant execute on function public.process_crypto_deposit_detection(text, text, uuid, text, integer, numeric, text, numeric, text, text, text, jsonb) to service_role;

revoke execute on function public.process_crypto_deposit_detection(text, text, uuid, text, integer, numeric, text, numeric, text, text, text, jsonb) from public, anon, authenticated;

;

-- ===== MIGRATION: 20260324000000_add_tournament_rebuy_cost.sql =====
alter table public.tournaments
  add column if not exists rebuy_cost numeric;

update public.tournaments
set rebuy_cost = entry_fee
where rebuy_cost is null;

alter table public.tournaments
  alter column rebuy_cost set default 0,
  alter column rebuy_cost set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tournaments_rebuy_cost_non_negative'
      and conrelid = 'public.tournaments'::regclass
  ) then
    alter table public.tournaments
      add constraint tournaments_rebuy_cost_non_negative
      check (rebuy_cost >= 0);
  end if;
end
$$;

-- ===== MIGRATION: 20260324000001_repair_tournament_trade_links.sql =====
alter table public.trades
  add column if not exists tournament_participant_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trades_tournament_participant_id_fkey'
      and conrelid = 'public.trades'::regclass
  ) then
    alter table public.trades
      add constraint trades_tournament_participant_id_fkey
      foreign key (tournament_participant_id)
      references public.tournament_participants(id)
      on delete set null;
  end if;
end
$$;

comment on column public.trades.tournament_participant_id is 'Links a trade to a tournament participant when it was opened in a tournament account.';

create index if not exists trades_tournament_participant_id_idx
  on public.trades(tournament_participant_id)
  where tournament_participant_id is not null;

notify pgrst, 'reload schema';

-- ===== MIGRATION: 20260324000002_reuse_open_crypto_deposit_instruction.sql =====
create or replace function public.create_crypto_deposit_instruction(
  p_amount numeric,
  p_payment_method_id uuid,
  p_promo_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_method public.crypto_payment_methods%rowtype;
  v_address_pool public.crypto_deposit_address_pool%rowtype;
  v_instruction public.crypto_deposit_instructions%rowtype;
  v_request_payload jsonb := '{}'::jsonb;
  v_request_id uuid;
  v_promo_bonus numeric := 0;
  v_address text;
  v_memo_value text;
  v_memo_label text;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Deposit amount must be positive';
  end if;

  select *
  into v_method
  from public.crypto_payment_methods
  where id = p_payment_method_id
    and status = 'active'
  for update;

  if not found then
    raise exception 'Selected crypto deposit method is not active';
  end if;

  if coalesce(v_method.minimum_deposit_amount, 0) > 0 and p_amount < v_method.minimum_deposit_amount then
    raise exception 'Minimum deposit for % is % USD', coalesce(v_method.symbol, 'this method'), v_method.minimum_deposit_amount;
  end if;

  if v_method.attribution_mode = 'static' then
    raise exception 'This crypto method is still in static/manual mode. Switch it to memo or dynamic address mode to enable automatic crediting.';
  end if;

  select i.*
  into v_instruction
  from public.crypto_deposit_instructions i
  join public.deposit_requests r
    on r.id = i.deposit_request_id
  where i.user_id = current_setting('app.current_user_id', true)::uuid
    and i.payment_method_id = v_method.id
    and i.instruction_status in ('awaiting_payment', 'payment_detected', 'confirming')
    and r.status = 'pending'
    and i.expected_amount_usd = p_amount
    and (
      (p_promo_id is null and r.promo_id is null)
      or r.promo_id = p_promo_id
    )
  order by i.created_at desc
  limit 1
  for update;

  if found then
    return jsonb_build_object(
      'address', v_instruction.deposit_address,
      'amount', v_instruction.expected_amount_usd,
      'confirmations_required', v_instruction.required_confirmations,
      'created_at', v_instruction.created_at,
      'deposit_request_id', v_instruction.deposit_request_id,
      'instruction_id', v_instruction.id,
      'instruction_status', v_instruction.instruction_status,
      'memo_label', v_instruction.memo_label,
      'memo_value', v_instruction.memo_value,
      'payment_method_id', v_instruction.payment_method_id,
      'promo_bonus', v_instruction.promo_bonus
    );
  end if;

  if v_method.attribution_mode = 'memo' then
    v_address := trim(coalesce(v_method.wallet_address, ''));

    if v_address = '' then
      raise exception 'A fixed wallet address is required before memo-based deposits can be generated.';
    end if;

    v_memo_label := coalesce(nullif(trim(v_method.memo_label), ''), 'Memo');
    v_memo_value := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  elsif v_method.attribution_mode = 'dynamic_address' then
    select *
    into v_address_pool
    from public.crypto_deposit_address_pool
    where payment_method_id = v_method.id
      and status = 'available'
    order by created_at asc
    limit 1
    for update skip locked;

    if not found then
      raise exception 'No unused deposit addresses are available for this method. Import more addresses in the admin crypto panel.';
    end if;

    v_address := trim(coalesce(v_address_pool.address, ''));

    if v_address = '' then
      raise exception 'The selected address pool entry is empty.';
    end if;
  else
    raise exception 'Unsupported attribution mode: %', v_method.attribution_mode;
  end if;

  v_request_payload := public.request_deposit_review(
    p_amount,
    upper(trim(v_method.symbol)),
    p_promo_id,
    p_payment_method_id,
    null
  );

  v_request_id := nullif(v_request_payload->>'request_id', '')::uuid;
  v_promo_bonus := coalesce(nullif(v_request_payload->>'promo_bonus', '')::numeric, 0);

  if v_request_id is null then
    raise exception 'Deposit request could not be created';
  end if;

  insert into public.crypto_deposit_instructions (
    deposit_request_id,
    user_id,
    payment_method_id,
    instruction_status,
    deposit_address,
    memo_label,
    memo_value,
    expected_amount_usd,
    promo_bonus,
    required_confirmations
  )
  values (
    v_request_id,
    current_setting('app.current_user_id', true)::uuid,
    v_method.id,
    'awaiting_payment',
    v_address,
    v_memo_label,
    v_memo_value,
    p_amount,
    v_promo_bonus,
    greatest(coalesce(v_method.confirmations_required, 1), 0)
  )
  returning *
  into v_instruction;

  if v_method.attribution_mode = 'dynamic_address' and v_address_pool.id is not null then
    update public.crypto_deposit_address_pool
    set
      assigned_instruction_id = v_instruction.id,
      assigned_user_id = current_setting('app.current_user_id', true)::uuid,
      assigned_at = now(),
      status = 'assigned',
      updated_at = now()
    where id = v_address_pool.id;
  end if;

  return jsonb_build_object(
    'address', v_instruction.deposit_address,
    'amount', v_instruction.expected_amount_usd,
    'confirmations_required', v_instruction.required_confirmations,
    'created_at', v_instruction.created_at,
    'deposit_request_id', v_instruction.deposit_request_id,
    'instruction_id', v_instruction.id,
    'instruction_status', v_instruction.instruction_status,
    'memo_label', v_instruction.memo_label,
    'memo_value', v_instruction.memo_value,
    'payment_method_id', v_instruction.payment_method_id,
    'promo_bonus', v_instruction.promo_bonus
  );
end;
$$;

-- ===== MIGRATION: 20260324000003_social_trading_module.sql =====
create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists followers_count integer not null default 0,
  add column if not exists following_count integer not null default 0,
  add column if not exists social_trading_disabled boolean not null default false;

alter table public.trades
  add column if not exists source_trade_id uuid references public.trades(id) on delete set null,
  add column if not exists copied_from_user_id uuid references public.users(id) on delete set null,
  add column if not exists copy_setting_id uuid,
  add column if not exists trade_context text not null default 'manual';

create table if not exists public.follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  followed_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint follows_not_self check (follower_id <> followed_id)
);

create table if not exists public.copy_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_user_id uuid not null references public.users(id) on delete cascade,
  enabled boolean not null default true,
  amount_type text not null default 'fixed',
  execution_mode text not null default 'automatic',
  fixed_amount numeric(12, 2),
  ratio numeric(12, 4),
  max_per_trade numeric(12, 2),
  max_daily numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint copy_settings_unique_pair unique (user_id, target_user_id),
  constraint copy_settings_not_self check (user_id <> target_user_id),
  constraint copy_settings_amount_type_check check (amount_type in ('fixed', 'ratio')),
  constraint copy_settings_execution_mode_check check (execution_mode in ('automatic', 'manual'))
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trades_copy_setting_id_fkey'
  ) then
    alter table public.trades
      add constraint trades_copy_setting_id_fkey
      foreign key (copy_setting_id)
      references public.copy_settings(id)
      on delete set null;
  end if;
end $$;

create table if not exists public.social_feed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  actor_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

create index if not exists follows_followed_created_idx
  on public.follows(followed_id, created_at desc);

create index if not exists follows_follower_created_idx
  on public.follows(follower_id, created_at desc);

create index if not exists copy_settings_user_enabled_idx
  on public.copy_settings(user_id, enabled, updated_at desc);

create index if not exists copy_settings_target_enabled_idx
  on public.copy_settings(target_user_id, enabled, updated_at desc);

create index if not exists social_feed_user_created_idx
  on public.social_feed(user_id, created_at desc);

create index if not exists social_feed_actor_created_idx
  on public.social_feed(actor_id, created_at desc);

create unique index if not exists trades_user_source_trade_unique
  on public.trades(user_id, source_trade_id)
  where source_trade_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trades_trade_context_check'
  ) then
    alter table public.trades
      add constraint trades_trade_context_check
      check (trade_context in ('manual', 'copied', 'manual_copy'));
  end if;
end $$;

create or replace function public.refresh_social_follow_counts(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    followers_count = (
      select count(*)
      from public.follows
      where followed_id = p_user_id
    ),
    following_count = (
      select count(*)
      from public.follows
      where follower_id = p_user_id
    ),
    updated_at = now()
  where id = p_user_id;
end;
$$;

create or replace function public.sync_social_follow_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_social_follow_counts(new.follower_id);
    perform public.refresh_social_follow_counts(new.followed_id);
    return new;
  end if;

  perform public.refresh_social_follow_counts(old.follower_id);
  perform public.refresh_social_follow_counts(old.followed_id);
  return old;
end;
$$;

drop trigger if exists follows_sync_counts on public.follows;
create trigger follows_sync_counts
  after insert or delete on public.follows
  for each row
  execute function public.sync_social_follow_counts();

create or replace function public.touch_copy_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists copy_settings_touch_updated_at on public.copy_settings;
create trigger copy_settings_touch_updated_at
  before update on public.copy_settings
  for each row
  execute function public.touch_copy_settings();

create or replace function public.create_social_feed_entry_internal(
  p_user_id uuid,
  p_actor_id uuid,
  p_type text,
  p_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_feed_id uuid;
begin
  insert into public.social_feed (user_id, actor_id, type, data)
  values (p_user_id, p_actor_id, p_type, coalesce(p_data, '{}'::jsonb))
  returning id into v_feed_id;

  return v_feed_id;
end;
$$;

create or replace function public.follow_trader(p_followed_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_follower_id uuid := current_setting('app.current_user_id', true)::uuid;
  v_actor public.profiles%rowtype;
  v_target public.profiles%rowtype;
begin
  if v_follower_id is null then
    raise exception 'Authentication required';
  end if;

  if p_followed_id is null or p_followed_id = v_follower_id then
    raise exception 'You cannot follow this trader';
  end if;

  select * into v_actor from public.profiles where id = v_follower_id;
  select * into v_target from public.profiles where id = p_followed_id;

  if not found then
    raise exception 'Trader not found';
  end if;

  if coalesce(v_target.social_trading_disabled, false) then
    raise exception 'This trader has disabled social trading';
  end if;

  if exists (
    select 1
    from public.follows
    where follower_id = v_follower_id
      and followed_id = p_followed_id
  ) then
    return jsonb_build_object('ok', true, 'status', 'already_following');
  end if;

  insert into public.follows (follower_id, followed_id)
  values (v_follower_id, p_followed_id)
  on conflict do nothing;

  perform public.create_social_feed_entry_internal(
    p_followed_id,
    v_follower_id,
    'new_follower',
    jsonb_build_object(
      'actor_username', v_actor.username,
      'actor_display_name', v_actor.display_name,
      'actor_avatar_url', v_actor.avatar_url,
      'actor_vip_tier', v_actor.vip_tier
    )
  );

  perform public.create_notification_internal(
    p_followed_id,
    'social_follow',
    coalesce('@' || nullif(v_actor.username, ''), 'A new follower joined your desk'),
    coalesce('@' || nullif(v_actor.username, '') || ' started following your trades.', 'A trader started following you.'),
    case
      when nullif(v_actor.username, '') is null then '/trade'
      else '/traders/' || v_actor.username
    end,
    jsonb_build_object(
      'actor_id', v_follower_id,
      'actor_username', v_actor.username,
      'actor_avatar_url', v_actor.avatar_url
    ),
    'social-follow-' || v_follower_id::text || '-' || p_followed_id::text,
    null
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.unfollow_trader(p_followed_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_follower_id uuid := current_setting('app.current_user_id', true)::uuid;
begin
  if v_follower_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.follows
  where follower_id = v_follower_id
    and followed_id = p_followed_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.upsert_copy_setting(
  p_target_user_id uuid,
  p_enabled boolean default true,
  p_amount_type text default 'fixed',
  p_fixed_amount numeric default null,
  p_ratio numeric default null,
  p_max_per_trade numeric default null,
  p_max_daily numeric default null,
  p_execution_mode text default 'automatic'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := current_setting('app.current_user_id', true)::uuid;
  v_row public.copy_settings%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_target_user_id is null or p_target_user_id = v_user_id then
    raise exception 'Invalid copy target';
  end if;

  insert into public.copy_settings (
    user_id,
    target_user_id,
    enabled,
    amount_type,
    execution_mode,
    fixed_amount,
    ratio,
    max_per_trade,
    max_daily
  )
  values (
    v_user_id,
    p_target_user_id,
    coalesce(p_enabled, true),
    coalesce(p_amount_type, 'fixed'),
    coalesce(p_execution_mode, 'automatic'),
    p_fixed_amount,
    p_ratio,
    p_max_per_trade,
    p_max_daily
  )
  on conflict (user_id, target_user_id)
  do update set
    enabled = excluded.enabled,
    amount_type = excluded.amount_type,
    execution_mode = excluded.execution_mode,
    fixed_amount = excluded.fixed_amount,
    ratio = excluded.ratio,
    max_per_trade = excluded.max_per_trade,
    max_daily = excluded.max_daily,
    updated_at = now()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.delete_copy_setting(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.copy_settings
  where user_id = current_setting('app.current_user_id', true)::uuid
    and target_user_id = p_target_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.execute_manual_copy_trade(
  p_copy_setting_id uuid,
  p_source_trade_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := current_setting('app.current_user_id', true)::uuid;
  v_trade public.trades%rowtype;
  v_setting public.copy_settings%rowtype;
  v_target public.profiles%rowtype;
  v_actor public.profiles%rowtype;
  v_amount numeric(12, 2);
  v_daily_total numeric(12, 2);
  v_copy_trade_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_setting
  from public.copy_settings
  where id = p_copy_setting_id
    and user_id = v_user_id
    and enabled = true
    and execution_mode = 'manual';

  if not found then
    raise exception 'Copy setting not found';
  end if;

  select * into v_trade
  from public.trades
  where id = p_source_trade_id
    and user_id = v_setting.target_user_id
    and status = 'open';

  if not found then
    raise exception 'The source trade is no longer available';
  end if;

  if exists (
    select 1
    from public.trades
    where user_id = v_user_id
      and source_trade_id = p_source_trade_id
  ) then
    return jsonb_build_object('ok', true, 'status', 'already_copied');
  end if;

  select * into v_target from public.profiles where id = v_user_id;
  select * into v_actor from public.profiles where id = v_setting.target_user_id;

  v_amount :=
    case
      when v_setting.amount_type = 'ratio' then round((v_trade.amount * coalesce(v_setting.ratio, 1))::numeric, 2)
      else round(coalesce(v_setting.fixed_amount, v_trade.amount)::numeric, 2)
    end;

  if v_setting.max_per_trade is not null then
    v_amount := least(v_amount, v_setting.max_per_trade);
  end if;

  select coalesce(sum(amount), 0)
  into v_daily_total
  from public.trades
  where user_id = v_user_id
    and copy_setting_id = v_setting.id
    and opened_at >= date_trunc('day', now())
    and opened_at < date_trunc('day', now()) + interval '1 day';

  if v_setting.max_daily is not null and (v_daily_total + v_amount) > v_setting.max_daily then
    return jsonb_build_object('ok', false, 'status', 'daily_limit');
  end if;

  if coalesce(v_target.balance, 0) < v_amount then
    return jsonb_build_object('ok', false, 'status', 'insufficient_balance');
  end if;

  update public.profiles
  set balance = balance - v_amount,
      updated_at = now()
  where id = v_user_id;

  insert into public.trades (
    user_id,
    asset_symbol,
    direction,
    amount,
    entry_price,
    expiry_seconds,
    payout_rate,
    status,
    opened_at,
    source_trade_id,
    copied_from_user_id,
    copy_setting_id,
    trade_context
  )
  values (
    v_user_id,
    v_trade.asset_symbol,
    v_trade.direction,
    v_amount,
    v_trade.entry_price,
    v_trade.expiry_seconds,
    v_trade.payout_rate,
    'open',
    now(),
    v_trade.id,
    v_trade.user_id,
    v_setting.id,
    'manual_copy'
  )
  returning id into v_copy_trade_id;

  perform public.create_social_feed_entry_internal(
    v_user_id,
    v_trade.user_id,
    'copy_trade_executed',
    jsonb_build_object(
      'actor_username', v_actor.username,
      'actor_display_name', v_actor.display_name,
      'actor_avatar_url', v_actor.avatar_url,
      'actor_vip_tier', v_actor.vip_tier,
      'asset_symbol', v_trade.asset_symbol,
      'direction', v_trade.direction,
      'amount', v_amount,
      'expiry_seconds', v_trade.expiry_seconds,
      'source_trade_id', v_trade.id,
      'copy_trade_id', v_copy_trade_id
    )
  );

  perform public.create_notification_internal(
    v_user_id,
    'copy_trade',
    coalesce('@' || nullif(v_actor.username, ''), 'Copy trade executed'),
    'Your manual copy is now live on ' || v_trade.asset_symbol || '.',
    '/trade',
    jsonb_build_object(
      'source_trade_id', v_trade.id,
      'copy_trade_id', v_copy_trade_id,
      'actor_username', v_actor.username,
      'asset_symbol', v_trade.asset_symbol
    ),
    'manual-copy-' || v_setting.id::text || '-' || v_trade.id::text,
    null
  );

  return jsonb_build_object('ok', true, 'status', 'copied', 'trade_id', v_copy_trade_id);
end;
$$;

create or replace function public.process_social_trade_open(p_trade_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade public.trades%rowtype;
  v_actor public.profiles%rowtype;
  v_copy_trade_id uuid;
  v_amount numeric(12, 2);
  v_daily_total numeric(12, 2);
  v_profile_link text;
  v_feed_count integer := 0;
  v_copied_count integer := 0;
  v_manual_count integer := 0;
  v_skipped_count integer := 0;
  follower_record record;
begin
  select * into v_trade
  from public.trades
  where id = p_trade_id;

  if not found then
    raise exception 'Trade not found';
  end if;

  select * into v_actor
  from public.profiles
  where id = v_trade.user_id;

  if coalesce(v_trade.source_trade_id, null) is not null then
    return jsonb_build_object('ok', true, 'status', 'copy_trade_ignored');
  end if;

  if coalesce(v_actor.social_trading_disabled, false) then
    return jsonb_build_object('ok', true, 'status', 'actor_disabled');
  end if;

  v_profile_link := case
    when nullif(v_actor.username, '') is null then '/trade'
    else '/traders/' || v_actor.username
  end;

  for follower_record in
    select
      f.follower_id,
      p.balance,
      p.username as follower_username,
      p.social_trading_disabled,
      cs.id as copy_setting_id,
      cs.enabled,
      cs.amount_type,
      cs.execution_mode,
      cs.fixed_amount,
      cs.ratio,
      cs.max_per_trade,
      cs.max_daily
    from public.follows f
    join public.profiles p on p.id = f.follower_id
    left join public.copy_settings cs
      on cs.user_id = f.follower_id
     and cs.target_user_id = v_trade.user_id
     and cs.enabled = true
    where f.followed_id = v_trade.user_id
  loop
    perform public.create_social_feed_entry_internal(
      follower_record.follower_id,
      v_trade.user_id,
      'trade_open',
      jsonb_build_object(
        'actor_username', v_actor.username,
        'actor_display_name', v_actor.display_name,
        'actor_avatar_url', v_actor.avatar_url,
        'actor_vip_tier', v_actor.vip_tier,
        'asset_symbol', v_trade.asset_symbol,
        'direction', v_trade.direction,
        'amount', v_trade.amount,
        'expiry_seconds', v_trade.expiry_seconds,
        'source_trade_id', v_trade.id
      )
    );
    v_feed_count := v_feed_count + 1;

    perform public.create_notification_internal(
      follower_record.follower_id,
      'social_trade',
      coalesce('@' || nullif(v_actor.username, ''), 'A followed trader opened a trade'),
      coalesce('@' || nullif(v_actor.username, ''), 'A followed trader') || ' opened a ' ||
        case when v_trade.direction = 'higher' then 'UP' else 'DOWN' end ||
        ' trade on ' || v_trade.asset_symbol || '.',
      v_profile_link,
      jsonb_build_object(
        'source_trade_id', v_trade.id,
        'asset_symbol', v_trade.asset_symbol,
        'direction', v_trade.direction,
        'amount', v_trade.amount,
        'expiry_seconds', v_trade.expiry_seconds,
        'actor_username', v_actor.username,
        'actor_avatar_url', v_actor.avatar_url
      ),
      'social-trade-open-' || v_trade.id::text || '-' || follower_record.follower_id::text,
      null
    );

    if follower_record.copy_setting_id is null or coalesce(follower_record.social_trading_disabled, false) then
      continue;
    end if;

    v_amount :=
      case
        when follower_record.amount_type = 'ratio' then round((v_trade.amount * coalesce(follower_record.ratio, 1))::numeric, 2)
        else round(coalesce(follower_record.fixed_amount, v_trade.amount)::numeric, 2)
      end;

    if follower_record.max_per_trade is not null then
      v_amount := least(v_amount, follower_record.max_per_trade);
    end if;

    select coalesce(sum(amount), 0)
    into v_daily_total
    from public.trades
    where user_id = follower_record.follower_id
      and copy_setting_id = follower_record.copy_setting_id
      and opened_at >= date_trunc('day', now())
      and opened_at < date_trunc('day', now()) + interval '1 day';

    if follower_record.max_daily is not null and (v_daily_total + v_amount) > follower_record.max_daily then
      perform public.create_social_feed_entry_internal(
        follower_record.follower_id,
        v_trade.user_id,
        'copy_trade_skipped',
        jsonb_build_object(
          'actor_username', v_actor.username,
          'actor_display_name', v_actor.display_name,
          'actor_avatar_url', v_actor.avatar_url,
          'actor_vip_tier', v_actor.vip_tier,
          'asset_symbol', v_trade.asset_symbol,
          'direction', v_trade.direction,
          'amount', v_amount,
          'expiry_seconds', v_trade.expiry_seconds,
          'source_trade_id', v_trade.id,
          'reason', 'Daily copy limit reached'
        )
      );
      v_skipped_count := v_skipped_count + 1;
      continue;
    end if;

    if coalesce(follower_record.balance, 0) < v_amount then
      perform public.create_social_feed_entry_internal(
        follower_record.follower_id,
        v_trade.user_id,
        'copy_trade_skipped',
        jsonb_build_object(
          'actor_username', v_actor.username,
          'actor_display_name', v_actor.display_name,
          'actor_avatar_url', v_actor.avatar_url,
          'actor_vip_tier', v_actor.vip_tier,
          'asset_symbol', v_trade.asset_symbol,
          'direction', v_trade.direction,
          'amount', v_amount,
          'expiry_seconds', v_trade.expiry_seconds,
          'source_trade_id', v_trade.id,
          'reason', 'Insufficient balance'
        )
      );
      v_skipped_count := v_skipped_count + 1;
      continue;
    end if;

    if follower_record.execution_mode = 'manual' then
      perform public.create_social_feed_entry_internal(
        follower_record.follower_id,
        v_trade.user_id,
        'copy_signal',
        jsonb_build_object(
          'actor_username', v_actor.username,
          'actor_display_name', v_actor.display_name,
          'actor_avatar_url', v_actor.avatar_url,
          'actor_vip_tier', v_actor.vip_tier,
          'asset_symbol', v_trade.asset_symbol,
          'direction', v_trade.direction,
          'amount', v_amount,
          'expiry_seconds', v_trade.expiry_seconds,
          'source_trade_id', v_trade.id,
          'copy_setting_id', follower_record.copy_setting_id,
          'execution_mode', follower_record.execution_mode
        )
      );
      v_manual_count := v_manual_count + 1;
      continue;
    end if;

    update public.profiles
    set balance = balance - v_amount,
        updated_at = now()
    where id = follower_record.follower_id;

    insert into public.trades (
      user_id,
      asset_symbol,
      direction,
      amount,
      entry_price,
      expiry_seconds,
      payout_rate,
      status,
      opened_at,
      source_trade_id,
      copied_from_user_id,
      copy_setting_id,
      trade_context
    )
    values (
      follower_record.follower_id,
      v_trade.asset_symbol,
      v_trade.direction,
      v_amount,
      v_trade.entry_price,
      v_trade.expiry_seconds,
      v_trade.payout_rate,
      'open',
      now(),
      v_trade.id,
      v_trade.user_id,
      follower_record.copy_setting_id,
      'copied'
    )
    returning id into v_copy_trade_id;

    perform public.create_social_feed_entry_internal(
      follower_record.follower_id,
      v_trade.user_id,
      'copy_trade_executed',
      jsonb_build_object(
        'actor_username', v_actor.username,
        'actor_display_name', v_actor.display_name,
        'actor_avatar_url', v_actor.avatar_url,
        'actor_vip_tier', v_actor.vip_tier,
        'asset_symbol', v_trade.asset_symbol,
        'direction', v_trade.direction,
        'amount', v_amount,
        'expiry_seconds', v_trade.expiry_seconds,
        'source_trade_id', v_trade.id,
        'copy_trade_id', v_copy_trade_id
      )
    );

    perform public.create_notification_internal(
      follower_record.follower_id,
      'copy_trade',
      coalesce('@' || nullif(v_actor.username, ''), 'Copy trade opened'),
      'Your copy trade is now live on ' || v_trade.asset_symbol || '.',
      '/trade',
      jsonb_build_object(
        'source_trade_id', v_trade.id,
        'copy_trade_id', v_copy_trade_id,
        'actor_username', v_actor.username,
        'asset_symbol', v_trade.asset_symbol
      ),
      'copy-trade-open-' || v_trade.id::text || '-' || follower_record.follower_id::text,
      null
    );

    perform public.create_notification_internal(
      v_trade.user_id,
      'trade_copied',
      'A trader copied your position',
      coalesce('@' || nullif(follower_record.follower_username, ''), 'A follower') || ' copied your trade on ' || v_trade.asset_symbol || '.',
      v_profile_link,
      jsonb_build_object(
        'source_trade_id', v_trade.id,
        'copy_trade_id', v_copy_trade_id,
        'follower_username', follower_record.follower_username
      ),
      'trade-copied-' || v_trade.id::text || '-' || follower_record.follower_id::text,
      null
    );

    v_copied_count := v_copied_count + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'feed_count', v_feed_count,
    'copied_count', v_copied_count,
    'manual_count', v_manual_count,
    'skipped_count', v_skipped_count
  );
end;
$$;

create or replace function public.process_social_trade_close(p_trade_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade public.trades%rowtype;
  v_actor public.profiles%rowtype;
  follower_record record;
  v_feed_count integer := 0;
begin
  select * into v_trade
  from public.trades
  where id = p_trade_id;

  if not found then
    raise exception 'Trade not found';
  end if;

  if v_trade.source_trade_id is not null then
    return jsonb_build_object('ok', true, 'status', 'copy_trade_ignored');
  end if;

  select * into v_actor
  from public.profiles
  where id = v_trade.user_id;

  for follower_record in
    select follower_id
    from public.follows
    where followed_id = v_trade.user_id
  loop
    perform public.create_social_feed_entry_internal(
      follower_record.follower_id,
      v_trade.user_id,
      'trade_closed',
      jsonb_build_object(
        'actor_username', v_actor.username,
        'actor_display_name', v_actor.display_name,
        'actor_avatar_url', v_actor.avatar_url,
        'actor_vip_tier', v_actor.vip_tier,
        'asset_symbol', v_trade.asset_symbol,
        'direction', v_trade.direction,
        'amount', v_trade.amount,
        'expiry_seconds', v_trade.expiry_seconds,
        'profit', v_trade.profit,
        'status', v_trade.status,
        'source_trade_id', v_trade.id
      )
    );
    v_feed_count := v_feed_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'feed_count', v_feed_count);
end;
$$;

alter table public.follows enable row level security;
alter table public.copy_settings enable row level security;
alter table public.social_feed enable row level security;

drop policy if exists "follows_select_all" on public.follows;
create policy "follows_select_all"
on public.follows
for select
to authenticated
using (true);

drop policy if exists "follows_insert_self" on public.follows;
create policy "follows_insert_self"
on public.follows
for insert
to authenticated
with check (current_setting('app.current_user_id', true)::uuid = follower_id);

drop policy if exists "follows_delete_self" on public.follows;
create policy "follows_delete_self"
on public.follows
for delete
to authenticated
using (current_setting('app.current_user_id', true)::uuid = follower_id or public.is_staff(current_setting('app.current_user_id', true)::uuid));

drop policy if exists "copy_settings_select_own" on public.copy_settings;
create policy "copy_settings_select_own"
on public.copy_settings
for select
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id);

drop policy if exists "copy_settings_insert_own" on public.copy_settings;
create policy "copy_settings_insert_own"
on public.copy_settings
for insert
to authenticated
with check (current_setting('app.current_user_id', true)::uuid = user_id);

drop policy if exists "copy_settings_update_own" on public.copy_settings;
create policy "copy_settings_update_own"
on public.copy_settings
for update
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id)
with check (current_setting('app.current_user_id', true)::uuid = user_id);

drop policy if exists "copy_settings_delete_own" on public.copy_settings;
create policy "copy_settings_delete_own"
on public.copy_settings
for delete
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id);

drop policy if exists "social_feed_select_own" on public.social_feed;
create policy "social_feed_select_own"
on public.social_feed
for select
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id);

drop policy if exists "social_feed_update_own" on public.social_feed;
create policy "social_feed_update_own"
on public.social_feed
for update
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id)
with check (current_setting('app.current_user_id', true)::uuid = user_id);

;

grant execute on function public.follow_trader(uuid) to authenticated;
grant execute on function public.unfollow_trader(uuid) to authenticated;
grant execute on function public.upsert_copy_setting(uuid, boolean, text, numeric, numeric, numeric, numeric, text) to authenticated;
grant execute on function public.delete_copy_setting(uuid) to authenticated;
grant execute on function public.execute_manual_copy_trade(uuid, uuid) to authenticated;
grant execute on function public.process_social_trade_open(uuid) to authenticated;
grant execute on function public.process_social_trade_close(uuid) to authenticated;

-- ===== MIGRATION: 20260325000000_admin_manage_announcements.sql =====
create or replace function public.admin_update_announcement(
  p_announcement_id uuid,
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
  v_existing public.announcements%rowtype;
  v_status text;
begin
  if not public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role) then
    raise exception 'Only admins can update announcements';
  end if;

  if trim(coalesce(p_title, '')) = '' then
    raise exception 'Title is required';
  end if;

  if trim(coalesce(p_message, '')) = '' then
    raise exception 'Message is required';
  end if;

  select *
  into v_existing
  from public.announcements
  where id = p_announcement_id
  for update;

  if not found then
    raise exception 'Announcement not found';
  end if;

  if v_existing.status = 'sent' then
    v_status := 'sent';
  elsif p_scheduled_at is not null and p_scheduled_at > now() then
    v_status := 'scheduled';
  else
    v_status := 'sent';
  end if;

  update public.announcements
  set
    title = trim(p_title),
    message = trim(p_message),
    link_url = nullif(trim(coalesce(p_link_url, '')), ''),
    target_roles = coalesce(p_target_roles, '{"all": true}'::jsonb),
    scheduled_at = p_scheduled_at,
    expires_at = p_expires_at,
    status = v_status,
    sent_at = case
      when v_existing.status = 'sent' then coalesce(v_existing.sent_at, now())
      when v_status = 'sent' then now()
      else null
    end
  where id = p_announcement_id;

  if v_existing.status = 'sent' then
    update public.notifications
    set
      title = trim(p_title),
      message = trim(p_message),
      link_url = nullif(trim(coalesce(p_link_url, '')), ''),
      expires_at = p_expires_at,
      data = jsonb_build_object(
        'announcement_id', p_announcement_id,
        'target', coalesce(p_target_roles, '{"all": true}'::jsonb)
      )
    where external_key = concat('announcement:', p_announcement_id::text);
  elsif v_status = 'sent' then
    perform public.dispatch_announcement_internal(p_announcement_id);
  end if;

  return p_announcement_id;
end;
$$;

create or replace function public.admin_delete_announcement(
  p_announcement_id uuid,
  p_delete_dispatched_notifications boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_notifications integer := 0;
begin
  if not public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role) then
    raise exception 'Only admins can delete announcements';
  end if;

  if not exists (
    select 1
    from public.announcements
    where id = p_announcement_id
  ) then
    raise exception 'Announcement not found';
  end if;

  if coalesce(p_delete_dispatched_notifications, true) then
    delete from public.notifications
    where external_key = concat('announcement:', p_announcement_id::text);
    get diagnostics v_deleted_notifications = row_count;
  end if;

  delete from public.announcements
  where id = p_announcement_id;

  return jsonb_build_object(
    'announcement_id', p_announcement_id,
    'deleted_notifications', v_deleted_notifications
  );
end;
$$;

grant execute on function public.admin_update_announcement(
  uuid,
  text,
  text,
  jsonb,
  text,
  timestamp with time zone,
  timestamp with time zone
) to authenticated;

grant execute on function public.admin_delete_announcement(uuid, boolean) to authenticated;

-- ===== MIGRATION: 20260325000001_enforce_bonus_turnover_on_withdrawal.sql =====
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  destination text not null,
  method text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  processed_by uuid references public.profiles(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.request_withdrawal(
  p_amount numeric,
  p_method text,
  p_destination text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus_total numeric := 0;
  v_pending_exists boolean := false;
  v_profile public.profiles%rowtype;
  v_request public.withdrawal_requests%rowtype;
  v_require_kyc boolean := true;
  v_required_turnover numeric := 0;
  v_turnover_done numeric := 0;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Withdrawal amount must be positive';
  end if;

  if p_amount < 10 then
    raise exception 'Minimum withdrawal is $10';
  end if;

  if trim(coalesce(p_method, '')) = '' then
    raise exception 'Withdrawal method is required';
  end if;

  if trim(coalesce(p_destination, '')) = '' then
    raise exception 'Withdrawal destination is required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = current_setting('app.current_user_id', true)::uuid
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if coalesce(v_profile.balance, 0) < p_amount then
    raise exception 'Insufficient balance';
  end if;

  select ps.require_kyc_withdrawal
  into v_require_kyc
  from public.platform_settings ps
  order by ps.updated_at desc
  limit 1;

  if coalesce(v_require_kyc, true) and lower(coalesce(v_profile.kyc_status, '')) not in ('verified', 'approved') then
    raise exception 'Account verification is required before withdrawal';
  end if;

  select exists(
    select 1
    from public.withdrawal_requests wr
    where wr.user_id = current_setting('app.current_user_id', true)::uuid
      and wr.status = 'pending'
  )
  into v_pending_exists;

  if v_pending_exists then
    raise exception 'You already have a pending withdrawal request';
  end if;

  select coalesce(sum(coalesce(dr.welcome_bonus, 0) + coalesce(dr.deposit_bonus, 0) + coalesce(dr.promo_bonus, 0)), 0)
  into v_bonus_total
  from public.deposit_requests dr
  where dr.user_id = current_setting('app.current_user_id', true)::uuid
    and dr.status = 'approved';

  if v_bonus_total > 0 then
    v_required_turnover := round(v_bonus_total * 30, 2);

    select coalesce(sum(t.amount), 0)
    into v_turnover_done
    from public.trades t
    where t.user_id = current_setting('app.current_user_id', true)::uuid
      and t.status in ('won', 'lost', 'expired')
      and t.tournament_participant_id is null;

    if v_turnover_done < v_required_turnover then
      raise exception 'Bonus turnover requirement not met. Required volume: $%, completed: $%.',
        trim(to_char(v_required_turnover, 'FM999999990.00')),
        trim(to_char(v_turnover_done, 'FM999999990.00'));
    end if;
  end if;

  update public.profiles
  set
    balance = balance - p_amount,
    updated_at = now()
  where id = current_setting('app.current_user_id', true)::uuid;

  insert into public.withdrawal_requests (
    amount,
    destination,
    method,
    user_id
  )
  values (
    p_amount,
    trim(p_destination),
    trim(p_method),
    current_setting('app.current_user_id', true)::uuid
  )
  returning *
  into v_request;

  return jsonb_build_object(
    'amount', v_request.amount,
    'destination', v_request.destination,
    'method', v_request.method,
    'request_id', v_request.id,
    'status', v_request.status
  );
end;
$$;

grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;

-- ===== MIGRATION: 20260325000002_expand_notifications_type_check.sql =====
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
      'deposit_approved',
      'crypto_deposit_confirmed',
      'social_follow',
      'social_trade',
      'copy_trade',
      'trade_copied'
    )
  );

-- ===== MIGRATION: 20260328000000_advanced_notification_system.sql =====
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
      'trade_copied'
    )
  );

create table if not exists public.notification_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  recipient_email text not null,
  notification_type text not null,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'skipped')),
  retry_count integer not null default 0,
  provider_message_id text,
  last_error text,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dedupe_key)
);

create index if not exists notification_email_deliveries_status_idx
  on public.notification_email_deliveries(status, next_attempt_at, created_at);

create index if not exists notification_email_deliveries_user_idx
  on public.notification_email_deliveries(user_id, created_at desc);

alter table public.notification_email_deliveries enable row level security;

drop policy if exists "Admins can view notification email deliveries" on public.notification_email_deliveries;
create policy "Admins can view notification email deliveries"
on public.notification_email_deliveries
for select
to authenticated
using (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
);

create table if not exists public.tournament_payouts (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  participant_id uuid not null references public.tournament_participants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  placement integer not null check (placement between 1 and 3),
  amount numeric not null check (amount >= 0),
  awarded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create index if not exists tournament_payouts_tournament_idx
  on public.tournament_payouts(tournament_id, created_at desc);

alter table public.tournament_payouts enable row level security;

drop policy if exists "Users can view own tournament payouts" on public.tournament_payouts;
create policy "Users can view own tournament payouts"
on public.tournament_payouts
for select
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id);

drop policy if exists "Admins can view tournament payouts" on public.tournament_payouts;
create policy "Admins can view tournament payouts"
on public.tournament_payouts
for select
to authenticated
using (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'moderator'::public.app_role)
);

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  destination text not null,
  method text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  processed_by uuid references public.profiles(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.withdrawal_requests
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists amount numeric,
  add column if not exists destination text,
  add column if not exists method text,
  add column if not exists status text not null default 'pending',
  add column if not exists admin_note text,
  add column if not exists processed_by uuid references public.profiles(id) on delete set null,
  add column if not exists processed_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'withdrawal_requests_amount_check'
  ) then
    alter table public.withdrawal_requests
      add constraint withdrawal_requests_amount_check check (amount > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'withdrawal_requests_status_check'
  ) then
    alter table public.withdrawal_requests
      add constraint withdrawal_requests_status_check check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

create index if not exists withdrawal_requests_user_status_idx
  on public.withdrawal_requests(user_id, status, created_at desc);

create index if not exists withdrawal_requests_status_created_idx
  on public.withdrawal_requests(status, created_at desc);

alter table public.withdrawal_requests enable row level security;

drop policy if exists "Users can view own withdrawal requests" on public.withdrawal_requests;
drop policy if exists "Users can insert own withdrawal requests" on public.withdrawal_requests;
drop policy if exists "Finance admins can view withdrawal requests" on public.withdrawal_requests;
drop policy if exists "Finance admins can update withdrawal requests" on public.withdrawal_requests;

create policy "Users can view own withdrawal requests"
on public.withdrawal_requests
for select
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id);

create policy "Users can insert own withdrawal requests"
on public.withdrawal_requests
for insert
to authenticated
with check (current_setting('app.current_user_id', true)::uuid = user_id and status = 'pending');

create policy "Finance admins can view withdrawal requests"
on public.withdrawal_requests
for select
to authenticated
using (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
);

create policy "Finance admins can update withdrawal requests"
on public.withdrawal_requests
for update
to authenticated
using (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
)
with check (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
);

drop policy if exists "Allow authenticated full access to tournaments" on public.tournaments;
drop policy if exists "Admins can manage tournaments" on public.tournaments;
create policy "Admins can manage tournaments"
on public.tournaments
for all
to authenticated
using (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'moderator'::public.app_role)
)
with check (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'moderator'::public.app_role)
);

drop policy if exists "Allow users to update own participation" on public.tournament_participants;
drop policy if exists "Users can update own tournament participation" on public.tournament_participants;
create policy "Users can update own tournament participation"
on public.tournament_participants
for update
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id)
with check (current_setting('app.current_user_id', true)::uuid = user_id);

create or replace function public.jsonb_boolean_value(
  p_source jsonb,
  p_key text,
  p_default boolean
)
returns boolean
language sql
immutable
as $$
  select case
    when jsonb_typeof(coalesce(p_source, '{}'::jsonb) -> p_key) = 'boolean'
      then (p_source ->> p_key)::boolean
    else p_default
  end;
$$;

create or replace function public.notification_email_settings_for_user(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_preferences jsonb := '{}'::jsonb;
begin
  select coalesce(u.raw_user_meta_data->'notificationPreferences', '{}'::jsonb)
  into v_preferences
  from public.users u
  where u.id = p_user_id;

  return jsonb_build_object(
    'emailDepositsWithdrawals', public.jsonb_boolean_value(v_preferences, 'emailDepositsWithdrawals', true),
    'emailTradeExecution', public.jsonb_boolean_value(v_preferences, 'emailTradeExecution', true),
    'emailPromotionsBonuses', public.jsonb_boolean_value(v_preferences, 'emailPromotionsBonuses', true),
    'emailTournaments', public.jsonb_boolean_value(v_preferences, 'emailTournaments', true),
    'emailSecurityKyc', public.jsonb_boolean_value(v_preferences, 'emailSecurityKyc', true)
  );
end;
$$;

create or replace function public.notification_email_enabled_for_type(
  p_user_id uuid,
  p_type text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_settings jsonb := public.notification_email_settings_for_user(p_user_id);
begin
  if p_type = 'announcement' then
    return public.jsonb_boolean_value(v_settings, 'emailPromotionsBonuses', true);
  end if;

  if p_type in (
    'deposit_requested',
    'deposit_approved',
    'deposit_rejected',
    'crypto_deposit_confirmed',
    'withdrawal_requested',
    'withdrawal_approved',
    'withdrawal_rejected'
  ) then
    return public.jsonb_boolean_value(v_settings, 'emailDepositsWithdrawals', true);
  end if;

  if p_type = 'trade_result' then
    return public.jsonb_boolean_value(v_settings, 'emailTradeExecution', true);
  end if;

  if p_type in (
    'welcome_bonus',
    'deposit_bonus',
    'referral_commission',
    'promo_code_activated'
  ) then
    return public.jsonb_boolean_value(v_settings, 'emailPromotionsBonuses', true);
  end if;

  if p_type in (
    'tournament_joined',
    'tournament_started',
    'tournament_ended',
    'tournament_prize',
    'tournament_cancelled'
  ) then
    return public.jsonb_boolean_value(v_settings, 'emailTournaments', true);
  end if;

  if p_type in ('kyc_approved', 'kyc_rejected') then
    return public.jsonb_boolean_value(v_settings, 'emailSecurityKyc', true);
  end if;

  return false;
end;
$$;

create or replace function public.queue_notification_email_internal(
  p_notification_id uuid,
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link_url text default null,
  p_data jsonb default '{}'::jsonb,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery_id uuid;
  v_dedupe_key text;
  v_payload jsonb;
  v_recipient_email text;
begin
  select nullif(trim(u.email), '')
  into v_recipient_email
  from public.users u
  where u.id = p_user_id;

  if v_recipient_email is null then
    return null;
  end if;

  if not public.notification_email_enabled_for_type(p_user_id, p_type) then
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

  perform public.queue_notification_email_internal(
    v_notification.id,
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_link_url,
    coalesce(p_data, '{}'::jsonb),
    v_email_dedupe_key
  );

  return v_notification.id;
end;
$$;

create or replace function public.request_deposit_review(
  p_amount numeric,
  p_method text,
  p_promo_id uuid default null,
  p_payment_method_id uuid default null,
  p_tx_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_promo public.promo_codes%rowtype;
  v_numeric_value numeric := 0;
  v_promo_bonus numeric := 0;
  v_request public.deposit_requests%rowtype;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Deposit amount must be positive';
  end if;

  if coalesce(trim(p_method), '') = '' then
    raise exception 'Deposit method is required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = current_setting('app.current_user_id', true)::uuid;

  if not found then
    raise exception 'Profile not found';
  end if;

  if p_payment_method_id is not null then
    perform 1
    from public.crypto_payment_methods
    where id = p_payment_method_id
      and status = 'active';

    if not found then
      raise exception 'Selected crypto deposit method is not active';
    end if;
  end if;

  if p_promo_id is not null then
    select *
    into v_promo
    from public.promo_codes
    where id = p_promo_id;

    if not found then
      raise exception 'Promo code not found';
    end if;

    if v_promo.status <> 'active' then
      raise exception 'Promo code is not active';
    end if;

    if v_promo.expiry_date <= now() then
      raise exception 'Promo code has expired';
    end if;

    if v_promo.max_usages > 0 and coalesce(v_promo.usages, 0) >= v_promo.max_usages then
      raise exception 'Promo code usage limit reached';
    end if;

    v_numeric_value := coalesce(
      nullif(regexp_replace(v_promo.reward_value, '[^0-9.]', '', 'g'), ''),
      '0'
    )::numeric;

    if v_promo.type = 'Percentage' then
      v_promo_bonus := p_amount * (v_numeric_value / 100.0);
    elsif v_promo.type = 'Fixed Bonus' then
      v_promo_bonus := v_numeric_value;
    else
      raise exception 'Unsupported promo code type: %', v_promo.type;
    end if;
  end if;

  insert into public.deposit_requests (
    amount,
    method,
    payment_method_id,
    promo_bonus,
    promo_id,
    tx_hash,
    user_id
  )
  values (
    p_amount,
    trim(p_method),
    p_payment_method_id,
    v_promo_bonus,
    p_promo_id,
    nullif(trim(coalesce(p_tx_hash, '')), ''),
    current_setting('app.current_user_id', true)::uuid
  )
  returning *
  into v_request;

  perform public.create_notification_internal(
    current_setting('app.current_user_id', true)::uuid,
    'deposit_requested',
    'Deposit request received',
    format(
      'Your %s deposit request for $%s was received and is now pending review.',
      trim(p_method),
      trim(to_char(p_amount, 'FM999999990.00'))
    ),
    '/deposit',
    jsonb_build_object(
      'amount', p_amount,
      'deposit_request_id', v_request.id,
      'method', trim(p_method),
      'promo_bonus', v_promo_bonus
    ),
    concat('deposit_request:', v_request.id::text, ':requested'),
    null
  );

  if p_promo_id is not null and v_promo_bonus > 0 then
    perform public.create_notification_internal(
      current_setting('app.current_user_id', true)::uuid,
      'promo_code_activated',
      'Promo code activated',
      format(
        'Promo code %s was attached to your deposit request. If the deposit is approved, a $%s bonus will be credited automatically.',
        coalesce(v_promo.code, 'promotion'),
        trim(to_char(v_promo_bonus, 'FM999999990.00'))
      ),
      '/deposit',
      jsonb_build_object(
        'amount', v_promo_bonus,
        'code', v_promo.code,
        'deposit_request_id', v_request.id,
        'promo_id', p_promo_id
      ),
      concat('promo_code_activated:', v_request.id::text),
      null
    );
  end if;

  return jsonb_build_object(
    'amount', v_request.amount,
    'method', v_request.method,
    'promo_bonus', v_request.promo_bonus,
    'request_id', v_request.id,
    'status', v_request.status
  );
end;
$$;

create or replace function public.admin_update_deposit_status(
  p_request_id uuid,
  p_status text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.deposit_requests%rowtype;
  v_next_status text;
  v_credit_payload jsonb := '{}'::jsonb;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if not (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
  ) then
    raise exception 'Only finance managers or super admins can update deposit requests';
  end if;

  v_next_status := lower(trim(coalesce(p_status, '')));

  if v_next_status not in ('approved', 'rejected') then
    raise exception 'Deposit status must be approved or rejected';
  end if;

  select *
  into v_request
  from public.deposit_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Deposit request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending deposit requests can be processed';
  end if;

  if v_next_status = 'approved' then
    v_credit_payload := public.credit_deposit_internal(
      v_request.user_id,
      v_request.amount,
      coalesce(v_request.promo_bonus, 0),
      v_request.method
    );

    if v_request.promo_id is not null then
      update public.promo_codes
      set
        usages = coalesce(usages, 0) + 1,
        status = case
          when max_usages > 0 and coalesce(usages, 0) + 1 >= max_usages then 'expired'
          when expiry_date <= now() then 'expired'
          else status
        end
      where id = v_request.promo_id;
    end if;

    update public.deposit_requests
    set
      admin_note = p_admin_note,
      credited_amount = nullif(v_credit_payload->>'credited_amount', '')::numeric,
      deposit_bonus = coalesce(nullif(v_credit_payload->>'deposit_bonus', '')::numeric, 0),
      processed_at = now(),
      processed_by = current_setting('app.current_user_id', true)::uuid,
      promo_bonus = coalesce(nullif(v_credit_payload->>'promo_bonus', '')::numeric, promo_bonus),
      referral_commission = coalesce(nullif(v_credit_payload->>'referral_commission', '')::numeric, 0),
      status = v_next_status,
      updated_at = now(),
      welcome_bonus = coalesce(nullif(v_credit_payload->>'welcome_bonus', '')::numeric, 0)
    where id = v_request.id;

    perform public.create_notification_internal(
      v_request.user_id,
      'deposit_approved',
      'Deposit approved',
      format(
        'Your %s deposit of $%s has been approved and credited.',
        coalesce(v_request.method, 'deposit'),
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/deposit',
      jsonb_build_object(
        'amount', v_request.amount,
        'deposit_request_id', v_request.id,
        'credited_amount', nullif(v_credit_payload->>'credited_amount', '')::numeric,
        'method', v_request.method
      ),
      concat('deposit_request:', v_request.id::text, ':approved'),
      null
    );
  else
    update public.deposit_requests
    set
      admin_note = p_admin_note,
      processed_at = now(),
      processed_by = current_setting('app.current_user_id', true)::uuid,
      status = v_next_status,
      updated_at = now()
    where id = v_request.id;

    perform public.create_notification_internal(
      v_request.user_id,
      'deposit_rejected',
      'Deposit rejected',
      format(
        'Your %s deposit request for $%s was rejected. Contact support if you need help.',
        coalesce(v_request.method, 'deposit'),
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/deposit',
      jsonb_build_object(
        'amount', v_request.amount,
        'admin_note', p_admin_note,
        'deposit_request_id', v_request.id,
        'method', v_request.method
      ),
      concat('deposit_request:', v_request.id::text, ':rejected'),
      null
    );
  end if;

  return jsonb_build_object(
    'credited_amount', coalesce(v_credit_payload->>'credited_amount', null),
    'request_id', v_request.id,
    'status', v_next_status
  );
end;
$$;

create or replace function public.request_withdrawal(
  p_amount numeric,
  p_method text,
  p_destination text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus_total numeric := 0;
  v_pending_exists boolean := false;
  v_profile public.profiles%rowtype;
  v_request public.withdrawal_requests%rowtype;
  v_require_kyc boolean := true;
  v_required_turnover numeric := 0;
  v_turnover_done numeric := 0;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Withdrawal amount must be positive';
  end if;

  if p_amount < 10 then
    raise exception 'Minimum withdrawal is $10';
  end if;

  if trim(coalesce(p_method, '')) = '' then
    raise exception 'Withdrawal method is required';
  end if;

  if trim(coalesce(p_destination, '')) = '' then
    raise exception 'Withdrawal destination is required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = current_setting('app.current_user_id', true)::uuid
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if coalesce(v_profile.balance, 0) < p_amount then
    raise exception 'Insufficient balance';
  end if;

  select ps.require_kyc_withdrawal
  into v_require_kyc
  from public.platform_settings ps
  order by ps.updated_at desc
  limit 1;

  if coalesce(v_require_kyc, true) and lower(coalesce(v_profile.kyc_status, '')) not in ('verified', 'approved') then
    raise exception 'Account verification is required before withdrawal';
  end if;

  select exists(
    select 1
    from public.withdrawal_requests wr
    where wr.user_id = current_setting('app.current_user_id', true)::uuid
      and wr.status = 'pending'
  )
  into v_pending_exists;

  if v_pending_exists then
    raise exception 'You already have a pending withdrawal request';
  end if;

  select coalesce(sum(coalesce(dr.welcome_bonus, 0) + coalesce(dr.deposit_bonus, 0) + coalesce(dr.promo_bonus, 0)), 0)
  into v_bonus_total
  from public.deposit_requests dr
  where dr.user_id = current_setting('app.current_user_id', true)::uuid
    and dr.status = 'approved';

  if v_bonus_total > 0 then
    v_required_turnover := round(v_bonus_total * 30, 2);

    select coalesce(sum(t.amount), 0)
    into v_turnover_done
    from public.trades t
    where t.user_id = current_setting('app.current_user_id', true)::uuid
      and t.status in ('won', 'lost', 'expired')
      and t.tournament_participant_id is null;

    if v_turnover_done < v_required_turnover then
      raise exception 'Bonus turnover requirement not met. Required volume: $%, completed: $%.',
        trim(to_char(v_required_turnover, 'FM999999990.00')),
        trim(to_char(v_turnover_done, 'FM999999990.00'));
    end if;
  end if;

  update public.profiles
  set
    balance = balance - p_amount,
    updated_at = now()
  where id = current_setting('app.current_user_id', true)::uuid;

  insert into public.withdrawal_requests (
    amount,
    destination,
    method,
    user_id
  )
  values (
    p_amount,
    trim(p_destination),
    trim(p_method),
    current_setting('app.current_user_id', true)::uuid
  )
  returning *
  into v_request;

  perform public.create_notification_internal(
    current_setting('app.current_user_id', true)::uuid,
    'withdrawal_requested',
    'Withdrawal request received',
    format(
      'Your withdrawal request for $%s was submitted and is now pending review.',
      trim(to_char(p_amount, 'FM999999990.00'))
    ),
    '/withdraw',
    jsonb_build_object(
      'amount', p_amount,
      'destination', trim(p_destination),
      'method', trim(p_method),
      'withdrawal_request_id', v_request.id
    ),
    concat('withdrawal_request:', v_request.id::text, ':requested'),
    null
  );

  return jsonb_build_object(
    'amount', v_request.amount,
    'destination', v_request.destination,
    'method', v_request.method,
    'request_id', v_request.id,
    'status', v_request.status
  );
end;
$$;

create or replace function public.admin_update_withdrawal_status(
  p_request_id uuid,
  p_status text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.withdrawal_requests%rowtype;
  v_next_status text;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if not (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
  ) then
    raise exception 'Only finance managers or super admins can update withdrawal requests';
  end if;

  v_next_status := lower(trim(coalesce(p_status, '')));

  if v_next_status not in ('approved', 'rejected') then
    raise exception 'Withdrawal status must be approved or rejected';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending withdrawal requests can be processed';
  end if;

  update public.withdrawal_requests
  set
    admin_note = p_admin_note,
    processed_at = now(),
    processed_by = current_setting('app.current_user_id', true)::uuid,
    status = v_next_status,
    updated_at = now()
  where id = v_request.id;

  if v_next_status = 'rejected' then
    update public.profiles
    set
      balance = balance + v_request.amount,
      updated_at = now()
    where id = v_request.user_id;

    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_rejected',
      'Withdrawal rejected',
      format(
        'Your withdrawal of $%s was rejected and the funds were returned to your balance.',
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/withdraw',
      jsonb_build_object(
        'admin_note', p_admin_note,
        'amount', v_request.amount,
        'method', v_request.method,
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':rejected'),
      null
    );
  else
    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_approved',
      'Withdrawal approved',
      format(
        'Your withdrawal of $%s has been approved and is being processed.',
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/withdraw',
      jsonb_build_object(
        'amount', v_request.amount,
        'method', v_request.method,
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':approved'),
      null
    );
  end if;

  return jsonb_build_object(
    'amount', v_request.amount,
    'request_id', v_request.id,
    'status', v_next_status
  );
end;
$$;

create or replace function public.join_tournament(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_tournament public.tournaments%rowtype;
  v_existing_participant public.tournament_participants%rowtype;
  v_participant public.tournament_participants%rowtype;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;

  if not found then
    raise exception 'Tournament not found';
  end if;

  if v_tournament.status in ('completed', 'cancelled') then
    raise exception 'This tournament is no longer accepting new participants';
  end if;

  select *
  into v_existing_participant
  from public.tournament_participants
  where tournament_id = p_tournament_id
    and user_id = current_setting('app.current_user_id', true)::uuid
  limit 1;

  if found then
    return jsonb_build_object(
      'already_joined', true,
      'current_balance', v_existing_participant.current_balance,
      'participant_id', v_existing_participant.id,
      'tournament_id', p_tournament_id
    );
  end if;

  select *
  into v_profile
  from public.profiles
  where id = current_setting('app.current_user_id', true)::uuid
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if coalesce(v_tournament.entry_fee, 0) > 0 and coalesce(v_profile.balance, 0) < coalesce(v_tournament.entry_fee, 0) then
    raise exception 'Insufficient balance to join this tournament';
  end if;

  if coalesce(v_tournament.entry_fee, 0) > 0 then
    update public.profiles
    set
      balance = balance - v_tournament.entry_fee,
      updated_at = now()
    where id = current_setting('app.current_user_id', true)::uuid;
  end if;

  insert into public.tournament_participants (
    tournament_id,
    user_id,
    current_balance
  )
  values (
    p_tournament_id,
    current_setting('app.current_user_id', true)::uuid,
    coalesce(v_tournament.starting_balance, 0)
  )
  returning *
  into v_participant;

  perform public.create_notification_internal(
    current_setting('app.current_user_id', true)::uuid,
    'tournament_joined',
    'Tournament joined',
    format(
      'You joined %s. Your tournament balance is $%s.',
      v_tournament.title,
      trim(to_char(v_participant.current_balance, 'FM999999990.00'))
    ),
    '/trade',
    jsonb_build_object(
      'entry_fee', v_tournament.entry_fee,
      'starting_balance', v_participant.current_balance,
      'tournament_id', v_tournament.id,
      'tournament_title', v_tournament.title
    ),
    concat('tournament_joined:', v_tournament.id::text, ':', current_setting('app.current_user_id', true)::uuid::text),
    null
  );

  return jsonb_build_object(
    'already_joined', false,
    'current_balance', v_participant.current_balance,
    'participant_id', v_participant.id,
    'tournament_id', p_tournament_id
  );
end;
$$;

create or replace function public.notify_tournament_participants_internal(
  p_tournament_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link_url text default '/trade',
  p_data jsonb default '{}'::jsonb,
  p_external_key_prefix text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant record;
  v_count integer := 0;
begin
  for v_participant in
    select tp.user_id
    from public.tournament_participants tp
    where tp.tournament_id = p_tournament_id
  loop
    perform public.create_notification_internal(
      v_participant.user_id,
      p_type,
      p_title,
      p_message,
      p_link_url,
      coalesce(p_data, '{}'::jsonb) || jsonb_build_object('tournament_id', p_tournament_id),
      case
        when p_external_key_prefix is null then null
        else concat(p_external_key_prefix, ':', v_participant.user_id::text)
      end,
      null
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.award_tournament_prizes_internal(p_tournament_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_share numeric;
  v_awarded integer := 0;
  v_ranked record;
  v_inserted_payout_id uuid;
begin
  select *
  into v_tournament
  from public.tournaments
  where id = p_tournament_id;

  if not found or coalesce(v_tournament.prize_pool, 0) <= 0 then
    return 0;
  end if;

  for v_ranked in
    with ranked as (
      select
        tp.id as participant_id,
        tp.user_id,
        tp.current_balance,
        row_number() over (
          order by tp.current_balance desc, tp.updated_at asc, tp.created_at asc
        ) as placement
      from public.tournament_participants tp
      where tp.tournament_id = p_tournament_id
    )
    select *
    from ranked
    where placement <= 3
    order by placement asc
  loop
    v_share := case v_ranked.placement
      when 1 then 0.50
      when 2 then 0.30
      when 3 then 0.20
      else 0
    end;

    if v_share <= 0 then
      continue;
    end if;

    insert into public.tournament_payouts (
      tournament_id,
      participant_id,
      user_id,
      placement,
      amount
    )
    values (
      p_tournament_id,
      v_ranked.participant_id,
      v_ranked.user_id,
      v_ranked.placement,
      round(v_tournament.prize_pool * v_share, 2)
    )
    on conflict (tournament_id, user_id)
    do nothing
    returning id into v_inserted_payout_id;

    if v_inserted_payout_id is null then
      continue;
    end if;

    update public.profiles
    set
      balance = balance + round(v_tournament.prize_pool * v_share, 2),
      updated_at = now()
    where id = v_ranked.user_id;

    perform public.create_notification_internal(
      v_ranked.user_id,
      'tournament_prize',
      'Tournament prize awarded',
      format(
        'You finished #%s in %s and won $%s.',
        v_ranked.placement,
        v_tournament.title,
        trim(to_char(round(v_tournament.prize_pool * v_share, 2), 'FM999999990.00'))
      ),
      '/trade',
      jsonb_build_object(
        'amount', round(v_tournament.prize_pool * v_share, 2),
        'placement', v_ranked.placement,
        'tournament_id', v_tournament.id,
        'tournament_title', v_tournament.title
      ),
      concat('tournament_prize:', v_tournament.id::text, ':', v_ranked.user_id::text),
      null
    );

    v_awarded := v_awarded + 1;
    v_inserted_payout_id := null;
  end loop;

  return v_awarded;
end;
$$;

create or replace function public.admin_update_tournament_status(
  p_tournament_id uuid,
  p_status public.tournament_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_notified integer := 0;
  v_awarded integer := 0;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if not (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    or public.has_role(current_setting('app.current_user_id', true)::uuid, 'moderator'::public.app_role)
  ) then
    raise exception 'Only admins or moderators can update tournaments';
  end if;

  select *
  into v_tournament
  from public.tournaments
  where id = p_tournament_id
  for update;

  if not found then
    raise exception 'Tournament not found';
  end if;

  update public.tournaments
  set
    status = p_status,
    updated_at = now()
  where id = p_tournament_id;

  if p_status = 'active' then
    v_notified := public.notify_tournament_participants_internal(
      p_tournament_id,
      'tournament_started',
      'Tournament started',
      format('%s is now live. Open your tournament desk and start competing.', v_tournament.title),
      '/trade',
      jsonb_build_object(
        'tournament_id', v_tournament.id,
        'tournament_title', v_tournament.title,
        'prize_pool', v_tournament.prize_pool,
        'start_date', v_tournament.start_date
      ),
      concat('tournament_started:', v_tournament.id::text)
    );
  elsif p_status = 'completed' then
    v_notified := public.notify_tournament_participants_internal(
      p_tournament_id,
      'tournament_ended',
      'Tournament ended',
      format('%s has ended. Final standings are now available.', v_tournament.title),
      '/notifications',
      jsonb_build_object(
        'tournament_id', v_tournament.id,
        'tournament_title', v_tournament.title,
        'end_date', v_tournament.end_date
      ),
      concat('tournament_ended:', v_tournament.id::text)
    );

    v_awarded := public.award_tournament_prizes_internal(p_tournament_id);
  elsif p_status = 'cancelled' then
    v_notified := public.notify_tournament_participants_internal(
      p_tournament_id,
      'tournament_cancelled',
      'Tournament cancelled',
      format('%s was cancelled. Any entry adjustments will be handled by support.', v_tournament.title),
      '/notifications',
      jsonb_build_object(
        'tournament_id', v_tournament.id,
        'tournament_title', v_tournament.title
      ),
      concat('tournament_cancelled:', v_tournament.id::text)
    );
  end if;

  return jsonb_build_object(
    'awarded_prizes', v_awarded,
    'notified_participants', v_notified,
    'status', p_status,
    'tournament_id', p_tournament_id
  );
end;
$$;

create or replace function public.notify_trade_result(p_trade_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade public.trades%rowtype;
  v_title text;
  v_message text;
  v_notification_id uuid;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_trade
  from public.trades
  where id = p_trade_id
    and user_id = current_setting('app.current_user_id', true)::uuid;

  if not found then
    raise exception 'Trade not found';
  end if;

  if v_trade.status = 'open' or v_trade.closed_at is null then
    raise exception 'Trade is still open';
  end if;

  v_title := case
    when v_trade.status = 'won' then 'Trade won'
    when v_trade.status = 'lost' then 'Trade lost'
    else 'Trade closed'
  end;

  v_message := case
    when v_trade.status = 'won' then format(
      'Your %s position on %s closed in profit for $%s.',
      upper(coalesce(v_trade.direction, 'trade')),
      v_trade.asset_symbol,
      trim(to_char(coalesce(v_trade.profit, 0), 'FM999999990.00'))
    )
    else format(
      'Your %s position on %s closed with a result of $%s.',
      upper(coalesce(v_trade.direction, 'trade')),
      v_trade.asset_symbol,
      trim(to_char(coalesce(v_trade.profit, 0), 'FM999999990.00'))
    )
  end;

  v_notification_id := public.create_notification_internal(
    v_trade.user_id,
    'trade_result',
    v_title,
    v_message,
    '/trade',
    jsonb_build_object(
      'amount', v_trade.amount,
      'asset_symbol', v_trade.asset_symbol,
      'direction', v_trade.direction,
      'profit', v_trade.profit,
      'status', v_trade.status,
      'trade_id', v_trade.id,
      'tournament_trade', v_trade.tournament_participant_id is not null
    ),
    concat('trade_result:', v_trade.id::text),
    null
  );

  return v_notification_id;
end;
$$;

create or replace function public.handle_profile_notification_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.kyc_status, '') is distinct from coalesce(old.kyc_status, '') then
    if lower(coalesce(new.kyc_status, '')) in ('verified', 'approved') then
      perform public.create_notification_internal(
        new.id,
        'kyc_approved',
        'KYC approved',
        'Your identity verification has been approved. You can continue with full account access.',
        '/trade',
        jsonb_build_object('kyc_status', new.kyc_status),
        concat('kyc_status:', new.id::text, ':approved'),
        null
      );
    elsif lower(coalesce(new.kyc_status, '')) = 'rejected' then
      perform public.create_notification_internal(
        new.id,
        'kyc_rejected',
        'KYC rejected',
        'Your verification was rejected. Review your submitted details and upload updated documents.',
        '/trade',
        jsonb_build_object('kyc_status', new.kyc_status),
        concat('kyc_status:', new.id::text, ':rejected'),
        null
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profile_notification_events on public.profiles;
create trigger profile_notification_events
after update of kyc_status on public.profiles
for each row
execute function public.handle_profile_notification_events();

grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;
grant execute on function public.admin_update_withdrawal_status(uuid, text, text) to authenticated;
grant execute on function public.join_tournament(uuid) to authenticated;
grant execute on function public.admin_update_tournament_status(uuid, public.tournament_status) to authenticated;
grant execute on function public.notify_trade_result(uuid) to authenticated;

;

-- ===== MIGRATION: 20260328000001_backfill_admin_announcement_rpcs.sql =====
create or replace function public.admin_update_announcement(
  p_announcement_id uuid,
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
  v_existing public.announcements%rowtype;
  v_status text;
begin
  if not public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role) then
    raise exception 'Only admins can update announcements';
  end if;

  if trim(coalesce(p_title, '')) = '' then
    raise exception 'Title is required';
  end if;

  if trim(coalesce(p_message, '')) = '' then
    raise exception 'Message is required';
  end if;

  select *
  into v_existing
  from public.announcements
  where id = p_announcement_id
  for update;

  if not found then
    raise exception 'Announcement not found';
  end if;

  if v_existing.status = 'sent' then
    v_status := 'sent';
  elsif p_scheduled_at is not null and p_scheduled_at > now() then
    v_status := 'scheduled';
  else
    v_status := 'sent';
  end if;

  update public.announcements
  set
    title = trim(p_title),
    message = trim(p_message),
    link_url = nullif(trim(coalesce(p_link_url, '')), ''),
    target_roles = coalesce(p_target_roles, '{"all": true}'::jsonb),
    scheduled_at = p_scheduled_at,
    expires_at = p_expires_at,
    status = v_status,
    sent_at = case
      when v_existing.status = 'sent' then coalesce(v_existing.sent_at, now())
      when v_status = 'sent' then now()
      else null
    end
  where id = p_announcement_id;

  if v_existing.status = 'sent' then
    update public.notifications
    set
      title = trim(p_title),
      message = trim(p_message),
      link_url = nullif(trim(coalesce(p_link_url, '')), ''),
      expires_at = p_expires_at,
      data = jsonb_build_object(
        'announcement_id', p_announcement_id,
        'target', coalesce(p_target_roles, '{"all": true}'::jsonb)
      )
    where external_key = concat('announcement:', p_announcement_id::text);
  elsif v_status = 'sent' then
    perform public.dispatch_announcement_internal(p_announcement_id);
  end if;

  return p_announcement_id;
end;
$$;

create or replace function public.admin_delete_announcement(
  p_announcement_id uuid,
  p_delete_dispatched_notifications boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_notifications integer := 0;
begin
  if not public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role) then
    raise exception 'Only admins can delete announcements';
  end if;

  if not exists (
    select 1
    from public.announcements
    where id = p_announcement_id
  ) then
    raise exception 'Announcement not found';
  end if;

  if coalesce(p_delete_dispatched_notifications, true) then
    delete from public.notifications
    where external_key = concat('announcement:', p_announcement_id::text);
    get diagnostics v_deleted_notifications = row_count;
  end if;

  delete from public.announcements
  where id = p_announcement_id;

  return jsonb_build_object(
    'announcement_id', p_announcement_id,
    'deleted_notifications', v_deleted_notifications
  );
end;
$$;

grant execute on function public.admin_update_announcement(
  uuid,
  text,
  text,
  jsonb,
  text,
  timestamp with time zone,
  timestamp with time zone
) to authenticated;

grant execute on function public.admin_delete_announcement(uuid, boolean) to authenticated;

-- ===== MIGRATION: 20260328000002_email_verification_flow.sql =====
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
  user_id uuid not null references public.users(id) on delete cascade,
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
  from public.users u
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
  from public.users u
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
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

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

  if v_is_verified then
    return jsonb_build_object(
      'email', v_email,
      'status', 'already_verified'
    );
  end if;

  select *
  into v_recent_code
  from public.email_verification_codes
  where user_id = current_setting('app.current_user_id', true)::uuid
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
  where user_id = current_setting('app.current_user_id', true)::uuid
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
    current_setting('app.current_user_id', true)::uuid,
    v_email,
    public.email_verification_code_hash(current_setting('app.current_user_id', true)::uuid, v_email, v_code),
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
    current_setting('app.current_user_id', true)::uuid,
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
    current_setting('app.current_user_id', true)::uuid,
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
  if current_setting('app.current_user_id', true)::uuid is null then
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
  from public.users u
  where u.id = current_setting('app.current_user_id', true)::uuid;

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
  where user_id = current_setting('app.current_user_id', true)::uuid
    and email = v_email
    and consumed_at is null
    and expires_at > now()
    and code_hash = public.email_verification_code_hash(current_setting('app.current_user_id', true)::uuid, v_email, v_code_input)
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

  update public.users
  set
    confirmed_at = coalesce(confirmed_at, v_verified_at),
    email_confirmed_at = coalesce(email_confirmed_at, v_verified_at),
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'platform_email_verified_at', v_verified_at
    )
  where id = current_setting('app.current_user_id', true)::uuid;

  perform public.create_notification_internal(
    current_setting('app.current_user_id', true)::uuid,
    'email_verified',
    'Email verified',
    'Your email address is verified and ready for account alerts.',
    '/settings',
    jsonb_build_object(
      'email', v_email,
      'verified_at', v_verified_at
    ),
    concat('email_verified:', current_setting('app.current_user_id', true)::uuid::text),
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

-- ===== MIGRATION: 20260328000003_fix_email_verification_hash.sql =====
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

-- ===== MIGRATION: 20260328000004_platform_only_email_verification.sql =====
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
  from public.users u
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
  if current_setting('app.current_user_id', true)::uuid is null then
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
  from public.users u
  where u.id = current_setting('app.current_user_id', true)::uuid;

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
  where user_id = current_setting('app.current_user_id', true)::uuid
    and email = v_email
    and consumed_at is null
    and expires_at > now()
    and code_hash = public.email_verification_code_hash(current_setting('app.current_user_id', true)::uuid, v_email, v_code_input)
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

  update public.users
  set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'platform_email_verified_at', v_verified_at
    )
  where id = current_setting('app.current_user_id', true)::uuid;

  perform public.create_notification_internal(
    current_setting('app.current_user_id', true)::uuid,
    'email_verified',
    'Email verified',
    'Your email address is verified and ready for account alerts.',
    '/settings',
    jsonb_build_object(
      'email', v_email,
      'verified_at', v_verified_at
    ),
    concat('email_verified:', current_setting('app.current_user_id', true)::uuid::text),
    null
  );

  return jsonb_build_object(
    'email', v_email,
    'status', 'verified',
    'verified_at', v_verified_at
  );
end;
$$;

-- ===== MIGRATION: 20260401000000_admin_deposit_bonus_offers.sql =====
create extension if not exists pgcrypto;

create table if not exists public.deposit_bonus_offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  deposit_amount numeric not null check (deposit_amount > 0),
  bonus_percent numeric not null check (bonus_percent >= 0),
  position integer not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deposit_bonus_offers_status_position_idx
  on public.deposit_bonus_offers(status, position, deposit_amount, created_at);

alter table public.deposit_requests
  add column if not exists bonus_offer_id uuid references public.deposit_bonus_offers(id) on delete set null;

create index if not exists deposit_requests_bonus_offer_idx
  on public.deposit_requests(bonus_offer_id, created_at desc);

create table if not exists public.deposit_bonus_redemptions (
  id uuid primary key default gen_random_uuid(),
  bonus_offer_id uuid not null references public.deposit_bonus_offers(id) on delete cascade,
  deposit_request_id uuid not null references public.deposit_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  deposit_amount numeric not null check (deposit_amount > 0),
  bonus_amount numeric not null default 0 check (bonus_amount >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'credited', 'released')),
  credited_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deposit_request_id)
);

create index if not exists deposit_bonus_redemptions_user_created_idx
  on public.deposit_bonus_redemptions(user_id, created_at desc);

create index if not exists deposit_bonus_redemptions_offer_created_idx
  on public.deposit_bonus_redemptions(bonus_offer_id, created_at desc);

create unique index if not exists deposit_bonus_redemptions_active_offer_idx
  on public.deposit_bonus_redemptions(user_id, bonus_offer_id)
  where status in ('reserved', 'credited');

alter table public.deposit_bonus_offers enable row level security;
alter table public.deposit_bonus_redemptions enable row level security;

drop policy if exists "Authenticated users can view active deposit bonus offers" on public.deposit_bonus_offers;
create policy "Authenticated users can view active deposit bonus offers"
on public.deposit_bonus_offers
for select
to authenticated
using (
  status = 'active'
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
);

drop policy if exists "Admins can manage deposit bonus offers" on public.deposit_bonus_offers;
create policy "Admins can manage deposit bonus offers"
on public.deposit_bonus_offers
for all
to authenticated
using (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
)
with check (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
);

drop policy if exists "Users can view own deposit bonus redemptions" on public.deposit_bonus_redemptions;
create policy "Users can view own deposit bonus redemptions"
on public.deposit_bonus_redemptions
for select
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id);

drop policy if exists "Admins can view deposit bonus redemptions" on public.deposit_bonus_redemptions;
create policy "Admins can view deposit bonus redemptions"
on public.deposit_bonus_redemptions
for select
to authenticated
using (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
);

insert into public.deposit_bonus_offers (
  title,
  description,
  deposit_amount,
  bonus_percent,
  position,
  status
)
select *
from (
  values
    ('Starter', 'First available hosted bonus offer', 30::numeric, 10::numeric, 10, 'active'),
    ('Bronze', 'Entry crypto deposit bonus', 50::numeric, 20::numeric, 20, 'active'),
    ('Silver', 'Growth crypto deposit bonus', 100::numeric, 30::numeric, 30, 'active'),
    ('Gold', 'Priority crypto deposit bonus', 150::numeric, 40::numeric, 40, 'active'),
    ('Platinum', 'High-value crypto deposit bonus', 200::numeric, 55::numeric, 50, 'active'),
    ('VIP', 'Top-tier crypto deposit bonus', 300::numeric, 70::numeric, 60, 'active')
) as seed(title, description, deposit_amount, bonus_percent, position, status)
where not exists (
  select 1
  from public.deposit_bonus_offers
);

update public.bonus_settings
set
  deposit_bonus_enabled = false,
  deposit_bonus_max = 0,
  deposit_bonus_min = 0,
  deposit_bonus_percent = 0,
  updated_at = now()
where coalesce(deposit_bonus_enabled, false)
   or coalesce(deposit_bonus_percent, 0) <> 0
   or coalesce(deposit_bonus_min, 0) <> 0
   or coalesce(deposit_bonus_max, 0) <> 0;

create or replace function public.get_available_deposit_bonus_offers()
returns table (
  id uuid,
  title text,
  description text,
  deposit_amount numeric,
  bonus_percent numeric,
  bonus_amount numeric,
  "position" integer,
  status text,
  is_new_user boolean,
  eligible boolean,
  already_used boolean,
  monthly_locked boolean,
  active_reservation boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_is_new_user boolean := false;
  v_monthly_locked boolean := false;
  v_active_reservation boolean := false;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = current_setting('app.current_user_id', true)::uuid;

  if not found then
    raise exception 'Profile not found';
  end if;

  v_is_new_user := coalesce(v_profile.total_deposit, 0) <= 0;

  select exists (
    select 1
    from public.deposit_bonus_redemptions r
    where r.user_id = current_setting('app.current_user_id', true)::uuid
      and r.status = 'reserved'
  )
  into v_active_reservation;

  if not v_is_new_user then
    select exists (
      select 1
      from public.deposit_bonus_redemptions r
      where r.user_id = current_setting('app.current_user_id', true)::uuid
        and r.status in ('reserved', 'credited')
        and r.created_at >= date_trunc('month', now())
    )
    into v_monthly_locked;
  end if;

  return query
  with offer_usage as (
    select
      o.id as offer_id,
      exists (
        select 1
        from public.deposit_bonus_redemptions r
        where r.user_id = current_setting('app.current_user_id', true)::uuid
          and r.bonus_offer_id = o.id
          and r.status in ('reserved', 'credited')
      ) as already_used
    from public.deposit_bonus_offers o
    where o.status = 'active'
  )
  select
    o.id,
    o.title,
    o.description,
    o.deposit_amount,
    o.bonus_percent,
    round(o.deposit_amount * (o.bonus_percent / 100.0), 2) as bonus_amount,
    o.position as "position",
    o.status,
    v_is_new_user as is_new_user,
    (
      not usage.already_used
      and not v_active_reservation
      and (v_is_new_user or not v_monthly_locked)
    ) as eligible,
    usage.already_used,
    v_monthly_locked,
    v_active_reservation,
    case
      when usage.already_used then 'Already used on this account'
      when v_active_reservation then 'Complete your current bonus deposit first'
      when not v_is_new_user and v_monthly_locked then 'Monthly bonus already used'
      else null
    end as reason
  from public.deposit_bonus_offers o
  join offer_usage usage on usage.offer_id = o.id
  where o.status = 'active'
  order by o.position asc, o.deposit_amount asc, o.created_at asc;
end;
$$;

grant execute on function public.get_available_deposit_bonus_offers() to authenticated;

create or replace function public.admin_update_deposit_status(
  p_request_id uuid,
  p_status text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.deposit_requests%rowtype;
  v_next_status text;
  v_credit_payload jsonb := '{}'::jsonb;
  v_bonus_offer public.deposit_bonus_offers%rowtype;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if not (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
  ) then
    raise exception 'Only finance managers or super admins can update deposit requests';
  end if;

  v_next_status := lower(trim(coalesce(p_status, '')));

  if v_next_status not in ('approved', 'rejected') then
    raise exception 'Deposit status must be approved or rejected';
  end if;

  select *
  into v_request
  from public.deposit_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Deposit request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending deposit requests can be processed';
  end if;

  if v_request.bonus_offer_id is not null then
    select *
    into v_bonus_offer
    from public.deposit_bonus_offers
    where id = v_request.bonus_offer_id;
  end if;

  if v_next_status = 'approved' then
    v_credit_payload := public.credit_deposit_internal(
      v_request.user_id,
      v_request.amount,
      coalesce(v_request.promo_bonus, 0),
      v_request.method
    );

    if v_request.promo_id is not null then
      update public.promo_codes
      set
        usages = coalesce(usages, 0) + 1,
        status = case
          when max_usages > 0 and coalesce(usages, 0) + 1 >= max_usages then 'expired'
          when expiry_date <= now() then 'expired'
          else status
        end
      where id = v_request.promo_id;
    end if;

    update public.deposit_requests
    set
      admin_note = p_admin_note,
      credited_amount = nullif(v_credit_payload->>'credited_amount', '')::numeric,
      deposit_bonus = coalesce(nullif(v_credit_payload->>'deposit_bonus', '')::numeric, 0),
      processed_at = now(),
      processed_by = current_setting('app.current_user_id', true)::uuid,
      promo_bonus = coalesce(nullif(v_credit_payload->>'promo_bonus', '')::numeric, promo_bonus),
      referral_commission = coalesce(nullif(v_credit_payload->>'referral_commission', '')::numeric, 0),
      status = v_next_status,
      updated_at = now(),
      welcome_bonus = coalesce(nullif(v_credit_payload->>'welcome_bonus', '')::numeric, 0)
    where id = v_request.id;

    if v_request.bonus_offer_id is not null then
      update public.deposit_bonus_redemptions
      set
        credited_at = now(),
        released_at = null,
        status = 'credited',
        updated_at = now()
      where deposit_request_id = v_request.id;

      if coalesce(v_request.promo_bonus, 0) > 0 then
        perform public.create_notification_internal(
          v_request.user_id,
          'deposit_bonus',
          'Deposit bonus credited',
          format(
            '%s added $%s to your deposit after confirmation.',
            coalesce(v_bonus_offer.title, 'Deposit bonus'),
            trim(to_char(coalesce(v_request.promo_bonus, 0), 'FM999999990.00'))
          ),
          '/deposit',
          jsonb_build_object(
            'amount', coalesce(v_request.promo_bonus, 0),
            'base_amount', v_request.amount,
            'bonus_offer_id', v_request.bonus_offer_id,
            'deposit_request_id', v_request.id
          ),
          concat('deposit_bonus:', v_request.id::text, ':approved'),
          null
        );
      end if;
    end if;

    perform public.create_notification_internal(
      v_request.user_id,
      'deposit_approved',
      'Deposit approved',
      format(
        'Your %s deposit of $%s has been approved and credited.',
        coalesce(v_request.method, 'deposit'),
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/deposit',
      jsonb_build_object(
        'amount', v_request.amount,
        'deposit_request_id', v_request.id,
        'credited_amount', nullif(v_credit_payload->>'credited_amount', '')::numeric,
        'method', v_request.method
      ),
      concat('deposit_request:', v_request.id::text, ':approved'),
      null
    );
  else
    update public.deposit_requests
    set
      admin_note = p_admin_note,
      processed_at = now(),
      processed_by = current_setting('app.current_user_id', true)::uuid,
      status = v_next_status,
      updated_at = now()
    where id = v_request.id;

    if v_request.bonus_offer_id is not null then
      update public.deposit_bonus_redemptions
      set
        credited_at = null,
        released_at = now(),
        status = 'released',
        updated_at = now()
      where deposit_request_id = v_request.id;
    end if;

    perform public.create_notification_internal(
      v_request.user_id,
      'deposit_rejected',
      'Deposit rejected',
      format(
        'Your %s deposit request for $%s was rejected. Contact support if you need help.',
        coalesce(v_request.method, 'deposit'),
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/deposit',
      jsonb_build_object(
        'amount', v_request.amount,
        'admin_note', p_admin_note,
        'deposit_request_id', v_request.id,
        'method', v_request.method
      ),
      concat('deposit_request:', v_request.id::text, ':rejected'),
      null
    );
  end if;

  return jsonb_build_object(
    'credited_amount', coalesce(v_credit_payload->>'credited_amount', null),
    'request_id', v_request.id,
    'status', v_next_status
  );
end;
$$;

create or replace function public.process_crypto_deposit_detection(
  p_tx_hash text,
  p_address text,
  p_payment_method_id uuid default null,
  p_memo_value text default null,
  p_confirmations integer default 0,
  p_amount_asset numeric default null,
  p_amount_asset_symbol text default null,
  p_amount_usd numeric default null,
  p_external_event_id text default null,
  p_event_status text default 'detected',
  p_provider_name text default null,
  p_raw_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_instruction public.crypto_deposit_instructions%rowtype;
  v_method public.crypto_payment_methods%rowtype;
  v_request public.deposit_requests%rowtype;
  v_event public.crypto_deposit_events%rowtype;
  v_credit_base numeric := 0;
  v_credit_payload jsonb := '{}'::jsonb;
  v_next_instruction_status text := 'awaiting_payment';
  v_bonus_offer public.deposit_bonus_offers%rowtype;
begin
  if 'authenticated'::text <> 'service_role' then
    raise exception 'Only the service role can process crypto deposit detections';
  end if;

  if trim(coalesce(p_tx_hash, '')) = '' then
    raise exception 'Transaction hash is required';
  end if;

  if trim(coalesce(p_address, '')) = '' then
    raise exception 'Blockchain address is required';
  end if;

  select *
  into v_instruction
  from public.crypto_deposit_instructions
  where lower(trim(deposit_address)) = lower(trim(p_address))
    and (p_payment_method_id is null or payment_method_id = p_payment_method_id)
    and (
      memo_value is null
      or nullif(trim(coalesce(p_memo_value, '')), '') is null
      or memo_value = nullif(trim(coalesce(p_memo_value, '')), '')
    )
    and instruction_status in ('awaiting_payment', 'payment_detected', 'confirming')
  order by created_at asc
  limit 1
  for update;

  if not found then
    raise exception 'No open crypto deposit instruction matches the provided address and memo.';
  end if;

  select *
  into v_method
  from public.crypto_payment_methods
  where id = v_instruction.payment_method_id;

  if not found then
    raise exception 'Crypto payment method not found for the matched instruction.';
  end if;

  select *
  into v_request
  from public.deposit_requests
  where id = v_instruction.deposit_request_id
  for update;

  if not found then
    raise exception 'Deposit request not found for the matched instruction.';
  end if;

  if v_request.status <> 'pending' then
    return jsonb_build_object(
      'credited', v_request.status = 'approved',
      'deposit_request_id', v_request.id,
      'instruction_id', v_instruction.id,
      'status', v_request.status,
      'tx_hash', trim(p_tx_hash)
    );
  end if;

  insert into public.crypto_deposit_events (
    amount_asset,
    amount_asset_symbol,
    amount_usd,
    blockchain_address,
    confirmations,
    deposit_request_id,
    event_status,
    external_event_id,
    instruction_id,
    memo_value,
    payment_method_id,
    processed_at,
    provider_name,
    raw_payload,
    tx_hash
  )
  values (
    p_amount_asset,
    nullif(trim(coalesce(p_amount_asset_symbol, '')), ''),
    p_amount_usd,
    trim(p_address),
    greatest(coalesce(p_confirmations, 0), 0),
    v_request.id,
    lower(trim(coalesce(p_event_status, 'detected'))),
    nullif(trim(coalesce(p_external_event_id, '')), ''),
    v_instruction.id,
    nullif(trim(coalesce(p_memo_value, '')), ''),
    v_instruction.payment_method_id,
    now(),
    nullif(trim(coalesce(p_provider_name, '')), ''),
    coalesce(p_raw_payload, '{}'::jsonb),
    trim(p_tx_hash)
  )
  on conflict do nothing
  returning *
  into v_event;

  if not found then
    select *
    into v_event
    from public.crypto_deposit_events
    where tx_hash = trim(p_tx_hash)
      and instruction_id = v_instruction.id
    order by created_at desc
    limit 1
    for update;
  end if;

  v_next_instruction_status := case
    when greatest(coalesce(p_confirmations, 0), 0) <= 0 then 'payment_detected'
    when greatest(coalesce(p_confirmations, 0), 0) < greatest(coalesce(v_instruction.required_confirmations, 0), 0) then 'confirming'
    else 'credited'
  end;

  update public.crypto_deposit_instructions
  set
    detected_amount_asset = coalesce(p_amount_asset, detected_amount_asset),
    detected_amount_usd = coalesce(p_amount_usd, detected_amount_usd),
    detected_asset_symbol = coalesce(nullif(trim(coalesce(p_amount_asset_symbol, '')), ''), detected_asset_symbol),
    detected_tx_hash = trim(p_tx_hash),
    observed_confirmations = greatest(coalesce(p_confirmations, 0), observed_confirmations),
    instruction_status = v_next_instruction_status,
    updated_at = now()
  where id = v_instruction.id;

  if greatest(coalesce(p_confirmations, 0), 0) < greatest(coalesce(v_instruction.required_confirmations, 0), 0) then
    return jsonb_build_object(
      'credited', false,
      'confirmations_observed', greatest(coalesce(p_confirmations, 0), 0),
      'confirmations_required', greatest(coalesce(v_instruction.required_confirmations, 0), 0),
      'deposit_request_id', v_request.id,
      'event_id', v_event.id,
      'instruction_id', v_instruction.id,
      'status', v_next_instruction_status,
      'tx_hash', trim(p_tx_hash)
    );
  end if;

  v_credit_base := coalesce(p_amount_usd, v_instruction.expected_amount_usd, v_request.amount);

  if coalesce(v_credit_base, 0) < coalesce(v_method.minimum_deposit_amount, 0) then
    return jsonb_build_object(
      'credited', false,
      'deposit_request_id', v_request.id,
      'event_id', v_event.id,
      'instruction_id', v_instruction.id,
      'status', 'below_minimum',
      'tx_hash', trim(p_tx_hash)
    );
  end if;

  if v_request.bonus_offer_id is not null then
    select *
    into v_bonus_offer
    from public.deposit_bonus_offers
    where id = v_request.bonus_offer_id;
  end if;

  v_credit_payload := public.credit_deposit_internal(
    v_request.user_id,
    v_credit_base,
    coalesce(v_request.promo_bonus, 0),
    v_request.method
  );

  if v_request.promo_id is not null then
    update public.promo_codes
    set
      usages = coalesce(usages, 0) + 1,
      status = case
        when max_usages > 0 and coalesce(usages, 0) + 1 >= max_usages then 'expired'
        when expiry_date <= now() then 'expired'
        else status
      end
    where id = v_request.promo_id;
  end if;

  update public.deposit_requests
  set
    admin_note = coalesce(admin_note, 'Auto-credited by crypto webhook'),
    credited_amount = nullif(v_credit_payload->>'credited_amount', '')::numeric,
    deposit_bonus = coalesce(nullif(v_credit_payload->>'deposit_bonus', '')::numeric, 0),
    processed_at = now(),
    processed_by = null,
    promo_bonus = coalesce(nullif(v_credit_payload->>'promo_bonus', '')::numeric, promo_bonus),
    referral_commission = coalesce(nullif(v_credit_payload->>'referral_commission', '')::numeric, 0),
    status = 'approved',
    tx_hash = trim(p_tx_hash),
    updated_at = now(),
    welcome_bonus = coalesce(nullif(v_credit_payload->>'welcome_bonus', '')::numeric, 0)
  where id = v_request.id;

  if v_request.bonus_offer_id is not null then
    update public.deposit_bonus_redemptions
    set
      credited_at = now(),
      released_at = null,
      status = 'credited',
      updated_at = now()
    where deposit_request_id = v_request.id;

    if coalesce(v_request.promo_bonus, 0) > 0 then
      perform public.create_notification_internal(
        v_request.user_id,
        'deposit_bonus',
        'Deposit bonus credited',
        format(
          '%s added $%s to your deposit after confirmation.',
          coalesce(v_bonus_offer.title, 'Deposit bonus'),
          trim(to_char(coalesce(v_request.promo_bonus, 0), 'FM999999990.00'))
        ),
        '/deposit',
        jsonb_build_object(
          'amount', coalesce(v_request.promo_bonus, 0),
          'base_amount', v_credit_base,
          'bonus_offer_id', v_request.bonus_offer_id,
          'deposit_request_id', v_request.id
        ),
        concat('deposit_bonus:', v_request.id::text, ':credited'),
        null
      );
    end if;
  end if;

  update public.crypto_deposit_instructions
  set
    detected_amount_asset = coalesce(p_amount_asset, detected_amount_asset),
    detected_amount_usd = coalesce(p_amount_usd, detected_amount_usd),
    detected_asset_symbol = coalesce(nullif(trim(coalesce(p_amount_asset_symbol, '')), ''), detected_asset_symbol),
    detected_tx_hash = trim(p_tx_hash),
    observed_confirmations = greatest(coalesce(p_confirmations, 0), observed_confirmations),
    instruction_status = 'credited',
    credited_at = now(),
    updated_at = now()
  where id = v_instruction.id;

  update public.crypto_deposit_events
  set
    event_status = 'credited',
    processed_at = now(),
    updated_at = now()
  where id = v_event.id;

  perform public.create_notification_internal(
    v_request.user_id,
    'crypto_deposit_confirmed',
    'Crypto deposit credited',
    format(
      'Your %s deposit of $%s has been credited after %s confirmation(s).',
      coalesce(v_method.coin_name, v_request.method, 'crypto'),
      trim(to_char(v_credit_base, 'FM999999990.00')),
      greatest(coalesce(p_confirmations, 0), 0)
    ),
    '/deposit',
    jsonb_build_object(
      'amount', v_credit_base,
      'asset_symbol', coalesce(nullif(trim(coalesce(p_amount_asset_symbol, '')), ''), v_method.symbol),
      'confirmations', greatest(coalesce(p_confirmations, 0), 0),
      'deposit_request_id', v_request.id,
      'instruction_id', v_instruction.id,
      'tx_hash', trim(p_tx_hash)
    ),
    concat('crypto_deposit_confirmed:', v_request.id::text, ':', trim(p_tx_hash)),
    null
  );

  return jsonb_build_object(
    'credited', true,
    'confirmations_observed', greatest(coalesce(p_confirmations, 0), 0),
    'confirmations_required', greatest(coalesce(v_instruction.required_confirmations, 0), 0),
    'credited_amount', coalesce(v_credit_payload->>'credited_amount', null),
    'deposit_request_id', v_request.id,
    'event_id', v_event.id,
    'instruction_id', v_instruction.id,
    'status', 'credited',
    'tx_hash', trim(p_tx_hash)
  );
end;
$$;

-- ===== MIGRATION: 20260401000001_sasapay_mobile_money.sql =====
alter table public.deposit_requests
  add column if not exists provider_name text,
  add column if not exists provider_request_id text,
  add column if not exists provider_checkout_id text,
  add column if not exists provider_transaction_ref text,
  add column if not exists provider_channel text,
  add column if not exists provider_phone_number text,
  add column if not exists provider_currency text,
  add column if not exists provider_amount numeric,
  add column if not exists provider_status text,
  add column if not exists provider_result_code text,
  add column if not exists provider_result_desc text,
  add column if not exists provider_callback_received_at timestamptz,
  add column if not exists provider_payload jsonb not null default '{}'::jsonb;

alter table public.withdrawal_requests
  add column if not exists provider_name text,
  add column if not exists provider_request_id text,
  add column if not exists provider_checkout_id text,
  add column if not exists provider_transaction_ref text,
  add column if not exists provider_channel text,
  add column if not exists provider_phone_number text,
  add column if not exists provider_currency text,
  add column if not exists provider_amount numeric,
  add column if not exists provider_status text,
  add column if not exists provider_result_code text,
  add column if not exists provider_result_desc text,
  add column if not exists provider_callback_received_at timestamptz,
  add column if not exists provider_payload jsonb not null default '{}'::jsonb;

create index if not exists deposit_requests_provider_lookup_idx
  on public.deposit_requests(provider_name, provider_request_id, provider_checkout_id);

create index if not exists withdrawal_requests_provider_lookup_idx
  on public.withdrawal_requests(provider_name, provider_request_id, provider_checkout_id);

create unique index if not exists deposit_requests_provider_request_uidx
  on public.deposit_requests(provider_name, provider_request_id)
  where provider_request_id is not null;

create unique index if not exists deposit_requests_provider_checkout_uidx
  on public.deposit_requests(provider_name, provider_checkout_id)
  where provider_checkout_id is not null;

create unique index if not exists withdrawal_requests_provider_request_uidx
  on public.withdrawal_requests(provider_name, provider_request_id)
  where provider_request_id is not null;

create unique index if not exists withdrawal_requests_provider_checkout_uidx
  on public.withdrawal_requests(provider_name, provider_checkout_id)
  where provider_checkout_id is not null;

create or replace function public.process_mobile_money_deposit_callback(
  p_request_id uuid default null,
  p_provider_name text default 'sasapay',
  p_provider_request_id text default null,
  p_provider_checkout_id text default null,
  p_provider_transaction_ref text default null,
  p_provider_channel text default null,
  p_provider_phone_number text default null,
  p_provider_amount numeric default null,
  p_provider_currency text default 'KES',
  p_provider_result_code text default null,
  p_provider_result_desc text default null,
  p_provider_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus_offer public.deposit_bonus_offers%rowtype;
  v_credit_payload jsonb := '{}'::jsonb;
  v_now timestamptz := now();
  v_provider_channel text := nullif(trim(coalesce(p_provider_channel, '')), '');
  v_provider_checkout_id text := nullif(trim(coalesce(p_provider_checkout_id, '')), '');
  v_provider_currency text := coalesce(nullif(trim(coalesce(p_provider_currency, '')), ''), 'KES');
  v_provider_name text := coalesce(nullif(trim(coalesce(p_provider_name, '')), ''), 'sasapay');
  v_provider_phone text := nullif(trim(coalesce(p_provider_phone_number, '')), '');
  v_provider_request_id text := nullif(trim(coalesce(p_provider_request_id, '')), '');
  v_provider_result_code text := nullif(trim(coalesce(p_provider_result_code, '')), '');
  v_provider_result_desc text := nullif(trim(coalesce(p_provider_result_desc, '')), '');
  v_provider_transaction_ref text := nullif(trim(coalesce(p_provider_transaction_ref, '')), '');
  v_request public.deposit_requests%rowtype;
begin
  if 'authenticated'::text <> 'service_role' then
    raise exception 'Only the service role can process mobile money deposit callbacks';
  end if;

  if p_request_id is null and v_provider_request_id is null and v_provider_checkout_id is null then
    raise exception 'A deposit request identifier is required';
  end if;

  select *
  into v_request
  from public.deposit_requests
  where (p_request_id is not null and id = p_request_id)
     or (v_provider_request_id is not null and provider_request_id = v_provider_request_id)
     or (v_provider_checkout_id is not null and provider_checkout_id = v_provider_checkout_id)
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Deposit request not found';
  end if;

  update public.deposit_requests
  set
    provider_amount = coalesce(p_provider_amount, provider_amount),
    provider_callback_received_at = v_now,
    provider_channel = coalesce(v_provider_channel, provider_channel),
    provider_checkout_id = coalesce(v_provider_checkout_id, provider_checkout_id),
    provider_currency = coalesce(v_provider_currency, provider_currency),
    provider_name = coalesce(v_provider_name, provider_name),
    provider_payload = coalesce(p_provider_payload, provider_payload, '{}'::jsonb),
    provider_phone_number = coalesce(v_provider_phone, provider_phone_number),
    provider_request_id = coalesce(v_provider_request_id, provider_request_id),
    provider_result_code = coalesce(v_provider_result_code, provider_result_code),
    provider_result_desc = coalesce(v_provider_result_desc, provider_result_desc),
    provider_status = case
      when v_provider_result_code is null then provider_status
      when v_provider_result_code = '0' then 'completed'
      else 'failed'
    end,
    provider_transaction_ref = coalesce(v_provider_transaction_ref, provider_transaction_ref),
    updated_at = v_now
  where id = v_request.id
  returning *
  into v_request;

  if v_request.status <> 'pending' then
    return jsonb_build_object(
      'credited', v_request.status = 'approved',
      'request_id', v_request.id,
      'status', v_request.status
    );
  end if;

  if v_provider_result_code is distinct from '0' then
    update public.deposit_requests
    set
      admin_note = coalesce(v_provider_result_desc, 'Mobile money deposit failed'),
      processed_at = v_now,
      processed_by = null,
      status = 'rejected',
      updated_at = v_now
    where id = v_request.id;

    if v_request.bonus_offer_id is not null then
      update public.deposit_bonus_redemptions
      set
        credited_at = null,
        released_at = v_now,
        status = 'released',
        updated_at = v_now
      where deposit_request_id = v_request.id;
    end if;

    perform public.create_notification_internal(
      v_request.user_id,
      'deposit_rejected',
      'Deposit failed',
      format(
        'Your %s deposit request for $%s could not be completed. %s',
        coalesce(v_request.method, 'mobile money'),
        trim(to_char(v_request.amount, 'FM999999990.00')),
        coalesce(v_provider_result_desc, 'The payment was not completed.')
      ),
      '/deposit',
      jsonb_build_object(
        'amount', v_request.amount,
        'deposit_request_id', v_request.id,
        'method', v_request.method,
        'provider', v_provider_name,
        'provider_amount', p_provider_amount,
        'provider_currency', v_provider_currency,
        'provider_result_code', v_provider_result_code,
        'provider_result_desc', v_provider_result_desc
      ),
      concat('deposit_request:', v_request.id::text, ':mobile_money_rejected'),
      null
    );

    return jsonb_build_object(
      'credited', false,
      'request_id', v_request.id,
      'status', 'rejected'
    );
  end if;

  if v_request.bonus_offer_id is not null then
    select *
    into v_bonus_offer
    from public.deposit_bonus_offers
    where id = v_request.bonus_offer_id;
  end if;

  v_credit_payload := public.credit_deposit_internal(
    v_request.user_id,
    v_request.amount,
    coalesce(v_request.promo_bonus, 0),
    v_request.method
  );

  if v_request.promo_id is not null then
    update public.promo_codes
    set
      usages = coalesce(usages, 0) + 1,
      status = case
        when max_usages > 0 and coalesce(usages, 0) + 1 >= max_usages then 'expired'
        when expiry_date <= now() then 'expired'
        else status
      end
    where id = v_request.promo_id;
  end if;

  update public.deposit_requests
  set
    admin_note = coalesce(admin_note, 'Auto-credited by mobile money callback'),
    credited_amount = nullif(v_credit_payload->>'credited_amount', '')::numeric,
    deposit_bonus = coalesce(nullif(v_credit_payload->>'deposit_bonus', '')::numeric, 0),
    processed_at = v_now,
    processed_by = null,
    promo_bonus = coalesce(nullif(v_credit_payload->>'promo_bonus', '')::numeric, promo_bonus),
    referral_commission = coalesce(nullif(v_credit_payload->>'referral_commission', '')::numeric, 0),
    status = 'approved',
    updated_at = v_now,
    welcome_bonus = coalesce(nullif(v_credit_payload->>'welcome_bonus', '')::numeric, 0)
  where id = v_request.id;

  if v_request.bonus_offer_id is not null then
    update public.deposit_bonus_redemptions
    set
      credited_at = v_now,
      released_at = null,
      status = 'credited',
      updated_at = v_now
    where deposit_request_id = v_request.id;

    if coalesce(v_request.promo_bonus, 0) > 0 then
      perform public.create_notification_internal(
        v_request.user_id,
        'deposit_bonus',
        'Deposit bonus credited',
        format(
          '%s added $%s to your deposit after confirmation.',
          coalesce(v_bonus_offer.title, 'Deposit bonus'),
          trim(to_char(coalesce(v_request.promo_bonus, 0), 'FM999999990.00'))
        ),
        '/deposit',
        jsonb_build_object(
          'amount', coalesce(v_request.promo_bonus, 0),
          'base_amount', v_request.amount,
          'bonus_offer_id', v_request.bonus_offer_id,
          'deposit_request_id', v_request.id
        ),
        concat('deposit_bonus:', v_request.id::text, ':mobile_money_credited'),
        null
      );
    end if;
  end if;

  perform public.create_notification_internal(
    v_request.user_id,
    'deposit_approved',
    'Deposit confirmed',
    format(
      'Your %s deposit of $%s was confirmed and credited automatically.',
      coalesce(v_request.method, 'mobile money'),
      trim(to_char(v_request.amount, 'FM999999990.00'))
    ),
    '/deposit',
    jsonb_build_object(
      'amount', v_request.amount,
      'credited_amount', nullif(v_credit_payload->>'credited_amount', '')::numeric,
      'deposit_request_id', v_request.id,
      'method', v_request.method,
      'provider', v_provider_name,
      'provider_amount', p_provider_amount,
      'provider_currency', v_provider_currency,
      'provider_phone_number', v_provider_phone,
      'provider_transaction_ref', v_provider_transaction_ref
    ),
    concat('deposit_request:', v_request.id::text, ':mobile_money_approved'),
    null
  );

  return jsonb_build_object(
    'credited', true,
    'credited_amount', coalesce(v_credit_payload->>'credited_amount', null),
    'request_id', v_request.id,
    'status', 'approved'
  );
end;
$$;

create or replace function public.process_mobile_money_withdrawal_callback(
  p_request_id uuid default null,
  p_provider_name text default 'sasapay',
  p_provider_request_id text default null,
  p_provider_checkout_id text default null,
  p_provider_transaction_ref text default null,
  p_provider_channel text default null,
  p_provider_phone_number text default null,
  p_provider_amount numeric default null,
  p_provider_currency text default 'KES',
  p_provider_result_code text default null,
  p_provider_result_desc text default null,
  p_provider_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_provider_channel text := nullif(trim(coalesce(p_provider_channel, '')), '');
  v_provider_checkout_id text := nullif(trim(coalesce(p_provider_checkout_id, '')), '');
  v_provider_currency text := coalesce(nullif(trim(coalesce(p_provider_currency, '')), ''), 'KES');
  v_provider_name text := coalesce(nullif(trim(coalesce(p_provider_name, '')), ''), 'sasapay');
  v_provider_phone text := nullif(trim(coalesce(p_provider_phone_number, '')), '');
  v_provider_request_id text := nullif(trim(coalesce(p_provider_request_id, '')), '');
  v_provider_result_code text := nullif(trim(coalesce(p_provider_result_code, '')), '');
  v_provider_result_desc text := nullif(trim(coalesce(p_provider_result_desc, '')), '');
  v_provider_transaction_ref text := nullif(trim(coalesce(p_provider_transaction_ref, '')), '');
  v_request public.withdrawal_requests%rowtype;
begin
  if 'authenticated'::text <> 'service_role' then
    raise exception 'Only the service role can process mobile money withdrawal callbacks';
  end if;

  if p_request_id is null and v_provider_request_id is null and v_provider_checkout_id is null then
    raise exception 'A withdrawal request identifier is required';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where (p_request_id is not null and id = p_request_id)
     or (v_provider_request_id is not null and provider_request_id = v_provider_request_id)
     or (v_provider_checkout_id is not null and provider_checkout_id = v_provider_checkout_id)
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Withdrawal request not found';
  end if;

  update public.withdrawal_requests
  set
    provider_amount = coalesce(p_provider_amount, provider_amount),
    provider_callback_received_at = v_now,
    provider_channel = coalesce(v_provider_channel, provider_channel),
    provider_checkout_id = coalesce(v_provider_checkout_id, provider_checkout_id),
    provider_currency = coalesce(v_provider_currency, provider_currency),
    provider_name = coalesce(v_provider_name, provider_name),
    provider_payload = coalesce(p_provider_payload, provider_payload, '{}'::jsonb),
    provider_phone_number = coalesce(v_provider_phone, provider_phone_number),
    provider_request_id = coalesce(v_provider_request_id, provider_request_id),
    provider_result_code = coalesce(v_provider_result_code, provider_result_code),
    provider_result_desc = coalesce(v_provider_result_desc, provider_result_desc),
    provider_status = case
      when v_provider_result_code is null then provider_status
      when v_provider_result_code = '0' then 'completed'
      else 'failed'
    end,
    provider_transaction_ref = coalesce(v_provider_transaction_ref, provider_transaction_ref),
    updated_at = v_now
  where id = v_request.id
  returning *
  into v_request;

  if v_request.status <> 'pending' then
    return jsonb_build_object(
      'request_id', v_request.id,
      'status', v_request.status,
      'succeeded', v_request.status = 'approved'
    );
  end if;

  if v_provider_result_code = '0' then
    update public.withdrawal_requests
    set
      admin_note = coalesce(admin_note, 'Auto-approved by mobile money callback'),
      processed_at = v_now,
      processed_by = null,
      status = 'approved',
      updated_at = v_now
    where id = v_request.id;

    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_approved',
      'Withdrawal completed',
      format(
        'Your %s withdrawal of $%s was sent successfully.',
        coalesce(v_request.method, 'mobile money'),
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/withdraw',
      jsonb_build_object(
        'amount', v_request.amount,
        'method', v_request.method,
        'provider', v_provider_name,
        'provider_amount', p_provider_amount,
        'provider_currency', v_provider_currency,
        'provider_phone_number', v_provider_phone,
        'provider_transaction_ref', v_provider_transaction_ref,
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':mobile_money_approved'),
      null
    );

    return jsonb_build_object(
      'request_id', v_request.id,
      'status', 'approved',
      'succeeded', true
    );
  end if;

  update public.withdrawal_requests
  set
    admin_note = coalesce(v_provider_result_desc, 'Mobile money payout failed'),
    processed_at = v_now,
    processed_by = null,
    status = 'rejected',
    updated_at = v_now
  where id = v_request.id;

  update public.profiles
  set
    balance = balance + v_request.amount,
    updated_at = v_now
  where id = v_request.user_id;

  perform public.create_notification_internal(
    v_request.user_id,
    'withdrawal_rejected',
    'Withdrawal failed',
    format(
      'Your %s withdrawal of $%s failed and the funds were returned to your balance. %s',
      coalesce(v_request.method, 'mobile money'),
      trim(to_char(v_request.amount, 'FM999999990.00')),
      coalesce(v_provider_result_desc, 'Please try again or contact support.')
    ),
    '/withdraw',
    jsonb_build_object(
      'amount', v_request.amount,
      'method', v_request.method,
      'provider', v_provider_name,
      'provider_amount', p_provider_amount,
      'provider_currency', v_provider_currency,
      'provider_phone_number', v_provider_phone,
      'provider_result_code', v_provider_result_code,
      'provider_result_desc', v_provider_result_desc,
      'withdrawal_request_id', v_request.id
    ),
    concat('withdrawal_request:', v_request.id::text, ':mobile_money_rejected'),
    null
  );

  return jsonb_build_object(
    'request_id', v_request.id,
    'status', 'rejected',
    'succeeded', false
  );
end;
$$;

grant execute on function public.process_mobile_money_deposit_callback(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text,
  jsonb
) to service_role;

grant execute on function public.process_mobile_money_withdrawal_callback(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text,
  jsonb
) to service_role;

-- ===== MIGRATION: 20260402000000_deposit_bonus_ranges_and_caps.sql =====
alter table public.deposit_bonus_offers
  add column if not exists minimum_deposit_amount numeric,
  add column if not exists maximum_deposit_amount numeric,
  add column if not exists maximum_bonus_amount numeric;

update public.deposit_bonus_offers
set
  minimum_deposit_amount = coalesce(minimum_deposit_amount, deposit_amount),
  deposit_amount = coalesce(minimum_deposit_amount, deposit_amount)
where minimum_deposit_amount is null
   or deposit_amount is distinct from coalesce(minimum_deposit_amount, deposit_amount);

alter table public.deposit_bonus_offers
  alter column minimum_deposit_amount set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'deposit_bonus_offers_minimum_deposit_amount_check'
  ) then
    alter table public.deposit_bonus_offers
      add constraint deposit_bonus_offers_minimum_deposit_amount_check
      check (minimum_deposit_amount > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'deposit_bonus_offers_maximum_deposit_amount_check'
  ) then
    alter table public.deposit_bonus_offers
      add constraint deposit_bonus_offers_maximum_deposit_amount_check
      check (
        maximum_deposit_amount is null
        or maximum_deposit_amount >= minimum_deposit_amount
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'deposit_bonus_offers_maximum_bonus_amount_check'
  ) then
    alter table public.deposit_bonus_offers
      add constraint deposit_bonus_offers_maximum_bonus_amount_check
      check (
        maximum_bonus_amount is null
        or maximum_bonus_amount > 0
      );
  end if;
end
$$;

create index if not exists deposit_bonus_offers_range_idx
  on public.deposit_bonus_offers(status, position, minimum_deposit_amount, maximum_deposit_amount);

drop function if exists public.get_available_deposit_bonus_offers();

create or replace function public.get_available_deposit_bonus_offers()
returns table (
  id uuid,
  title text,
  description text,
  deposit_amount numeric,
  minimum_deposit_amount numeric,
  maximum_deposit_amount numeric,
  maximum_bonus_amount numeric,
  bonus_percent numeric,
  bonus_amount numeric,
  "position" integer,
  status text,
  is_new_user boolean,
  eligible boolean,
  already_used boolean,
  monthly_locked boolean,
  active_reservation boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_is_new_user boolean := false;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = current_setting('app.current_user_id', true)::uuid;

  if not found then
    raise exception 'Profile not found';
  end if;

  v_is_new_user := coalesce(v_profile.total_deposit, 0) <= 0;

  return query
  with offer_usage as (
    select
      o.id as offer_id,
      exists (
        select 1
        from public.deposit_bonus_redemptions r
        where r.user_id = current_setting('app.current_user_id', true)::uuid
          and r.bonus_offer_id = o.id
          and r.status in ('reserved', 'credited')
      ) as already_used
    from public.deposit_bonus_offers o
    where o.status = 'active'
  )
  select
    o.id,
    o.title,
    o.description,
    o.deposit_amount,
    o.minimum_deposit_amount,
    o.maximum_deposit_amount,
    o.maximum_bonus_amount,
    o.bonus_percent,
    case
      when coalesce(o.maximum_bonus_amount, 0) > 0 then least(
        round(o.minimum_deposit_amount * (o.bonus_percent / 100.0), 2),
        o.maximum_bonus_amount
      )
      else round(o.minimum_deposit_amount * (o.bonus_percent / 100.0), 2)
    end as bonus_amount,
    o.position as "position",
    o.status,
    v_is_new_user as is_new_user,
    not usage.already_used as eligible,
    usage.already_used,
    false as monthly_locked,
    false as active_reservation,
    case
      when usage.already_used then 'Already used on this account'
      else null
    end as reason
  from public.deposit_bonus_offers o
  join offer_usage usage on usage.offer_id = o.id
  where o.status = 'active'
  order by o.position asc, o.minimum_deposit_amount asc, o.created_at asc;
end;
$$;

-- ===== MIGRATION: 20260402000001_mpesa_withdrawal_queue.sql =====
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
      'withdrawal_processing',
      'withdrawal_completed',
      'withdrawal_failed',
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

alter table public.platform_settings
  add column if not exists mpesa_withdrawal_approval_threshold_kes numeric not null default 10000;

alter table public.profiles
  add column if not exists reserved_withdrawal_balance numeric not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_reserved_withdrawal_balance_check'
  ) then
    alter table public.profiles
      add constraint profiles_reserved_withdrawal_balance_check
      check (reserved_withdrawal_balance >= 0);
  end if;
end
$$;

alter table public.withdrawal_requests
  add column if not exists approval_required boolean not null default false,
  add column if not exists approval_threshold_kes numeric,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists auto_approved boolean not null default false,
  add column if not exists audit_log jsonb not null default '[]'::jsonb,
  add column if not exists completed_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists failure_reason text,
  add column if not exists last_processing_error text,
  add column if not exists merchant_ref text,
  add column if not exists next_retry_at timestamptz not null default now(),
  add column if not exists processing_attempts integer not null default 0,
  add column if not exists processing_started_at timestamptz,
  add column if not exists queued_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists request_ip text,
  add column if not exists request_user_agent text;

update public.withdrawal_requests
set
  approval_threshold_kes = coalesce(approval_threshold_kes, 10000),
  audit_log = coalesce(audit_log, '[]'::jsonb),
  next_retry_at = coalesce(next_retry_at, created_at, now()),
  processing_attempts = coalesce(processing_attempts, 0)
where approval_threshold_kes is null
   or audit_log is null
   or next_retry_at is null
   or processing_attempts is null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'withdrawal_requests_status_check'
  ) then
    alter table public.withdrawal_requests
      drop constraint withdrawal_requests_status_check;
  end if;

  alter table public.withdrawal_requests
    add constraint withdrawal_requests_status_check
    check (status in ('pending', 'approved', 'processing', 'completed', 'failed', 'rejected'));
end
$$;

create index if not exists withdrawal_requests_provider_queue_idx
  on public.withdrawal_requests(provider_name, status, next_retry_at, created_at);

create unique index if not exists withdrawal_requests_merchant_ref_uidx
  on public.withdrawal_requests(merchant_ref)
  where merchant_ref is not null;

create or replace function public.request_mobile_money_withdrawal(
  p_amount numeric,
  p_amount_kes numeric,
  p_phone_number text,
  p_provider_channel text default '63902',
  p_request_ip text default null,
  p_request_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available_balance numeric := 0;
  v_bonus_total numeric := 0;
  v_phone_number text := nullif(trim(coalesce(p_phone_number, '')), '');
  v_profile public.profiles%rowtype;
  v_request public.withdrawal_requests%rowtype;
  v_require_kyc boolean := true;
  v_required_turnover numeric := 0;
  v_threshold_kes numeric := 10000;
  v_turnover_done numeric := 0;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Withdrawal amount must be positive';
  end if;

  if p_amount < 10 then
    raise exception 'Minimum withdrawal is $10';
  end if;

  if coalesce(p_amount_kes, 0) <= 0 then
    raise exception 'Withdrawal amount in KES must be positive';
  end if;

  if v_phone_number is null then
    raise exception 'A valid M-PESA number is required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = current_setting('app.current_user_id', true)::uuid
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  select
    coalesce(ps.require_kyc_withdrawal, true),
    coalesce(ps.mpesa_withdrawal_approval_threshold_kes, 10000)
  into
    v_require_kyc,
    v_threshold_kes
  from public.platform_settings ps
  order by ps.updated_at desc
  limit 1;

  if coalesce(v_require_kyc, true) and lower(coalesce(v_profile.kyc_status, '')) not in ('verified', 'approved') then
    raise exception 'Account verification is required before withdrawal';
  end if;

  select coalesce(sum(coalesce(dr.welcome_bonus, 0) + coalesce(dr.deposit_bonus, 0) + coalesce(dr.promo_bonus, 0)), 0)
  into v_bonus_total
  from public.deposit_requests dr
  where dr.user_id = current_setting('app.current_user_id', true)::uuid
    and dr.status = 'approved';

  if v_bonus_total > 0 then
    v_required_turnover := round(v_bonus_total * 30, 2);

    select coalesce(sum(t.amount), 0)
    into v_turnover_done
    from public.trades t
    where t.user_id = current_setting('app.current_user_id', true)::uuid
      and t.status in ('won', 'lost', 'expired')
      and t.tournament_participant_id is null;

    if v_turnover_done < v_required_turnover then
      raise exception 'Bonus turnover requirement not met. Required volume: $%, completed: $%.',
        trim(to_char(v_required_turnover, 'FM999999990.00')),
        trim(to_char(v_turnover_done, 'FM999999990.00'));
    end if;
  end if;

  v_available_balance := greatest(
    0,
    coalesce(v_profile.balance, 0) - coalesce(v_profile.reserved_withdrawal_balance, 0)
  );

  if v_available_balance < p_amount then
    raise exception 'Insufficient available balance';
  end if;

  update public.profiles
  set
    reserved_withdrawal_balance = coalesce(reserved_withdrawal_balance, 0) + p_amount,
    updated_at = now()
  where id = current_setting('app.current_user_id', true)::uuid;

  insert into public.withdrawal_requests (
    amount,
    approval_required,
    approval_threshold_kes,
    approved_at,
    auto_approved,
    audit_log,
    destination,
    merchant_ref,
    method,
    next_retry_at,
    provider_amount,
    provider_channel,
    provider_currency,
    provider_name,
    provider_phone_number,
    provider_status,
    queued_at,
    request_ip,
    request_user_agent,
    status,
    user_id
  )
  values (
    p_amount,
    p_amount_kes > v_threshold_kes,
    v_threshold_kes,
    case when p_amount_kes > v_threshold_kes then null else now() end,
    p_amount_kes <= v_threshold_kes,
    jsonb_build_array(
      jsonb_build_object(
        'action', 'requested',
        'actor_id', current_setting('app.current_user_id', true)::uuid,
        'amount', p_amount,
        'amount_kes', p_amount_kes,
        'created_at', now(),
        'status', case when p_amount_kes > v_threshold_kes then 'pending' else 'approved' end
      )
    ),
    v_phone_number,
    concat('WITHDRAW_', replace(current_setting('app.current_user_id', true)::uuid::text, '-', ''), '_', floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
    'M-PESA Mobile Money',
    now(),
    p_amount_kes,
    nullif(trim(coalesce(p_provider_channel, '')), ''),
    'KES',
    'sasapay',
    v_phone_number,
    case when p_amount_kes > v_threshold_kes then 'awaiting_approval' else 'queued' end,
    case when p_amount_kes > v_threshold_kes then null else now() end,
    nullif(trim(coalesce(p_request_ip, '')), ''),
    nullif(trim(coalesce(p_request_user_agent, '')), ''),
    case when p_amount_kes > v_threshold_kes then 'pending' else 'approved' end,
    current_setting('app.current_user_id', true)::uuid
  )
  returning *
  into v_request;

  perform public.create_notification_internal(
    current_setting('app.current_user_id', true)::uuid,
    'withdrawal_requested',
    'Withdrawal request received',
    format(
      'Your M-PESA withdrawal request for $%s was received and %s.',
      trim(to_char(p_amount, 'FM999999990.00')),
      case
        when v_request.status = 'pending' then 'is waiting for approval'
        else 'is queued for processing'
      end
    ),
    '/withdraw',
    jsonb_build_object(
      'amount', v_request.amount,
      'amount_kes', p_amount_kes,
      'approval_required', v_request.approval_required,
      'destination', v_request.destination,
      'method', v_request.method,
      'status', v_request.status,
      'withdrawal_request_id', v_request.id
    ),
    concat('withdrawal_request:', v_request.id::text, ':requested'),
    null
  );

  return jsonb_build_object(
    'amount', v_request.amount,
    'amount_kes', p_amount_kes,
    'approval_required', v_request.approval_required,
    'auto_approved', v_request.auto_approved,
    'masked_destination', v_request.destination,
    'request_id', v_request.id,
    'status', v_request.status
  );
end;
$$;

create or replace function public.admin_review_mobile_money_withdrawal(
  p_request_id uuid,
  p_status text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_request public.withdrawal_requests%rowtype;
  v_status text := lower(trim(coalesce(p_status, '')));
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if not (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    or public.has_role(current_setting('app.current_user_id', true)::uuid, 'finance_manager'::public.app_role)
  ) then
    raise exception 'Only finance managers or super admins can review mobile money withdrawal requests';
  end if;

  if v_status not in ('approved', 'rejected') then
    raise exception 'Mobile money withdrawal status must be approved or rejected';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where id = p_request_id
    and provider_name = 'sasapay'
  for update;

  if not found then
    raise exception 'Mobile money withdrawal request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending mobile money withdrawal requests can be reviewed';
  end if;

  if v_status = 'approved' then
    update public.withdrawal_requests
    set
      admin_note = p_admin_note,
      approved_at = v_now,
      approved_by = current_setting('app.current_user_id', true)::uuid,
      audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'action', 'approved',
          'actor_id', current_setting('app.current_user_id', true)::uuid,
          'admin_note', p_admin_note,
          'created_at', v_now
        )
      ),
      next_retry_at = v_now,
      processed_at = null,
      processed_by = null,
      provider_result_code = null,
      provider_result_desc = null,
      provider_status = 'approved',
      queued_at = coalesce(queued_at, v_now),
      status = 'approved',
      updated_at = v_now
    where id = v_request.id
    returning *
    into v_request;

    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_approved',
      'Withdrawal approved',
      format(
        'Your M-PESA withdrawal of $%s has been approved and is queued for processing.',
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/withdraw',
      jsonb_build_object(
        'amount', v_request.amount,
        'method', v_request.method,
        'status', v_request.status,
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':approved'),
      null
    );
  else
    update public.withdrawal_requests
    set
      admin_note = p_admin_note,
      audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'action', 'rejected',
          'actor_id', current_setting('app.current_user_id', true)::uuid,
          'admin_note', p_admin_note,
          'created_at', v_now
        )
      ),
      failure_reason = coalesce(nullif(trim(coalesce(p_admin_note, '')), ''), 'Rejected by finance team'),
      processed_at = v_now,
      processed_by = current_setting('app.current_user_id', true)::uuid,
      provider_result_desc = coalesce(nullif(trim(coalesce(p_admin_note, '')), ''), provider_result_desc),
      provider_status = 'rejected',
      rejected_at = v_now,
      status = 'rejected',
      updated_at = v_now
    where id = v_request.id
    returning *
    into v_request;

    update public.profiles
    set
      reserved_withdrawal_balance = greatest(0, coalesce(reserved_withdrawal_balance, 0) - v_request.amount),
      updated_at = v_now
    where id = v_request.user_id;

    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_rejected',
      'Withdrawal rejected',
      format(
        'Your M-PESA withdrawal of $%s was rejected. The funds remain available in your balance.',
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/withdraw',
      jsonb_build_object(
        'admin_note', p_admin_note,
        'amount', v_request.amount,
        'method', v_request.method,
        'status', v_request.status,
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':rejected'),
      null
    );
  end if;

  return jsonb_build_object(
    'amount', v_request.amount,
    'request_id', v_request.id,
    'status', v_request.status
  );
end;
$$;

create or replace function public.claim_mobile_money_withdrawal(
  p_request_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_request public.withdrawal_requests%rowtype;
begin
  if 'authenticated'::text <> 'service_role' then
    raise exception 'Only the service role can claim mobile money withdrawals';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where provider_name = 'sasapay'
    and status = 'approved'
    and coalesce(next_retry_at, now()) <= now()
    and (p_request_id is null or id = p_request_id)
  order by queued_at asc nulls first, created_at asc
  limit 1
  for update skip locked;

  if not found then
    return jsonb_build_object('request_id', null);
  end if;

  update public.withdrawal_requests
  set
    audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'action', 'processing_started',
        'created_at', v_now,
        'status', 'processing'
      )
    ),
    last_processing_error = null,
    processing_attempts = coalesce(processing_attempts, 0) + 1,
    processing_started_at = v_now,
    provider_status = 'processing',
    status = 'processing',
    updated_at = v_now
  where id = v_request.id
  returning *
  into v_request;

  if coalesce(v_request.processing_attempts, 0) = 1 then
    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_processing',
      'Withdrawal processing',
      format(
        'Your M-PESA withdrawal of $%s is now being sent to your phone.',
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/withdraw',
      jsonb_build_object(
        'amount', v_request.amount,
        'method', v_request.method,
        'status', v_request.status,
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':processing'),
      null
    );
  end if;

  return jsonb_build_object(
    'amount', v_request.amount,
    'amount_kes', v_request.provider_amount,
    'merchant_ref', v_request.merchant_ref,
    'phone_number', coalesce(v_request.provider_phone_number, v_request.destination),
    'processing_attempts', v_request.processing_attempts,
    'request_id', v_request.id,
    'status', v_request.status,
    'user_id', v_request.user_id
  );
end;
$$;

create or replace function public.update_mobile_money_withdrawal_dispatch_state(
  p_request_id uuid,
  p_next_status text,
  p_failure_reason text default null,
  p_next_retry_at timestamptz default null,
  p_provider_payload jsonb default '{}'::jsonb,
  p_provider_result_code text default null,
  p_provider_result_desc text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failure_reason text := nullif(trim(coalesce(p_failure_reason, '')), '');
  v_now timestamptz := now();
  v_next_status text := lower(trim(coalesce(p_next_status, '')));
  v_request public.withdrawal_requests%rowtype;
begin
  if 'authenticated'::text <> 'service_role' then
    raise exception 'Only the service role can update mobile money withdrawal dispatch state';
  end if;

  if v_next_status not in ('approved', 'failed') then
    raise exception 'Dispatch state must move to approved or failed';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where id = p_request_id
    and provider_name = 'sasapay'
  for update;

  if not found then
    raise exception 'Mobile money withdrawal request not found';
  end if;

  if v_request.status in ('completed', 'failed', 'rejected') then
    return jsonb_build_object(
      'request_id', v_request.id,
      'status', v_request.status
    );
  end if;

  if v_next_status = 'approved' then
    update public.withdrawal_requests
    set
      audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'action', 'retry_scheduled',
          'created_at', v_now,
          'failure_reason', coalesce(v_failure_reason, p_provider_result_desc)
        )
      ),
      last_processing_error = coalesce(v_failure_reason, p_provider_result_desc),
      next_retry_at = coalesce(p_next_retry_at, v_now + interval '5 minutes'),
      provider_payload = coalesce(p_provider_payload, provider_payload, '{}'::jsonb),
      provider_result_code = coalesce(nullif(trim(coalesce(p_provider_result_code, '')), ''), provider_result_code),
      provider_result_desc = coalesce(nullif(trim(coalesce(p_provider_result_desc, '')), ''), provider_result_desc),
      provider_status = 'retry_scheduled',
      status = 'approved',
      updated_at = v_now
    where id = v_request.id
    returning *
    into v_request;
  else
    update public.withdrawal_requests
    set
      audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'action', 'dispatch_failed',
          'created_at', v_now,
          'failure_reason', coalesce(v_failure_reason, p_provider_result_desc)
        )
      ),
      failed_at = v_now,
      failure_reason = coalesce(v_failure_reason, p_provider_result_desc, 'Mobile money payout failed'),
      last_processing_error = coalesce(v_failure_reason, p_provider_result_desc, 'Mobile money payout failed'),
      processed_at = v_now,
      processed_by = null,
      provider_payload = coalesce(p_provider_payload, provider_payload, '{}'::jsonb),
      provider_result_code = coalesce(nullif(trim(coalesce(p_provider_result_code, '')), ''), provider_result_code),
      provider_result_desc = coalesce(nullif(trim(coalesce(p_provider_result_desc, '')), ''), provider_result_desc),
      provider_status = 'failed',
      status = 'failed',
      updated_at = v_now
    where id = v_request.id
    returning *
    into v_request;

    update public.profiles
    set
      reserved_withdrawal_balance = greatest(0, coalesce(reserved_withdrawal_balance, 0) - v_request.amount),
      updated_at = v_now
    where id = v_request.user_id;

    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_failed',
      'Withdrawal failed',
      format(
        'Your M-PESA withdrawal of $%s could not be processed. The funds remain available in your balance. %s',
        trim(to_char(v_request.amount, 'FM999999990.00')),
        coalesce(v_request.failure_reason, 'Please try again later.')
      ),
      '/withdraw',
      jsonb_build_object(
        'amount', v_request.amount,
        'failure_reason', v_request.failure_reason,
        'method', v_request.method,
        'status', v_request.status,
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':dispatch_failed'),
      null
    );
  end if;

  return jsonb_build_object(
    'request_id', v_request.id,
    'status', v_request.status
  );
end;
$$;

create or replace function public.process_mobile_money_withdrawal_callback(
  p_request_id uuid default null,
  p_provider_name text default 'sasapay',
  p_provider_request_id text default null,
  p_provider_checkout_id text default null,
  p_provider_transaction_ref text default null,
  p_provider_channel text default null,
  p_provider_phone_number text default null,
  p_provider_amount numeric default null,
  p_provider_currency text default 'KES',
  p_provider_result_code text default null,
  p_provider_result_desc text default null,
  p_provider_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_provider_channel text := nullif(trim(coalesce(p_provider_channel, '')), '');
  v_provider_checkout_id text := nullif(trim(coalesce(p_provider_checkout_id, '')), '');
  v_provider_currency text := coalesce(nullif(trim(coalesce(p_provider_currency, '')), ''), 'KES');
  v_provider_name text := coalesce(nullif(trim(coalesce(p_provider_name, '')), ''), 'sasapay');
  v_provider_phone text := nullif(trim(coalesce(p_provider_phone_number, '')), '');
  v_provider_request_id text := nullif(trim(coalesce(p_provider_request_id, '')), '');
  v_provider_result_code text := nullif(trim(coalesce(p_provider_result_code, '')), '');
  v_provider_result_desc text := nullif(trim(coalesce(p_provider_result_desc, '')), '');
  v_provider_transaction_ref text := nullif(trim(coalesce(p_provider_transaction_ref, '')), '');
  v_request public.withdrawal_requests%rowtype;
begin
  if 'authenticated'::text <> 'service_role' then
    raise exception 'Only the service role can process mobile money withdrawal callbacks';
  end if;

  if p_request_id is null and v_provider_request_id is null and v_provider_checkout_id is null then
    raise exception 'A withdrawal request identifier is required';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where provider_name = 'sasapay'
    and (
      (p_request_id is not null and id = p_request_id)
      or (v_provider_request_id is not null and provider_request_id = v_provider_request_id)
      or (v_provider_checkout_id is not null and provider_checkout_id = v_provider_checkout_id)
    )
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Withdrawal request not found';
  end if;

  update public.withdrawal_requests
  set
    provider_amount = coalesce(p_provider_amount, provider_amount),
    provider_callback_received_at = v_now,
    provider_channel = coalesce(v_provider_channel, provider_channel),
    provider_checkout_id = coalesce(v_provider_checkout_id, provider_checkout_id),
    provider_currency = coalesce(v_provider_currency, provider_currency),
    provider_name = coalesce(v_provider_name, provider_name),
    provider_payload = coalesce(p_provider_payload, provider_payload, '{}'::jsonb),
    provider_phone_number = coalesce(v_provider_phone, provider_phone_number),
    provider_request_id = coalesce(v_provider_request_id, provider_request_id),
    provider_result_code = coalesce(v_provider_result_code, provider_result_code),
    provider_result_desc = coalesce(v_provider_result_desc, provider_result_desc),
    provider_status = case
      when v_provider_result_code is null then provider_status
      when v_provider_result_code = '0' then 'completed'
      else 'failed'
    end,
    provider_transaction_ref = coalesce(v_provider_transaction_ref, provider_transaction_ref),
    updated_at = v_now
  where id = v_request.id
  returning *
  into v_request;

  if v_request.status in ('completed', 'failed', 'rejected') then
    return jsonb_build_object(
      'request_id', v_request.id,
      'status', v_request.status,
      'succeeded', v_request.status = 'completed'
    );
  end if;

  if v_provider_result_code = '0' then
    update public.profiles
    set
      balance = greatest(0, coalesce(balance, 0) - v_request.amount),
      reserved_withdrawal_balance = greatest(0, coalesce(reserved_withdrawal_balance, 0) - v_request.amount),
      updated_at = v_now
    where id = v_request.user_id;

    update public.withdrawal_requests
    set
      admin_note = coalesce(admin_note, 'Completed by mobile money callback'),
      audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'action', 'completed',
          'created_at', v_now,
          'provider_result_code', v_provider_result_code
        )
      ),
      completed_at = v_now,
      failed_at = null,
      failure_reason = null,
      last_processing_error = null,
      processed_at = v_now,
      processed_by = null,
      status = 'completed',
      updated_at = v_now
    where id = v_request.id
    returning *
    into v_request;

    perform public.create_notification_internal(
      v_request.user_id,
      'withdrawal_completed',
      'Withdrawal completed',
      format(
        'Your M-PESA withdrawal of $%s was sent successfully.',
        trim(to_char(v_request.amount, 'FM999999990.00'))
      ),
      '/withdraw',
      jsonb_build_object(
        'amount', v_request.amount,
        'method', v_request.method,
        'provider', v_provider_name,
        'provider_amount', p_provider_amount,
        'provider_currency', v_provider_currency,
        'provider_phone_number', v_provider_phone,
        'provider_transaction_ref', v_provider_transaction_ref,
        'status', v_request.status,
        'withdrawal_request_id', v_request.id
      ),
      concat('withdrawal_request:', v_request.id::text, ':completed'),
      null
    );

    return jsonb_build_object(
      'request_id', v_request.id,
      'status', 'completed',
      'succeeded', true
    );
  end if;

  update public.withdrawal_requests
  set
    admin_note = coalesce(v_provider_result_desc, 'Mobile money payout failed'),
    audit_log = coalesce(audit_log, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'action', 'failed',
        'created_at', v_now,
        'provider_result_code', v_provider_result_code,
        'provider_result_desc', v_provider_result_desc
      )
    ),
    failed_at = v_now,
    failure_reason = coalesce(v_provider_result_desc, 'Mobile money payout failed'),
    last_processing_error = coalesce(v_provider_result_desc, 'Mobile money payout failed'),
    processed_at = v_now,
    processed_by = null,
    status = 'failed',
    updated_at = v_now
  where id = v_request.id
  returning *
  into v_request;

  update public.profiles
  set
    reserved_withdrawal_balance = greatest(0, coalesce(reserved_withdrawal_balance, 0) - v_request.amount),
    updated_at = v_now
  where id = v_request.user_id;

  perform public.create_notification_internal(
    v_request.user_id,
    'withdrawal_failed',
    'Withdrawal failed',
    format(
      'Your M-PESA withdrawal of $%s failed. The funds remain available in your balance. %s',
      trim(to_char(v_request.amount, 'FM999999990.00')),
      coalesce(v_provider_result_desc, 'Please try again later.')
    ),
    '/withdraw',
    jsonb_build_object(
      'amount', v_request.amount,
      'method', v_request.method,
      'provider', v_provider_name,
      'provider_amount', p_provider_amount,
      'provider_currency', v_provider_currency,
      'provider_phone_number', v_provider_phone,
      'provider_result_code', v_provider_result_code,
      'provider_result_desc', v_provider_result_desc,
      'status', v_request.status,
      'withdrawal_request_id', v_request.id
    ),
    concat('withdrawal_request:', v_request.id::text, ':failed'),
    null
  );

  return jsonb_build_object(
    'request_id', v_request.id,
    'status', 'failed',
    'succeeded', false
  );
end;
$$;

grant execute on function public.request_mobile_money_withdrawal(
  numeric,
  numeric,
  text,
  text,
  text,
  text
) to authenticated;

grant execute on function public.admin_review_mobile_money_withdrawal(
  uuid,
  text,
  text
) to authenticated;

grant execute on function public.claim_mobile_money_withdrawal(uuid) to service_role;

grant execute on function public.update_mobile_money_withdrawal_dispatch_state(
  uuid,
  text,
  text,
  timestamptz,
  jsonb,
  text,
  text
) to service_role;

grant execute on function public.process_mobile_money_withdrawal_callback(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text,
  jsonb
) to service_role;

-- ===== MIGRATION: 20260402000002_unlock_deposit_bonus_rules.sql =====
drop function if exists public.get_available_deposit_bonus_offers();

create or replace function public.get_available_deposit_bonus_offers()
returns table (
  id uuid,
  title text,
  description text,
  deposit_amount numeric,
  bonus_percent numeric,
  bonus_amount numeric,
  "position" integer,
  status text,
  is_new_user boolean,
  eligible boolean,
  already_used boolean,
  monthly_locked boolean,
  active_reservation boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_is_new_user boolean := false;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = current_setting('app.current_user_id', true)::uuid;

  if not found then
    raise exception 'Profile not found';
  end if;

  v_is_new_user := coalesce(v_profile.total_deposit, 0) <= 0;

  return query
  with offer_usage as (
    select
      o.id as offer_id,
      exists (
        select 1
        from public.deposit_bonus_redemptions r
        where r.user_id = current_setting('app.current_user_id', true)::uuid
          and r.bonus_offer_id = o.id
          and r.status in ('reserved', 'credited')
      ) as already_used
    from public.deposit_bonus_offers o
    where o.status = 'active'
  )
  select
    o.id,
    o.title,
    o.description,
    o.deposit_amount,
    o.bonus_percent,
    round(o.deposit_amount * (o.bonus_percent / 100.0), 2) as bonus_amount,
    o.position as "position",
    o.status,
    v_is_new_user as is_new_user,
    not usage.already_used as eligible,
    usage.already_used,
    false as monthly_locked,
    false as active_reservation,
    case
      when usage.already_used then 'Already used on this account'
      else null
    end as reason
  from public.deposit_bonus_offers o
  join offer_usage usage on usage.offer_id = o.id
  where o.status = 'active'
  order by o.position asc, o.deposit_amount asc, o.created_at asc;
end;
$$;

-- ===== MIGRATION: 20260501_trade_balance_audit_logs.sql =====
create table if not exists public.trade_balance_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trade_id uuid not null references public.trades(id) on delete cascade,
  event_type text not null check (event_type in ('trade_open', 'trade_close')),
  account_scope text not null check (account_scope in ('live', 'tournament')),
  asset_symbol text not null,
  direction text not null,
  status text,
  amount numeric not null default 0,
  payout_rate numeric not null default 0,
  profit numeric,
  change_amount numeric not null default 0,
  balance_before numeric not null default 0,
  balance_after numeric not null default 0,
  available_balance_before numeric not null default 0,
  available_balance_after numeric not null default 0,
  reserved_withdrawal_balance numeric not null default 0,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trade_balance_audit_logs_user_created_idx
  on public.trade_balance_audit_logs (user_id, created_at desc);

create index if not exists trade_balance_audit_logs_trade_created_idx
  on public.trade_balance_audit_logs (trade_id, created_at asc);

alter table public.trade_balance_audit_logs enable row level security;

drop policy if exists "trade_balance_audit_logs_select_own_or_staff" on public.trade_balance_audit_logs;
create policy "trade_balance_audit_logs_select_own_or_staff"
on public.trade_balance_audit_logs
for select
to authenticated
using (current_setting('app.current_user_id', true)::uuid = user_id or public.is_staff(current_setting('app.current_user_id', true)::uuid));

drop policy if exists "trade_balance_audit_logs_insert_own" on public.trade_balance_audit_logs;
create policy "trade_balance_audit_logs_insert_own"
on public.trade_balance_audit_logs
for insert
to authenticated
with check (current_setting('app.current_user_id', true)::uuid = user_id);

-- ===== MIGRATION: 20260512_enforce_demo_seed_not_live_balance.sql =====
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

-- ===== MIGRATION: 20260515000000_customer_reviews.sql =====
create table if not exists public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  reviewer_name text not null default 'Init Option trader',
  reviewer_uid text,
  avatar_url text,
  country text,
  rating integer not null default 5 check (rating between 1 and 5),
  review_text text not null check (char_length(trim(review_text)) between 3 and 1000),
  status text not null default 'approved' check (status in ('approved', 'pending', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_reviews enable row level security;

drop policy if exists "Anyone can read approved reviews" on public.customer_reviews;
drop policy if exists "Users can create reviews" on public.customer_reviews;
drop policy if exists "Admins can manage customer reviews" on public.customer_reviews;

create policy "Anyone can read approved reviews"
on public.customer_reviews
for select
to anon, authenticated
using (
  status = 'approved'
  or current_setting('app.current_user_id', true)::uuid = user_id
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'content_marketing_manager'::public.app_role)
);

create policy "Users can create reviews"
on public.customer_reviews
for insert
to anon, authenticated
with check (
  status = 'approved'
  and (user_id is null or current_setting('app.current_user_id', true)::uuid = user_id)
);

create policy "Admins can manage customer reviews"
on public.customer_reviews
for all
to authenticated
using (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'content_marketing_manager'::public.app_role)
)
with check (
  public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  or public.has_role(current_setting('app.current_user_id', true)::uuid, 'content_marketing_manager'::public.app_role)
);

create or replace function public.set_customer_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_customer_reviews_updated_at on public.customer_reviews;
create trigger set_customer_reviews_updated_at
before update on public.customer_reviews
for each row
execute function public.set_customer_reviews_updated_at();

-- ===== MIGRATION: 20260515000001_email_confirmation_link_flow.sql =====
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
  from public.users u
  where u.id = p_user_id;

  return v_confirmed_at is not null or v_platform_verified_at is not null;
end;
$$;

-- ===== MIGRATION: 20260515000002_profile_country_flags.sql =====
alter table public.profiles
  add column if not exists nationality text,
  add column if not exists phone_country text,
  add column if not exists phone_country_code text;

-- ===== MIGRATION: 20260516_set_bonus_turnover_10x_for_withdrawals.sql =====
-- Keep withdrawal eligibility aligned with the platform bonus terms.
-- The public site communicates 10x bonus turnover, so withdrawal RPCs should
-- enforce 10x instead of the older 30x requirement.

create or replace function public.request_withdrawal(
  p_amount numeric,
  p_method text,
  p_destination text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus_total numeric := 0;
  v_pending_exists boolean := false;
  v_profile public.profiles%rowtype;
  v_request public.withdrawal_requests%rowtype;
  v_require_kyc boolean := true;
  v_required_turnover numeric := 0;
  v_turnover_done numeric := 0;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Withdrawal amount must be positive';
  end if;

  if p_amount < 10 then
    raise exception 'Minimum withdrawal is $10';
  end if;

  if trim(coalesce(p_method, '')) = '' then
    raise exception 'Withdrawal method is required';
  end if;

  if trim(coalesce(p_destination, '')) = '' then
    raise exception 'Withdrawal destination is required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = current_setting('app.current_user_id', true)::uuid
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if coalesce(v_profile.balance, 0) < p_amount then
    raise exception 'Insufficient balance';
  end if;

  select ps.require_kyc_withdrawal
  into v_require_kyc
  from public.platform_settings ps
  order by ps.updated_at desc
  limit 1;

  if coalesce(v_require_kyc, true) and lower(coalesce(v_profile.kyc_status, '')) not in ('verified', 'approved') then
    raise exception 'Account verification is required before withdrawal';
  end if;

  select exists(
    select 1
    from public.withdrawal_requests wr
    where wr.user_id = current_setting('app.current_user_id', true)::uuid
      and wr.status = 'pending'
  )
  into v_pending_exists;

  if v_pending_exists then
    raise exception 'You already have a pending withdrawal request';
  end if;

  select coalesce(sum(coalesce(dr.welcome_bonus, 0) + coalesce(dr.deposit_bonus, 0) + coalesce(dr.promo_bonus, 0)), 0)
  into v_bonus_total
  from public.deposit_requests dr
  where dr.user_id = current_setting('app.current_user_id', true)::uuid
    and dr.status = 'approved';

  if v_bonus_total > 0 then
    v_required_turnover := round(v_bonus_total * 10, 2);

    select coalesce(sum(t.amount), 0)
    into v_turnover_done
    from public.trades t
    where t.user_id = current_setting('app.current_user_id', true)::uuid
      and t.status in ('won', 'lost', 'expired')
      and t.tournament_participant_id is null;

    if v_turnover_done < v_required_turnover then
      raise exception 'Bonus turnover requirement not met. Required volume: $%, completed: $%.',
        trim(to_char(v_required_turnover, 'FM999999990.00')),
        trim(to_char(v_turnover_done, 'FM999999990.00'));
    end if;
  end if;

  update public.profiles
  set
    balance = balance - p_amount,
    updated_at = now()
  where id = current_setting('app.current_user_id', true)::uuid;

  insert into public.withdrawal_requests (
    amount,
    destination,
    method,
    user_id
  )
  values (
    p_amount,
    trim(p_destination),
    trim(p_method),
    current_setting('app.current_user_id', true)::uuid
  )
  returning *
  into v_request;

  perform public.create_notification_internal(
    current_setting('app.current_user_id', true)::uuid,
    'withdrawal_requested',
    'Withdrawal request received',
    format(
      'Your withdrawal request for $%s was submitted and is now pending review.',
      trim(to_char(p_amount, 'FM999999990.00'))
    ),
    '/withdraw',
    jsonb_build_object(
      'amount', p_amount,
      'destination', trim(p_destination),
      'method', trim(p_method),
      'withdrawal_request_id', v_request.id
    ),
    concat('withdrawal_request:', v_request.id::text, ':requested'),
    null
  );

  return jsonb_build_object(
    'amount', v_request.amount,
    'destination', v_request.destination,
    'method', v_request.method,
    'request_id', v_request.id,
    'status', v_request.status
  );
end;
$$;

grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;

create or replace function public.request_mobile_money_withdrawal(
  p_amount numeric,
  p_amount_kes numeric,
  p_phone_number text,
  p_provider_channel text default '63902',
  p_request_ip text default null,
  p_request_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available_balance numeric := 0;
  v_bonus_total numeric := 0;
  v_phone_number text := nullif(trim(coalesce(p_phone_number, '')), '');
  v_profile public.profiles%rowtype;
  v_request public.withdrawal_requests%rowtype;
  v_require_kyc boolean := true;
  v_required_turnover numeric := 0;
  v_threshold_kes numeric := 10000;
  v_turnover_done numeric := 0;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Withdrawal amount must be positive';
  end if;

  if p_amount < 10 then
    raise exception 'Minimum withdrawal is $10';
  end if;

  if coalesce(p_amount_kes, 0) <= 0 then
    raise exception 'Withdrawal amount in KES must be positive';
  end if;

  if v_phone_number is null then
    raise exception 'A valid M-PESA number is required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = current_setting('app.current_user_id', true)::uuid
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if exists (
    select 1
    from public.withdrawal_requests wr
    where wr.user_id = current_setting('app.current_user_id', true)::uuid
      and wr.status = 'pending'
  ) then
    raise exception 'You already have a pending withdrawal request';
  end if;

  select
    coalesce(ps.require_kyc_withdrawal, true),
    coalesce(ps.mpesa_withdrawal_approval_threshold_kes, 10000)
  into
    v_require_kyc,
    v_threshold_kes
  from public.platform_settings ps
  order by ps.updated_at desc
  limit 1;

  if coalesce(v_require_kyc, true) and lower(coalesce(v_profile.kyc_status, '')) not in ('verified', 'approved') then
    raise exception 'Account verification is required before withdrawal';
  end if;

  select coalesce(sum(coalesce(dr.welcome_bonus, 0) + coalesce(dr.deposit_bonus, 0) + coalesce(dr.promo_bonus, 0)), 0)
  into v_bonus_total
  from public.deposit_requests dr
  where dr.user_id = current_setting('app.current_user_id', true)::uuid
    and dr.status = 'approved';

  if v_bonus_total > 0 then
    v_required_turnover := round(v_bonus_total * 10, 2);

    select coalesce(sum(t.amount), 0)
    into v_turnover_done
    from public.trades t
    where t.user_id = current_setting('app.current_user_id', true)::uuid
      and t.status in ('won', 'lost', 'expired')
      and t.tournament_participant_id is null;

    if v_turnover_done < v_required_turnover then
      raise exception 'Bonus turnover requirement not met. Required volume: $%, completed: $%.',
        trim(to_char(v_required_turnover, 'FM999999990.00')),
        trim(to_char(v_turnover_done, 'FM999999990.00'));
    end if;
  end if;

  v_available_balance := greatest(
    0,
    coalesce(v_profile.balance, 0) - coalesce(v_profile.reserved_withdrawal_balance, 0)
  );

  if v_available_balance < p_amount then
    raise exception 'Insufficient available balance';
  end if;

  update public.profiles
  set
    reserved_withdrawal_balance = coalesce(reserved_withdrawal_balance, 0) + p_amount,
    updated_at = now()
  where id = current_setting('app.current_user_id', true)::uuid;

  insert into public.withdrawal_requests (
    amount,
    approval_required,
    approval_threshold_kes,
    approved_at,
    auto_approved,
    audit_log,
    destination,
    merchant_ref,
    method,
    next_retry_at,
    provider_amount,
    provider_channel,
    provider_currency,
    provider_name,
    provider_phone_number,
    provider_status,
    queued_at,
    request_ip,
    request_user_agent,
    status,
    user_id
  )
  values (
    p_amount,
    p_amount_kes > v_threshold_kes,
    v_threshold_kes,
    case when p_amount_kes > v_threshold_kes then null else now() end,
    p_amount_kes <= v_threshold_kes,
    jsonb_build_array(
      jsonb_build_object(
        'action', 'requested',
        'actor_id', current_setting('app.current_user_id', true)::uuid,
        'amount', p_amount,
        'amount_kes', p_amount_kes,
        'created_at', now(),
        'status', case when p_amount_kes > v_threshold_kes then 'pending' else 'approved' end,
        'turnover_multiplier', 10
      )
    ),
    v_phone_number,
    concat('WITHDRAW_', replace(current_setting('app.current_user_id', true)::uuid::text, '-', ''), '_', floor(extract(epoch from clock_timestamp()) * 1000)::bigint),
    'M-PESA Mobile Money',
    now(),
    p_amount_kes,
    nullif(trim(coalesce(p_provider_channel, '')), ''),
    'KES',
    'sasapay',
    v_phone_number,
    case when p_amount_kes > v_threshold_kes then 'awaiting_approval' else 'queued' end,
    case when p_amount_kes > v_threshold_kes then null else now() end,
    nullif(trim(coalesce(p_request_ip, '')), ''),
    nullif(trim(coalesce(p_request_user_agent, '')), ''),
    case when p_amount_kes > v_threshold_kes then 'pending' else 'approved' end,
    current_setting('app.current_user_id', true)::uuid
  )
  returning *
  into v_request;

  perform public.create_notification_internal(
    current_setting('app.current_user_id', true)::uuid,
    'withdrawal_requested',
    'Withdrawal request received',
    format(
      'Your M-PESA withdrawal request for $%s was received and %s.',
      trim(to_char(p_amount, 'FM999999990.00')),
      case
        when v_request.status = 'pending' then 'is waiting for approval'
        else 'is queued for processing'
      end
    ),
    '/withdraw',
    jsonb_build_object(
      'amount', v_request.amount,
      'amount_kes', p_amount_kes,
      'approval_required', v_request.approval_required,
      'destination', v_request.destination,
      'method', v_request.method,
      'status', v_request.status,
      'withdrawal_request_id', v_request.id
    ),
    concat('withdrawal_request:', v_request.id::text, ':requested'),
    null
  );

  return jsonb_build_object(
    'amount', v_request.amount,
    'amount_kes', p_amount_kes,
    'approval_required', v_request.approval_required,
    'auto_approved', v_request.auto_approved,
    'masked_destination', v_request.destination,
    'request_id', v_request.id,
    'status', v_request.status
  );
end;
$$;

grant execute on function public.request_mobile_money_withdrawal(
  numeric,
  numeric,
  text,
  text,
  text,
  text
) to authenticated;

-- ===== MIGRATION: 20260523000000_lighten_auth_and_notification_bloat.sql =====
-- Keep auth and notification paths light while Supabase is under pressure.
-- Intentionally avoids index creation and cleanup deletes because overloaded
-- Supabase projects can time out on those operations in the SQL editor.

create or replace function public.is_email_verified_internal(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_confirmed_at timestamptz;
  v_email_confirmed_at timestamptz;
  v_platform_verified_at text;
begin
  select
    u.confirmed_at,
    u.email_confirmed_at,
    nullif(trim(u.raw_user_meta_data ->> 'platform_email_verified_at'), '')
  into
    v_confirmed_at,
    v_email_confirmed_at,
    v_platform_verified_at
  from public.users u
  where u.id = p_user_id;

  return v_platform_verified_at is not null
    or v_email_confirmed_at is not null
    or v_confirmed_at is not null;
end;
$$;

-- Trade-result notifications are hidden in the app and can grow very quickly.
-- Keep the trade ledger itself, but stop creating duplicate notification rows.
create or replace function public.notify_trade_result(p_trade_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade public.trades%rowtype;
begin
  if current_setting('app.current_user_id', true)::uuid is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_trade
  from public.trades
  where id = p_trade_id
    and user_id = current_setting('app.current_user_id', true)::uuid;

  if not found then
    raise exception 'Trade not found';
  end if;

  if v_trade.status = 'open' or v_trade.closed_at is null then
    raise exception 'Trade is still open';
  end if;

  return null;
end;
$$;

grant execute on function public.notify_trade_result(uuid) to authenticated;

-- ===== MIGRATION: 20260523000001_performance_hot_path_indexes.sql =====
-- Hot-path indexes for auth-adjacent profile reads, trade history, and admin dashboards.
-- These keep user/login follow-up queries and admin review screens from scanning growing tables.

create index if not exists profiles_created_at_desc_idx
  on public.profiles(created_at desc);

create index if not exists profiles_trade_count_30d_idx
  on public.profiles(trade_count_30d)
  where coalesce(trade_count_30d, 0) > 0;

create index if not exists profiles_kyc_status_created_idx
  on public.profiles(kyc_status, created_at desc);

create index if not exists trades_user_status_opened_idx
  on public.trades(user_id, status, opened_at desc);

create index if not exists trades_user_closed_history_idx
  on public.trades(user_id, closed_at desc)
  where status <> 'open' and closed_at is not null;

create index if not exists trades_status_opened_idx
  on public.trades(status, opened_at desc);

create index if not exists trades_opened_at_desc_idx
  on public.trades(opened_at desc);

create index if not exists trades_closed_at_desc_idx
  on public.trades(closed_at desc)
  where closed_at is not null;

create index if not exists deposit_requests_user_created_idx
  on public.deposit_requests(user_id, created_at desc);

create index if not exists deposit_requests_created_idx
  on public.deposit_requests(created_at desc);

create index if not exists withdrawal_requests_user_created_idx
  on public.withdrawal_requests(user_id, created_at desc);

create index if not exists withdrawal_requests_created_idx
  on public.withdrawal_requests(created_at desc);

create index if not exists notifications_user_unread_created_idx
  on public.notifications(user_id, is_read, created_at desc);

create index if not exists announcements_status_schedule_idx
  on public.announcements(status, scheduled_at, created_at desc);

create index if not exists tournament_participants_user_created_idx
  on public.tournament_participants(user_id, created_at desc);

analyze public.profiles;
analyze public.trades;
analyze public.deposit_requests;
analyze public.withdrawal_requests;
analyze public.notifications;
analyze public.announcements;
analyze public.tournament_participants;

-- ===== MIGRATION: 20260601000000_referral_code_collision_handling.sql =====
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

-- ===== MIGRATION: 20260601000001_referral_welcome_bonus.sql =====
alter table public.bonus_settings
  add column if not exists referred_deposit_bonus_percent numeric not null default 50;

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

-- ===== MIGRATION: 20260601000002_withdrawal_cancellation.sql =====
alter table public.withdrawal_requests
  add column if not exists cancelled_at timestamptz;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'withdrawal_requests_status_check'
  ) then
    alter table public.withdrawal_requests
      drop constraint withdrawal_requests_status_check;
  end if;

  alter table public.withdrawal_requests
    add constraint withdrawal_requests_status_check
    check (status in ('pending', 'approved', 'processing', 'completed', 'failed', 'rejected', 'cancelled'));
end
$$;

create or replace function public.cancel_withdrawal(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.withdrawal_requests%rowtype;
  v_user_id uuid;
  v_audit_entry jsonb;
begin
  v_user_id := current_setting('app.current_user_id', true)::uuid;
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_request
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found';
  end if;

  if v_request.user_id <> v_user_id then
    raise exception 'You can only cancel your own withdrawal requests';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Only pending withdrawal requests can be cancelled';
  end if;

  if v_request.provider_name = 'sasapay' then
    raise exception 'Mobile money withdrawals cannot be cancelled';
  end if;

  v_audit_entry := jsonb_build_object(
    'action', 'cancelled',
    'cancelled_at', now(),
    'cancelled_by', v_user_id
  );

  update public.withdrawal_requests
  set
    audit_log = coalesce(audit_log, '[]'::jsonb) || v_audit_entry,
    cancelled_at = now(),
    processed_at = now(),
    status = 'cancelled',
    updated_at = now()
  where id = v_request.id;

  update public.profiles
  set
    balance = balance + v_request.amount,
    updated_at = now()
  where id = v_request.user_id;

  perform public.create_notification_internal(
    v_request.user_id,
    'withdrawal_cancelled',
    'Withdrawal cancelled',
    format(
      'Your withdrawal of $%s was cancelled and the funds have been returned to your balance.',
      trim(to_char(v_request.amount, 'FM999999990.00'))
    ),
    '/withdraw',
    jsonb_build_object(
      'amount', v_request.amount,
      'method', v_request.method,
      'withdrawal_request_id', v_request.id
    ),
    concat('withdrawal_request:', v_request.id::text, ':cancelled'),
    null
  );

  return jsonb_build_object(
    'amount', v_request.amount,
    'request_id', v_request.id,
    'status', 'cancelled'
  );
end;
$$;

grant execute on function public.cancel_withdrawal(uuid) to authenticated;

-- ===== MIGRATION: 20260604_guides_content_management.sql =====
-- Guides content management system
-- Allows admins to manage trading guides, tutorials with images and videos

CREATE TABLE IF NOT EXISTS guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Platform',
  is_published BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS guide_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  section_title TEXT,
  section_order INTEGER DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'video', 'note'
  content_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guide_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  content_id UUID REFERENCES guide_content(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL, -- 'image', 'video', 'thumbnail'
  media_url TEXT NOT NULL,
  alt_text TEXT,
  file_size INTEGER,
  mime_type TEXT,
  storage_bucket TEXT DEFAULT 'guide-media',
  storage_path TEXT,
  youtube_url TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_guides_category ON guides(category);
CREATE INDEX idx_guides_slug ON guides(slug);
CREATE INDEX idx_guides_published ON guides(is_published);
CREATE INDEX idx_guide_content_guide ON guide_content(guide_id);
CREATE INDEX idx_guide_media_guide ON guide_media(guide_id);
CREATE INDEX idx_guide_media_content ON guide_media(content_id);

-- Enable RLS
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_media ENABLE ROW LEVEL SECURITY;

-- Policies for guides
CREATE POLICY "Allow reading published guides"
  ON guides FOR SELECT
  USING (
    is_published = true
    OR COALESCE((current_setting('app.clerk_user_metadata', true)::jsonb -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager')
  );

CREATE POLICY "Allow staff to manage guides"
  ON guides FOR ALL
  USING (COALESCE((current_setting('app.clerk_user_metadata', true)::jsonb -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager'))
  WITH CHECK (COALESCE((current_setting('app.clerk_user_metadata', true)::jsonb -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager'));

-- Policies for guide content
CREATE POLICY "Allow reading published guide content"
  ON guide_content FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM guides WHERE id = guide_id AND is_published = true)
    OR COALESCE((current_setting('app.clerk_user_metadata', true)::jsonb -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager')
  );

CREATE POLICY "Allow staff to manage guide content"
  ON guide_content FOR ALL
  USING (COALESCE((current_setting('app.clerk_user_metadata', true)::jsonb -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager'))
  WITH CHECK (COALESCE((current_setting('app.clerk_user_metadata', true)::jsonb -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager'));

-- Policies for guide media
CREATE POLICY "Allow reading media from published guides"
  ON guide_media FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM guides WHERE id = guide_id AND is_published = true)
    OR COALESCE((current_setting('app.clerk_user_metadata', true)::jsonb -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager')
  );

CREATE POLICY "Allow staff to manage guide media"
  ON guide_media FOR ALL
  USING (COALESCE((current_setting('app.clerk_user_metadata', true)::jsonb -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager'))
  WITH CHECK (COALESCE((current_setting('app.clerk_user_metadata', true)::jsonb -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager'));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_guide_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guides_timestamp BEFORE UPDATE ON guides
FOR EACH ROW EXECUTE FUNCTION update_guide_timestamp();

CREATE TRIGGER update_guide_content_timestamp BEFORE UPDATE ON guide_content
FOR EACH ROW EXECUTE FUNCTION update_guide_timestamp();

CREATE TRIGGER update_guide_media_timestamp BEFORE UPDATE ON guide_media
FOR EACH ROW EXECUTE FUNCTION update_guide_timestamp();

-- ===== MIGRATION: 20260613_context_logo_fields.sql =====
alter table if exists public.platform_settings
  add column if not exists logo_url_footer text not null default '',
  add column if not exists logo_url_dashboard text not null default '',
  add column if not exists logo_url_dashboard_light text not null default '',
  add column if not exists logo_url_dashboard_dark text not null default '',
  add column if not exists logo_url_landing_header text not null default '';

update public.platform_settings
set
  logo_url_footer = coalesce(logo_url_footer, ''),
  logo_url_dashboard = coalesce(logo_url_dashboard, ''),
  logo_url_dashboard_light = coalesce(logo_url_dashboard_light, ''),
  logo_url_dashboard_dark = coalesce(logo_url_dashboard_dark, ''),
  logo_url_landing_header = coalesce(logo_url_landing_header, ''),
  updated_at = now();

-- ===== MIGRATION: 20260615000000_add_copy_settings_stop_loss_expiry.sql =====
create table if not exists public.copy_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_user_id uuid not null references public.users(id) on delete cascade,
  enabled boolean not null default true,
  amount_type text not null default 'fixed',
  execution_mode text not null default 'automatic',
  fixed_amount numeric(12, 2),
  ratio numeric(12, 4),
  max_per_trade numeric(12, 2),
  max_daily numeric(12, 2),
  stop_loss_pct numeric,
  expiry_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint copy_settings_unique_pair unique (user_id, target_user_id),
  constraint copy_settings_not_self check (user_id <> target_user_id),
  constraint copy_settings_amount_type_check check (amount_type in ('fixed', 'ratio')),
  constraint copy_settings_execution_mode_check check (execution_mode in ('automatic', 'manual'))
);

alter table public.copy_settings
  add column if not exists stop_loss_pct numeric,
  add column if not exists expiry_date timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'copy_settings_stop_loss_pct_range'
      and conrelid = 'public.copy_settings'::regclass
  ) then
    alter table public.copy_settings
      add constraint copy_settings_stop_loss_pct_range
      check (stop_loss_pct is null or (stop_loss_pct >= 1 and stop_loss_pct <= 100));
  end if;
end $$;

create or replace function public.upsert_copy_setting(
  p_target_user_id uuid,
  p_enabled boolean default true,
  p_amount_type text default 'fixed',
  p_fixed_amount numeric default null,
  p_ratio numeric default null,
  p_max_per_trade numeric default null,
  p_max_daily numeric default null,
  p_execution_mode text default 'automatic',
  p_stop_loss_pct numeric default null,
  p_expiry_date timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := current_setting('app.current_user_id', true)::uuid;
  v_row public.copy_settings%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_target_user_id is null or p_target_user_id = v_user_id then
    raise exception 'Invalid copy target';
  end if;

  insert into public.copy_settings (
    user_id, target_user_id, enabled, amount_type, execution_mode,
    fixed_amount, ratio, max_per_trade, max_daily, stop_loss_pct, expiry_date
  )
  values (
    v_user_id, p_target_user_id,
    coalesce(p_enabled, true), coalesce(p_amount_type, 'fixed'), coalesce(p_execution_mode, 'automatic'),
    p_fixed_amount, p_ratio, p_max_per_trade, p_max_daily,
    p_stop_loss_pct, p_expiry_date
  )
  on conflict (user_id, target_user_id)
  do update set
    enabled = excluded.enabled,
    amount_type = excluded.amount_type,
    execution_mode = excluded.execution_mode,
    fixed_amount = excluded.fixed_amount,
    ratio = excluded.ratio,
    max_per_trade = excluded.max_per_trade,
    max_daily = excluded.max_daily,
    stop_loss_pct = excluded.stop_loss_pct,
    expiry_date = excluded.expiry_date,
    updated_at = now()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

do $$
begin
  execute 'revoke execute on function public.upsert_copy_setting(uuid, boolean, text, numeric, numeric, numeric, numeric, text) from authenticated';
exception when undefined_function then null;
end $$;
grant execute on function public.upsert_copy_setting(uuid, boolean, text, numeric, numeric, numeric, numeric, text, numeric, timestamptz) to authenticated;

-- ===== MIGRATION: 20260615000001_add_tournament_winners.sql =====
alter table public.tournaments
  add column if not exists number_of_winners integer default 1;

alter table public.tournaments
  alter column number_of_winners set default 1,
  alter column number_of_winners set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tournaments_number_of_winners_positive'
      and conrelid = 'public.tournaments'::regclass
  ) then
    alter table public.tournaments
      add constraint tournaments_number_of_winners_positive
      check (number_of_winners >= 1);
  end if;
end
$$;

-- ===== (removed) 20260618000000_guide_media_storage_bucket.sql: storage buckets -> Cloudinary =====

-- ===== MIGRATION: 20260618000001_landing_page_logo.sql =====
alter table public.platform_settings
  add column if not exists landing_logo_url text not null default '';

-- ===== MIGRATION: 20260618000002_promo_materials.sql =====
-- Create promo_materials table for managing promotional banner materials
create table if not exists public.promo_materials (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  file_url text not null,
  file_size bigint not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.promo_materials enable row level security;

-- Create policies for admin access
create policy "Admin can view promo materials"
  on public.promo_materials
  for select
  using (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  );

create policy "Admin can insert promo materials"
  on public.promo_materials
  for insert
  with check (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  );

create policy "Admin can update promo materials"
  on public.promo_materials
  for update
  using (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  );

create policy "Admin can delete promo materials"
  on public.promo_materials
  for delete
  using (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
  );

-- Allow non-authenticated users to read promo materials for marketing purposes
create policy "Anyone can view promo materials"
  on public.promo_materials
  for select
  using (true);

-- Create index on created_at for sorting
create index if not exists idx_promo_materials_created_at 
  on public.promo_materials(created_at desc);

-- ===== MIGRATION: 20260618000003_simplify_logo_columns.sql =====
-- Simplify logo system to a single logo_url column.
-- Remove all variant and context-specific logo columns.

alter table public.platform_settings
  drop column if exists logo_url_light,
  drop column if exists logo_url_dark,
  drop column if exists logo_url_footer,
  drop column if exists logo_url_dashboard,
  drop column if exists logo_url_dashboard_light,
  drop column if exists logo_url_dashboard_dark,
  drop column if exists logo_url_landing_header;

-- ===== MIGRATION: 20260626_referral_commissions_table.sql =====
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
  using (current_setting('app.current_user_id', true)::uuid = referrer_id);

create policy "Admins can view all referral commissions"
  on public.referral_commissions for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = current_setting('app.current_user_id', true)::uuid and role = 'admin'::public.app_role
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

-- ===== MIGRATION: 20260627000000_tournament_enhancements.sql =====
-- 1. Add prize_distribution column for configurable payout splits
alter table public.tournaments
  add column if not exists prize_distribution jsonb default '[]'::jsonb;

-- 2. Widen tournament_payouts placement constraint to support configurable winners
alter table public.tournament_payouts
  drop constraint if exists tournament_payouts_placement_check;

alter table public.tournament_payouts
  add constraint tournament_payouts_placement_check
  check (placement >= 1);

-- 3. Index for leaderboard queries
create index if not exists idx_tournament_participants_balance_desc
  on public.tournament_participants (tournament_id, current_balance desc);

-- 4. Leaderboard query function with P/L and return %
drop function if exists public.get_tournament_leaderboard(uuid);
create or replace function public.get_tournament_leaderboard(p_tournament_id uuid)
returns table (
  "position" bigint,
  user_id uuid,
  trader_name text,
  avatar_url text,
  country_code text,
  current_balance numeric,
  starting_balance numeric,
  profit_loss numeric,
  return_percentage numeric,
  trades_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    row_number() over (
      order by tp.current_balance desc, tp.updated_at asc, tp.created_at asc
    )::bigint as "position",
    tp.user_id,
    coalesce(
      nullif(p.display_name, ''),
      nullif(p.username, ''),
      'User-' || upper(substring(tp.user_id::text from 1 for 6))
    ) as trader_name,
    p.avatar_url,
    upper(nullif(trim(p.phone_country), '')) as country_code,
    tp.current_balance,
    t.starting_balance,
    (tp.current_balance - t.starting_balance) as profit_loss,
    case
      when t.starting_balance > 0
      then round(((tp.current_balance - t.starting_balance) / t.starting_balance) * 100, 2)
      else 0
    end as return_percentage,
    coalesce((
      select count(*)::bigint
      from public.trades tr
      where tr.tournament_participant_id = tp.id
    ), 0) as trades_count
  from public.tournament_participants tp
  join public.tournaments t on t.id = tp.tournament_id
  join public.profiles p on p.id = tp.user_id
  where tp.tournament_id = p_tournament_id
  order by tp.current_balance desc, tp.updated_at asc, tp.created_at asc;
end;
$$;

grant execute on function public.get_tournament_leaderboard(uuid) to authenticated, anon;

-- 5. Update award function to use dynamic prize_distribution
create or replace function public.award_tournament_prizes_internal(p_tournament_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament public.tournaments%rowtype;
  v_share numeric;
  v_awarded integer := 0;
  v_ranked record;
  v_inserted_payout_id uuid;
  v_distribution jsonb;
  v_dist_entry jsonb;
  v_max_placements integer;
begin
  select *
  into v_tournament
  from public.tournaments
  where id = p_tournament_id;

  if not found or coalesce(v_tournament.prize_pool, 0) <= 0 then
    return 0;
  end if;

  v_distribution := v_tournament.prize_distribution;

  if v_distribution is null or jsonb_array_length(v_distribution) = 0 then
    v_distribution := '[{"position": 1, "share": 0.50}, {"position": 2, "share": 0.30}, {"position": 3, "share": 0.20}]'::jsonb;
  end if;

  v_max_placements := jsonb_array_length(v_distribution);

  for v_ranked in
    with ranked as (
      select
        tp.id as participant_id,
        tp.user_id,
        tp.current_balance,
        row_number() over (
          order by tp.current_balance desc, tp.updated_at asc, tp.created_at asc
        ) as placement
      from public.tournament_participants tp
      where tp.tournament_id = p_tournament_id
    )
    select *
    from ranked
    where placement <= v_max_placements
    order by placement asc
  loop
    v_share := 0;

    for v_dist_entry in select * from jsonb_array_elements(v_distribution)
    loop
      if (v_dist_entry->>'position')::int = v_ranked.placement then
        v_share := (v_dist_entry->>'share')::numeric;
        exit;
      end if;
    end loop;

    if v_share <= 0 then
      continue;
    end if;

    insert into public.tournament_payouts (
      tournament_id,
      participant_id,
      user_id,
      placement,
      amount
    )
    values (
      p_tournament_id,
      v_ranked.participant_id,
      v_ranked.user_id,
      v_ranked.placement,
      round(v_tournament.prize_pool * v_share, 2)
    )
    on conflict (tournament_id, user_id)
    do nothing
    returning id into v_inserted_payout_id;

    if v_inserted_payout_id is null then
      continue;
    end if;

    update public.profiles
    set
      balance = balance + round(v_tournament.prize_pool * v_share, 2),
      updated_at = now()
    where id = v_ranked.user_id;

    perform public.create_notification_internal(
      v_ranked.user_id,
      'tournament_prize',
      'Tournament prize awarded',
      format(
        'You finished #%s in %s and won $%s.',
        v_ranked.placement,
        v_tournament.title,
        trim(to_char(round(v_tournament.prize_pool * v_share, 2), 'FM999999990.00'))
      ),
      '/trade',
      jsonb_build_object(
        'amount', round(v_tournament.prize_pool * v_share, 2),
        'placement', v_ranked.placement,
        'tournament_id', v_tournament.id,
        'tournament_title', v_tournament.title
      ),
      concat('tournament_prize:', v_tournament.id::text, ':', v_ranked.user_id::text),
      null
    );

    v_awarded := v_awarded + 1;
  end loop;

  return v_awarded;
end;
$$;

-- ===== MIGRATION: 20260627000001_welcome_bonus_min_deposit_30.sql =====
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
  v_platform_settings record;
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

  if p_amount >= 30
    and v_is_first_deposit
    and v_profile.welcome_bonus_granted_at is null then
    v_welcome_bonus := floor(p_amount * 0.5 * 100) / 100;
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
      format('Welcome! You''ve received a 50%% welcome bonus of $%s on your deposit. Start trading now!', trim(to_char(v_welcome_bonus, 'FM999999990.00'))),
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

-- ===== MIGRATION: 20260805_guides_content_secure_rls.sql =====
-- Fix insecure RLS on guides content tables.
-- The original migration (20260604_guides_content_management.sql) referenced
-- current_setting('app.clerk_user_metadata', true)::jsonb -> 'user_metadata' ->> 'role', which is end-user-editable and
-- therefore MUST NOT be trusted in a security context. Replace those checks with
-- the server-authoritative user_roles table (admin + content_marketing_manager),
-- matching the convention used by promo_materials, customer_reviews, etc.

-- A user is considered "staff" for guide management if they hold the admin or
-- content_marketing_manager role. user_roles rows are written only by trusted
-- server-side code (assign_staff_role RPC / admin UI), never from the client.

-- ── guides ──
DROP POLICY IF EXISTS "Allow reading published guides" ON guides;
DROP POLICY IF EXISTS "Allow staff to manage guides" ON guides;

CREATE POLICY "Allow reading published guides"
  ON guides FOR SELECT
  USING (
    is_published = true
    OR public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    OR public.has_role(current_setting('app.current_user_id', true)::uuid, 'content_marketing_manager'::public.app_role)
  );

CREATE POLICY "Allow staff to manage guides"
  ON guides FOR ALL
  USING (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    OR public.has_role(current_setting('app.current_user_id', true)::uuid, 'content_marketing_manager'::public.app_role)
  )
  WITH CHECK (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    OR public.has_role(current_setting('app.current_user_id', true)::uuid, 'content_marketing_manager'::public.app_role)
  );

-- ── guide_content ──
DROP POLICY IF EXISTS "Allow reading published guide content" ON guide_content;
DROP POLICY IF EXISTS "Allow staff to manage guide content" ON guide_content;

CREATE POLICY "Allow reading published guide content"
  ON guide_content FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM guides WHERE id = guide_content.guide_id AND is_published = true)
    OR public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    OR public.has_role(current_setting('app.current_user_id', true)::uuid, 'content_marketing_manager'::public.app_role)
  );

CREATE POLICY "Allow staff to manage guide content"
  ON guide_content FOR ALL
  USING (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    OR public.has_role(current_setting('app.current_user_id', true)::uuid, 'content_marketing_manager'::public.app_role)
  )
  WITH CHECK (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    OR public.has_role(current_setting('app.current_user_id', true)::uuid, 'content_marketing_manager'::public.app_role)
  );

-- ── guide_media ──
DROP POLICY IF EXISTS "Allow reading media from published guides" ON guide_media;
DROP POLICY IF EXISTS "Allow staff to manage guide media" ON guide_media;

CREATE POLICY "Allow reading media from published guides"
  ON guide_media FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM guides WHERE id = guide_media.guide_id AND is_published = true)
    OR public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    OR public.has_role(current_setting('app.current_user_id', true)::uuid, 'content_marketing_manager'::public.app_role)
  );

CREATE POLICY "Allow staff to manage guide media"
  ON guide_media FOR ALL
  USING (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    OR public.has_role(current_setting('app.current_user_id', true)::uuid, 'content_marketing_manager'::public.app_role)
  )
  WITH CHECK (
    public.has_role(current_setting('app.current_user_id', true)::uuid, 'admin'::public.app_role)
    OR public.has_role(current_setting('app.current_user_id', true)::uuid, 'content_marketing_manager'::public.app_role)
  );
