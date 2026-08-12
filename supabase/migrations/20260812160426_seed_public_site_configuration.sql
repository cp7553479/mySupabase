insert into public.site_locales (
  code, display_name, native_name, url_prefix, fallback_locale_code, is_default, is_active, sort_order
)
values
  ('en', 'English', 'English', 'en', null, true, true, 10),
  ('zh', 'Chinese', '中文', 'zh', 'en', false, true, 20)
on conflict (code) do update set
  display_name = excluded.display_name,
  native_name = excluded.native_name,
  url_prefix = excluded.url_prefix,
  fallback_locale_code = excluded.fallback_locale_code,
  is_default = excluded.is_default,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

insert into public.site_settings (
  id, site_name, legal_name, website_url, contact_email, contact_phone,
  business_hours, default_seo_title, default_seo_description
)
values (
  true,
  'LogoPress',
  'LogoPress Trading Inc.',
  'https://logopress.example',
  'hello@logopress.example',
  null,
  'Monday to Friday, 09:00–18:00',
  'LogoPress | Custom products for business',
  'A B2B catalogue for custom products, clear quantity pricing and structured enquiries.'
)
on conflict (id) do update set
  site_name = excluded.site_name,
  legal_name = excluded.legal_name,
  website_url = excluded.website_url,
  contact_email = excluded.contact_email,
  contact_phone = excluded.contact_phone,
  business_hours = excluded.business_hours,
  default_seo_title = excluded.default_seo_title,
  default_seo_description = excluded.default_seo_description;

insert into public.navigation_menus (id, code, placement, status, published_at)
values
  ('e1ce1000-0000-4000-8000-000000000001', 'primary', 'header', 'published', now()),
  ('e1ce1000-0000-4000-8000-000000000002', 'footer_catalogue', 'footer', 'published', now()),
  ('e1ce1000-0000-4000-8000-000000000003', 'footer_company', 'footer', 'published', now())
on conflict (id) do update set
  code = excluded.code,
  placement = excluded.placement,
  status = excluded.status,
  published_at = excluded.published_at;

insert into public.navigation_items (id, menu_id, target_type, target_path, sort_order)
values
  ('e1ce2000-0000-4000-8000-000000000001', 'e1ce1000-0000-4000-8000-000000000001', 'path', '/products', 10),
  ('e1ce2000-0000-4000-8000-000000000002', 'e1ce1000-0000-4000-8000-000000000001', 'path', '/services', 20),
  ('e1ce2000-0000-4000-8000-000000000003', 'e1ce1000-0000-4000-8000-000000000001', 'path', '/insights', 30),
  ('e1ce2000-0000-4000-8000-000000000004', 'e1ce1000-0000-4000-8000-000000000001', 'path', '/about', 40),
  ('e1ce2000-0000-4000-8000-000000000005', 'e1ce1000-0000-4000-8000-000000000002', 'path', '/products', 10),
  ('e1ce2000-0000-4000-8000-000000000006', 'e1ce1000-0000-4000-8000-000000000002', 'path', '/inquiry', 20),
  ('e1ce2000-0000-4000-8000-000000000007', 'e1ce1000-0000-4000-8000-000000000003', 'path', '/about', 10),
  ('e1ce2000-0000-4000-8000-000000000008', 'e1ce1000-0000-4000-8000-000000000003', 'path', '/contact', 20)
on conflict (id) do update set
  menu_id = excluded.menu_id,
  target_type = excluded.target_type,
  target_path = excluded.target_path,
  sort_order = excluded.sort_order;

insert into public.navigation_item_translations (navigation_item_id, locale, label)
values
  ('e1ce2000-0000-4000-8000-000000000001', 'en', 'Products'),
  ('e1ce2000-0000-4000-8000-000000000001', 'zh', '商品目录'),
  ('e1ce2000-0000-4000-8000-000000000002', 'en', 'Services'),
  ('e1ce2000-0000-4000-8000-000000000002', 'zh', '服务能力'),
  ('e1ce2000-0000-4000-8000-000000000003', 'en', 'Insights'),
  ('e1ce2000-0000-4000-8000-000000000003', 'zh', '行业洞察'),
  ('e1ce2000-0000-4000-8000-000000000004', 'en', 'About'),
  ('e1ce2000-0000-4000-8000-000000000004', 'zh', '关于我们'),
  ('e1ce2000-0000-4000-8000-000000000005', 'en', 'Browse catalogue'),
  ('e1ce2000-0000-4000-8000-000000000005', 'zh', '浏览商品目录'),
  ('e1ce2000-0000-4000-8000-000000000006', 'en', 'Start an enquiry'),
  ('e1ce2000-0000-4000-8000-000000000006', 'zh', '发起询单'),
  ('e1ce2000-0000-4000-8000-000000000007', 'en', 'About'),
  ('e1ce2000-0000-4000-8000-000000000007', 'zh', '关于我们'),
  ('e1ce2000-0000-4000-8000-000000000008', 'en', 'Contact'),
  ('e1ce2000-0000-4000-8000-000000000008', 'zh', '联系我们')
on conflict (navigation_item_id, locale) do update set label = excluded.label;
