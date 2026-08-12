-- Preview assets are copied into the public LogoPress bucket so the application
-- does not depend on a third-party image host at runtime.

update public.media_assets
set
  bucket_id = 'product-media',
  object_path = case id
    when 'a1ce2000-0000-4000-8000-000000000001'::uuid then 'catalogue-preview/LP0677.jpg'
    when 'a1ce2000-0000-4000-8000-000000000002'::uuid then 'catalogue-preview/LP0251.jpg'
    when 'a1ce2000-0000-4000-8000-000000000003'::uuid then 'catalogue-preview/LP0690.png'
    when 'a1ce2000-0000-4000-8000-000000000004'::uuid then 'catalogue-preview/LP0160.jpg'
  end,
  external_url = null
where id in (
  'a1ce2000-0000-4000-8000-000000000001',
  'a1ce2000-0000-4000-8000-000000000002',
  'a1ce2000-0000-4000-8000-000000000003',
  'a1ce2000-0000-4000-8000-000000000004'
);
