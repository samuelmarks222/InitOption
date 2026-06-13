-- Clear old generic logos so fallback chain doesn't pick them up
update public.platform_settings
set
  logo_url = '',
  logo_url_light = '',
  logo_url_dark = '',
  updated_at = now();
