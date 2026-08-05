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
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default 'General support',
  category text not null default 'General',
  status text not null default 'open' check (status in ('open', 'pending', 'resolved')),
  assigned_role public.app_role,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_threads
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
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
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null default 'user' check (sender_role in ('user', 'staff', 'system')),
  sender_name text not null default 'Support',
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.support_messages
  add column if not exists thread_id uuid references public.support_threads(id) on delete cascade,
  add column if not exists sender_id uuid references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'General',
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'pending', 'resolved')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
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
using (auth.uid() = user_id or public.is_staff(auth.uid()));

create policy "support_threads_insert"
on public.support_threads
for insert
to authenticated
with check (auth.uid() = user_id or public.is_staff(auth.uid()));

create policy "support_threads_update_staff"
on public.support_threads
for update
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

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
      and (st.user_id = auth.uid() or public.is_staff(auth.uid()))
  )
);

create policy "support_messages_insert"
on public.support_messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.support_threads st
    where st.id = thread_id
      and (
        st.user_id = auth.uid()
        or public.is_staff(auth.uid())
      )
  )
  and (
    (sender_role = 'user' and exists (
      select 1
      from public.support_threads st
      where st.id = thread_id
        and st.user_id = auth.uid()
    ))
    or (sender_role in ('staff', 'system') and public.is_staff(auth.uid()))
  )
);

drop policy if exists "support_tickets_select" on public.support_tickets;
drop policy if exists "support_tickets_insert" on public.support_tickets;
drop policy if exists "support_tickets_update_staff" on public.support_tickets;

create policy "support_tickets_select"
on public.support_tickets
for select
to authenticated
using (auth.uid() = user_id or public.is_staff(auth.uid()));

create policy "support_tickets_insert"
on public.support_tickets
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "support_tickets_update_staff"
on public.support_tickets
for update
to authenticated
using (public.is_staff(auth.uid()))
with check (public.is_staff(auth.uid()));

drop policy if exists "Admins can view all roles" on public.user_roles;
create policy "Admins can view all roles"
on public.user_roles
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role));

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
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
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
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Only super admins can revoke staff roles';
  end if;

  if auth.uid() = p_user_id then
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

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'support_threads'
  ) then
    alter publication supabase_realtime add table public.support_threads;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'support_messages'
  ) then
    alter publication supabase_realtime add table public.support_messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'support_tickets'
  ) then
    alter publication supabase_realtime add table public.support_tickets;
  end if;
end $$;
