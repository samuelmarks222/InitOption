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
using (auth.uid() = user_id or public.is_staff(auth.uid()));

drop policy if exists "trade_balance_audit_logs_insert_own" on public.trade_balance_audit_logs;
create policy "trade_balance_audit_logs_insert_own"
on public.trade_balance_audit_logs
for insert
to authenticated
with check (auth.uid() = user_id);
