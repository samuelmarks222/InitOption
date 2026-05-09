alter table if exists public.platform_settings
  add column if not exists website_content text not null default '';

update public.platform_settings
set website_content = coalesce(website_content, '')
where website_content is null;
