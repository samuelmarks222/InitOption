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
