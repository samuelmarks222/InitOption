-- Grant staff roles to the platform owner (samuelmarks222@gmail.com).
-- Run once in the Neon/PostgreSQL SQL editor. Safe to re-run.
do $$
declare
  v_user_id uuid;
  v_roles public.app_role[] := array['admin'::public.app_role, 'finance_manager'::public.app_role, 'support_agent'::public.app_role];
  v_role public.app_role;
begin
  select id into v_user_id
  from public.users
  where lower(email) = lower('samuelmarks222@gmail.com')
  limit 1;

  if v_user_id is null then
    raise notice 'No public.users row found for samuelmarks222@gmail.com; sign in once so the account row exists, then re-run this script.';
  else
    foreach v_role in array v_roles loop
      insert into public.user_roles (user_id, role)
      values (v_user_id, v_role)
      on conflict (user_id, role) do nothing;
    end loop;

    raise notice 'Roles granted to user % (samuelmarks222@gmail.com): admin, finance_manager, support_agent', v_user_id;
  end if;
end $$;