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
