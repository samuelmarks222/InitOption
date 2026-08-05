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
