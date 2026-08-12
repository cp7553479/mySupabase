-- Small, representative development catalogue imported from the current
-- LogoPress Base. It supports real catalogue and pricing flows without
-- treating the development seed as the production product import.

insert into public.taxonomy_terms (
  id, taxonomy_id, code, slug, name, sort_order
)
select
  term.id,
  taxonomy.id,
  term.code,
  term.slug,
  term.name,
  term.sort_order
from (
  values
    ('a1ce0100-0000-4000-8000-000000000001'::uuid, 'electronics', 'electronics', 'Electronics', 10),
    ('a1ce0100-0000-4000-8000-000000000002'::uuid, 'bags', 'bags', 'Bags', 20),
    ('a1ce0100-0000-4000-8000-000000000003'::uuid, 'outdoor', 'outdoor', 'Outdoor', 30),
    ('a1ce0100-0000-4000-8000-000000000004'::uuid, 'drinkware', 'drinkware', 'Drinkware', 40)
) as term(id, code, slug, name, sort_order)
join public.taxonomies as taxonomy on taxonomy.code = 'category'
on conflict (taxonomy_id, code) do update set
  slug = excluded.slug,
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.products (
  id, product_number, slug, name, short_description, status,
  default_currency_code, minimum_order_quantity, customizable,
  proof_available, design_support_available, published_at
)
values
  (
    'a1ce1000-0000-4000-8000-000000000001',
    'LP0677',
    'multi-band-wireless-vintage-radio',
    'Multi Band Wireless Vintage Radio with Flashlight',
    'A portable radio and flashlight for branded business gifts.',
    'published', 'USD', 50, true, true, true, now()
  ),
  (
    'a1ce1000-0000-4000-8000-000000000002',
    'LP0251',
    'reinforced-handle-bag',
    'Reinforced Handle Bag',
    'A customisable bag for retail, events and everyday carry.',
    'published', 'USD', 500, true, true, true, now()
  ),
  (
    'a1ce1000-0000-4000-8000-000000000003',
    'LP0690',
    'multifunctional-mini-usb-fan',
    'Multifunctional Mini USB Fan with Light',
    'A compact travel gift with an integrated light.',
    'published', 'USD', 50, true, true, true, now()
  ),
  (
    'a1ce1000-0000-4000-8000-000000000004',
    'LP0160',
    'bpa-free-plastic-cup',
    'BPA-Free Plastic Cup',
    'A reusable drinkware option for custom programmes.',
    'published', 'USD', 500, true, true, true, now()
  )
on conflict (product_number) do update set
  slug = excluded.slug,
  name = excluded.name,
  short_description = excluded.short_description,
  status = excluded.status,
  minimum_order_quantity = excluded.minimum_order_quantity,
  customizable = excluded.customizable,
  proof_available = excluded.proof_available,
  design_support_available = excluded.design_support_available,
  published_at = excluded.published_at;

insert into public.product_taxonomy_terms (product_id, taxonomy_term_id, is_primary, sort_order)
values
  ('a1ce1000-0000-4000-8000-000000000001', 'a1ce0100-0000-4000-8000-000000000001', true, 10),
  ('a1ce1000-0000-4000-8000-000000000002', 'a1ce0100-0000-4000-8000-000000000002', true, 10),
  ('a1ce1000-0000-4000-8000-000000000003', 'a1ce0100-0000-4000-8000-000000000003', true, 10),
  ('a1ce1000-0000-4000-8000-000000000004', 'a1ce0100-0000-4000-8000-000000000004', true, 10)
on conflict (product_id, taxonomy_term_id) do update set
  is_primary = excluded.is_primary,
  sort_order = excluded.sort_order;

insert into public.media_assets (
  id, media_kind, external_url, filename, mime_type, title, alt_text, is_public
)
values
  (
    'a1ce2000-0000-4000-8000-000000000001', 'image',
    'https://media.asicdn.com/images/orig/352770000/352779059.jpg',
    'lp0677-primary.jpg', 'image/jpeg',
    'Multi Band Wireless Vintage Radio with Flashlight',
    'Multi Band Wireless Vintage Radio with Flashlight', true
  ),
  (
    'a1ce2000-0000-4000-8000-000000000002', 'image',
    'https://media.asicdn.com/images/orig/359180000/359181856.jpg',
    'lp0251-primary.jpg', 'image/jpeg', 'Reinforced Handle Bag',
    'Reinforced Handle Bag', true
  ),
  (
    'a1ce2000-0000-4000-8000-000000000003', 'image',
    'https://media.asicdn.com/images/orig/365620000/365622146.png',
    'lp0690-primary.png', 'image/png', 'Multifunctional Mini USB Fan with Light',
    'Multifunctional Mini USB Fan with Light', true
  ),
  (
    'a1ce2000-0000-4000-8000-000000000004', 'image',
    'https://media.asicdn.com/images/orig/365610000/365613077.jpg',
    'lp0160-primary.jpg', 'image/jpeg', 'BPA-Free Plastic Cup',
    'BPA-Free Plastic Cup', true
  )
on conflict (id) do update set
  external_url = excluded.external_url,
  filename = excluded.filename,
  mime_type = excluded.mime_type,
  title = excluded.title,
  alt_text = excluded.alt_text;

insert into public.product_media (product_id, media_asset_id, usage_type, sort_order)
values
  ('a1ce1000-0000-4000-8000-000000000001', 'a1ce2000-0000-4000-8000-000000000001', 'primary', 10),
  ('a1ce1000-0000-4000-8000-000000000002', 'a1ce2000-0000-4000-8000-000000000002', 'primary', 10),
  ('a1ce1000-0000-4000-8000-000000000003', 'a1ce2000-0000-4000-8000-000000000003', 'primary', 10),
  ('a1ce1000-0000-4000-8000-000000000004', 'a1ce2000-0000-4000-8000-000000000004', 'primary', 10)
on conflict (product_id, media_asset_id, usage_type) do update set
  sort_order = excluded.sort_order;

insert into public.price_books (
  id, code, name, description, currency_code, visibility, status
)
values (
  'a1ce3000-0000-4000-8000-000000000001', 'public-usd', 'Public USD',
  'Published preview price tiers for the public catalogue.', 'USD', 'public', 'active'
)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  visibility = excluded.visibility,
  status = excluded.status;

insert into public.product_price_grids (
  id, product_id, price_book_id, code, name, price_type, is_default, is_active, sort_order
)
values
  ('a1ce4000-0000-4000-8000-000000000001', 'a1ce1000-0000-4000-8000-000000000001', 'a1ce3000-0000-4000-8000-000000000001', 'base', 'Base pricing', 'base', true, true, 10),
  ('a1ce4000-0000-4000-8000-000000000002', 'a1ce1000-0000-4000-8000-000000000002', 'a1ce3000-0000-4000-8000-000000000001', 'base', 'Base pricing', 'base', true, true, 10),
  ('a1ce4000-0000-4000-8000-000000000003', 'a1ce1000-0000-4000-8000-000000000003', 'a1ce3000-0000-4000-8000-000000000001', 'base', 'Base pricing', 'base', true, true, 10),
  ('a1ce4000-0000-4000-8000-000000000004', 'a1ce1000-0000-4000-8000-000000000004', 'a1ce3000-0000-4000-8000-000000000001', 'base', 'Base pricing', 'base', true, true, 10)
on conflict (id) do update set
  name = excluded.name,
  is_default = excluded.is_default,
  is_active = excluded.is_active;

insert into public.product_price_tiers (
  id, price_grid_id, minimum_quantity, maximum_quantity, unit_price, sort_order
)
values
  ('a1ce5000-0000-4000-8000-000000000001', 'a1ce4000-0000-4000-8000-000000000001', 50, 99, 13.9700, 10),
  ('a1ce5000-0000-4000-8000-000000000002', 'a1ce4000-0000-4000-8000-000000000001', 100, 199, 13.7100, 20),
  ('a1ce5000-0000-4000-8000-000000000003', 'a1ce4000-0000-4000-8000-000000000001', 200, null, 13.4600, 30),
  ('a1ce5000-0000-4000-8000-000000000004', 'a1ce4000-0000-4000-8000-000000000002', 500, 999, 0.3600, 10),
  ('a1ce5000-0000-4000-8000-000000000005', 'a1ce4000-0000-4000-8000-000000000002', 1000, 1999, 0.3400, 20),
  ('a1ce5000-0000-4000-8000-000000000006', 'a1ce4000-0000-4000-8000-000000000002', 2000, null, 0.3200, 30),
  ('a1ce5000-0000-4000-8000-000000000007', 'a1ce4000-0000-4000-8000-000000000003', 50, 99, 3.3900, 10),
  ('a1ce5000-0000-4000-8000-000000000008', 'a1ce4000-0000-4000-8000-000000000003', 100, 199, 3.3300, 20),
  ('a1ce5000-0000-4000-8000-000000000009', 'a1ce4000-0000-4000-8000-000000000003', 200, null, 3.2700, 30),
  ('a1ce5000-0000-4000-8000-000000000010', 'a1ce4000-0000-4000-8000-000000000004', 500, 999, 0.9100, 10),
  ('a1ce5000-0000-4000-8000-000000000011', 'a1ce4000-0000-4000-8000-000000000004', 1000, 1999, 0.8600, 20),
  ('a1ce5000-0000-4000-8000-000000000012', 'a1ce4000-0000-4000-8000-000000000004', 2000, null, 0.7900, 30)
on conflict (id) do update set
  minimum_quantity = excluded.minimum_quantity,
  maximum_quantity = excluded.maximum_quantity,
  unit_price = excluded.unit_price,
  sort_order = excluded.sort_order;
