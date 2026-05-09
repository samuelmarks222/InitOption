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
