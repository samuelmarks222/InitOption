create or replace function public.admin_update_announcement(
  p_announcement_id uuid,
  p_title text,
  p_message text,
  p_target_roles jsonb default '{"all": true}'::jsonb,
  p_link_url text default null,
  p_scheduled_at timestamp with time zone default null,
  p_expires_at timestamp with time zone default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.announcements%rowtype;
  v_status text;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Only admins can update announcements';
  end if;

  if trim(coalesce(p_title, '')) = '' then
    raise exception 'Title is required';
  end if;

  if trim(coalesce(p_message, '')) = '' then
    raise exception 'Message is required';
  end if;

  select *
  into v_existing
  from public.announcements
  where id = p_announcement_id
  for update;

  if not found then
    raise exception 'Announcement not found';
  end if;

  if v_existing.status = 'sent' then
    v_status := 'sent';
  elsif p_scheduled_at is not null and p_scheduled_at > now() then
    v_status := 'scheduled';
  else
    v_status := 'sent';
  end if;

  update public.announcements
  set
    title = trim(p_title),
    message = trim(p_message),
    link_url = nullif(trim(coalesce(p_link_url, '')), ''),
    target_roles = coalesce(p_target_roles, '{"all": true}'::jsonb),
    scheduled_at = p_scheduled_at,
    expires_at = p_expires_at,
    status = v_status,
    sent_at = case
      when v_existing.status = 'sent' then coalesce(v_existing.sent_at, now())
      when v_status = 'sent' then now()
      else null
    end
  where id = p_announcement_id;

  if v_existing.status = 'sent' then
    update public.notifications
    set
      title = trim(p_title),
      message = trim(p_message),
      link_url = nullif(trim(coalesce(p_link_url, '')), ''),
      expires_at = p_expires_at,
      data = jsonb_build_object(
        'announcement_id', p_announcement_id,
        'target', coalesce(p_target_roles, '{"all": true}'::jsonb)
      )
    where external_key = concat('announcement:', p_announcement_id::text);
  elsif v_status = 'sent' then
    perform public.dispatch_announcement_internal(p_announcement_id);
  end if;

  return p_announcement_id;
end;
$$;

create or replace function public.admin_delete_announcement(
  p_announcement_id uuid,
  p_delete_dispatched_notifications boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_notifications integer := 0;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Only admins can delete announcements';
  end if;

  if not exists (
    select 1
    from public.announcements
    where id = p_announcement_id
  ) then
    raise exception 'Announcement not found';
  end if;

  if coalesce(p_delete_dispatched_notifications, true) then
    delete from public.notifications
    where external_key = concat('announcement:', p_announcement_id::text);
    get diagnostics v_deleted_notifications = row_count;
  end if;

  delete from public.announcements
  where id = p_announcement_id;

  return jsonb_build_object(
    'announcement_id', p_announcement_id,
    'deleted_notifications', v_deleted_notifications
  );
end;
$$;

grant execute on function public.admin_update_announcement(
  uuid,
  text,
  text,
  jsonb,
  text,
  timestamp with time zone,
  timestamp with time zone
) to authenticated;

grant execute on function public.admin_delete_announcement(uuid, boolean) to authenticated;
