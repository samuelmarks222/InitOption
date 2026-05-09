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
