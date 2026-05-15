alter table public.profiles
  add column if not exists nationality text,
  add column if not exists phone_country text,
  add column if not exists phone_country_code text;
