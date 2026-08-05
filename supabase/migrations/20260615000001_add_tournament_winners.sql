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
