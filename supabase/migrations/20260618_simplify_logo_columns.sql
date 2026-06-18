-- Simplify logo system to a single logo_url column.
-- Remove all variant and context-specific logo columns.

alter table public.platform_settings
  drop column if exists logo_url_light,
  drop column if exists logo_url_dark,
  drop column if exists logo_url_footer,
  drop column if exists logo_url_dashboard,
  drop column if exists logo_url_dashboard_light,
  drop column if exists logo_url_dashboard_dark,
  drop column if exists logo_url_landing_header;
