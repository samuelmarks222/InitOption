alter table if exists public.platform_settings
  add column if not exists logo_url_footer text not null default '',
  add column if not exists logo_url_dashboard text not null default '',
  add column if not exists logo_url_dashboard_light text not null default '',
  add column if not exists logo_url_dashboard_dark text not null default '',
  add column if not exists logo_url_landing_header text not null default '';

update public.platform_settings
set
  logo_url_footer = coalesce(logo_url_footer, ''),
  logo_url_dashboard = coalesce(logo_url_dashboard, ''),
  logo_url_dashboard_light = coalesce(logo_url_dashboard_light, ''),
  logo_url_dashboard_dark = coalesce(logo_url_dashboard_dark, ''),
  logo_url_landing_header = coalesce(logo_url_landing_header, ''),
  updated_at = now();
