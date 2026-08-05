alter table public.platform_settings
  add column if not exists landing_logo_url text not null default '';
