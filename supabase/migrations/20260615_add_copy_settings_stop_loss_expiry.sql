alter table public.copy_settings
  add column if not exists stop_loss_pct numeric,
  add column if not exists expiry_date timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'copy_settings_stop_loss_pct_range'
      and conrelid = 'public.copy_settings'::regclass
  ) then
    alter table public.copy_settings
      add constraint copy_settings_stop_loss_pct_range
      check (stop_loss_pct is null or (stop_loss_pct >= 1 and stop_loss_pct <= 100));
  end if;
end $$;

create or replace function public.upsert_copy_setting(
  p_target_user_id uuid,
  p_enabled boolean default true,
  p_amount_type text default 'fixed',
  p_fixed_amount numeric default null,
  p_ratio numeric default null,
  p_max_per_trade numeric default null,
  p_max_daily numeric default null,
  p_execution_mode text default 'automatic',
  p_stop_loss_pct numeric default null,
  p_expiry_date timestamptz default null
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
    user_id, target_user_id, enabled, amount_type, execution_mode,
    fixed_amount, ratio, max_per_trade, max_daily, stop_loss_pct, expiry_date
  )
  values (
    v_user_id, p_target_user_id,
    coalesce(p_enabled, true), coalesce(p_amount_type, 'fixed'), coalesce(p_execution_mode, 'automatic'),
    p_fixed_amount, p_ratio, p_max_per_trade, p_max_daily,
    p_stop_loss_pct, p_expiry_date
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
    stop_loss_pct = excluded.stop_loss_pct,
    expiry_date = excluded.expiry_date,
    updated_at = now()
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke execute on function public.upsert_copy_setting(uuid, boolean, text, numeric, numeric, numeric, numeric, text) from authenticated;
grant execute on function public.upsert_copy_setting(uuid, boolean, text, numeric, numeric, numeric, numeric, text, numeric, timestamptz) to authenticated;
