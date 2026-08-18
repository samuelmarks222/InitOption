-- Preferred/local display currency for each user's account.
-- Used to display balances, deposits, withdrawals, trades, payouts and
-- transaction history in the user's chosen currency. Falls back to USD.
alter table public.profiles
  add column if not exists preferred_currency text default 'USD';