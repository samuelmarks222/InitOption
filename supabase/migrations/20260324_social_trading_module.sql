create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists followers_count integer not null default 0,
  add column if not exists following_count integer not null default 0,
  add column if not exists social_trading_disabled boolean not null default false;

alter table public.trades
  add column if not exists source_trade_id uuid references public.trades(id) on delete set null,
  add column if not exists copied_from_user_id uuid references auth.users(id) on delete set null,
  add column if not exists copy_setting_id uuid,
  add column if not exists trade_context text not null default 'manual';

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint follows_not_self check (follower_id <> followed_id)
);

create table if not exists public.copy_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
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
  v_follower_id uuid := auth.uid();
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
  v_follower_id uuid := auth.uid();
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
  v_user_id uuid := auth.uid();
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
  where user_id = auth.uid()
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
  v_user_id uuid := auth.uid();
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
with check (auth.uid() = follower_id);

drop policy if exists "follows_delete_self" on public.follows;
create policy "follows_delete_self"
on public.follows
for delete
to authenticated
using (auth.uid() = follower_id or public.is_staff(auth.uid()));

drop policy if exists "copy_settings_select_own" on public.copy_settings;
create policy "copy_settings_select_own"
on public.copy_settings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "copy_settings_insert_own" on public.copy_settings;
create policy "copy_settings_insert_own"
on public.copy_settings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "copy_settings_update_own" on public.copy_settings;
create policy "copy_settings_update_own"
on public.copy_settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "copy_settings_delete_own" on public.copy_settings;
create policy "copy_settings_delete_own"
on public.copy_settings
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "social_feed_select_own" on public.social_feed;
create policy "social_feed_select_own"
on public.social_feed
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "social_feed_update_own" on public.social_feed;
create policy "social_feed_update_own"
on public.social_feed
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
      and c.relname = 'social_feed'
  ) then
    alter publication supabase_realtime add table public.social_feed;
  end if;
end $$;

grant execute on function public.follow_trader(uuid) to authenticated;
grant execute on function public.unfollow_trader(uuid) to authenticated;
grant execute on function public.upsert_copy_setting(uuid, boolean, text, numeric, numeric, numeric, numeric, text) to authenticated;
grant execute on function public.delete_copy_setting(uuid) to authenticated;
grant execute on function public.execute_manual_copy_trade(uuid, uuid) to authenticated;
grant execute on function public.process_social_trade_open(uuid) to authenticated;
grant execute on function public.process_social_trade_close(uuid) to authenticated;
