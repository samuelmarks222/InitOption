alter table if exists public.platform_settings
  add column if not exists chart_up_color text not null default '#00C076',
  add column if not exists chart_down_color text not null default '#F6465D',
  add column if not exists chart_bg_color text not null default '#0E1217',
  add column if not exists site_title text not null default '',
  add column if not exists meta_description text not null default '',
  add column if not exists meta_keywords text not null default '',
  add column if not exists og_title text not null default '',
  add column if not exists og_description text not null default '',
  add column if not exists og_image_url text not null default '',
  add column if not exists twitter_card_type text not null default 'summary_large_image',
  add column if not exists twitter_title text not null default '',
  add column if not exists twitter_description text not null default '',
  add column if not exists twitter_image_url text not null default '',
  add column if not exists canonical_url text not null default '',
  add column if not exists robots_directive text not null default 'index, follow',
  add column if not exists custom_meta_tags text not null default '';

do $$
begin
  if to_regclass('public.platform_settings') is not null then
    update public.platform_settings
    set
      chart_up_color = coalesce(nullif(chart_up_color, ''), '#00C076'),
      chart_down_color = coalesce(nullif(chart_down_color, ''), '#F6465D'),
      chart_bg_color = coalesce(nullif(chart_bg_color, ''), '#0E1217'),
      site_title = coalesce(site_title, ''),
      meta_description = coalesce(meta_description, ''),
      meta_keywords = coalesce(meta_keywords, ''),
      og_title = coalesce(og_title, ''),
      og_description = coalesce(og_description, ''),
      og_image_url = coalesce(og_image_url, ''),
      twitter_card_type = case
        when twitter_card_type in ('summary', 'summary_large_image') then twitter_card_type
        else 'summary_large_image'
      end,
      twitter_title = coalesce(twitter_title, ''),
      twitter_description = coalesce(twitter_description, ''),
      twitter_image_url = coalesce(twitter_image_url, ''),
      canonical_url = coalesce(canonical_url, ''),
      robots_directive = coalesce(nullif(robots_directive, ''), 'index, follow'),
      custom_meta_tags = coalesce(custom_meta_tags, '');
  end if;
end
$$;
