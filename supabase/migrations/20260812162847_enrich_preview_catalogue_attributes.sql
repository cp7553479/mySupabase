-- Source fields come from the representative Base records used by the preview
-- catalogue migration. Repeating values stay in taxonomy and specification
-- relations rather than being encoded in a display-only product column.

insert into public.taxonomy_terms (
  id, taxonomy_id, code, slug, name, sort_order
)
select term.id, taxonomy.id, term.code, term.slug, term.name, term.sort_order
from (
  values
    ('a1ce0110-0000-4000-8000-000000000001'::uuid, 'category', 'radios', 'radios', 'Radios', 10),
    ('a1ce0110-0000-4000-8000-000000000002'::uuid, 'category', 'electronic-devices', 'electronic-devices', 'Electronic Devices', 20),
    ('a1ce0110-0000-4000-8000-000000000003'::uuid, 'category', 'shopping-bags', 'shopping-bags', 'Shopping Bags', 30),
    ('a1ce0110-0000-4000-8000-000000000004'::uuid, 'category', 'usb-fans', 'usb-fans', 'USB Fans', 40),
    ('a1ce0110-0000-4000-8000-000000000005'::uuid, 'category', 'flashlights', 'flashlights', 'Flashlights', 50),
    ('a1ce0110-0000-4000-8000-000000000006'::uuid, 'category', 'plastic-cups', 'plastic-cups', 'Plastic Cups', 60),
    ('a1ce0110-0000-4000-8000-000000000007'::uuid, 'material', 'plastic', 'plastic', 'Plastic', 10),
    ('a1ce0110-0000-4000-8000-000000000008'::uuid, 'material', 'kraft-paper', 'kraft-paper', 'Kraft Paper', 20),
    ('a1ce0110-0000-4000-8000-000000000009'::uuid, 'imprint_method', 'full-color', 'full-color', 'Full Color', 10),
    ('a1ce0110-0000-4000-8000-000000000010'::uuid, 'imprint_method', 'silkscreen', 'silkscreen', 'Silkscreen', 20)
) as term(id, taxonomy_code, code, slug, name, sort_order)
join public.taxonomies as taxonomy on taxonomy.code = term.taxonomy_code
on conflict (taxonomy_id, code) do update set
  slug = excluded.slug,
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.product_taxonomy_terms (product_id, taxonomy_term_id, is_primary, sort_order)
values
  ('a1ce1000-0000-4000-8000-000000000001', 'a1ce0110-0000-4000-8000-000000000001', true, 10),
  ('a1ce1000-0000-4000-8000-000000000001', 'a1ce0110-0000-4000-8000-000000000002', false, 20),
  ('a1ce1000-0000-4000-8000-000000000001', 'a1ce0110-0000-4000-8000-000000000007', false, 30),
  ('a1ce1000-0000-4000-8000-000000000001', 'a1ce0110-0000-4000-8000-000000000009', false, 40),
  ('a1ce1000-0000-4000-8000-000000000001', 'a1ce0110-0000-4000-8000-000000000010', false, 50),
  ('a1ce1000-0000-4000-8000-000000000002', 'a1ce0110-0000-4000-8000-000000000003', true, 10),
  ('a1ce1000-0000-4000-8000-000000000002', 'a1ce0110-0000-4000-8000-000000000008', false, 20),
  ('a1ce1000-0000-4000-8000-000000000002', 'a1ce0110-0000-4000-8000-000000000009', false, 30),
  ('a1ce1000-0000-4000-8000-000000000002', 'a1ce0110-0000-4000-8000-000000000010', false, 40),
  ('a1ce1000-0000-4000-8000-000000000003', 'a1ce0110-0000-4000-8000-000000000004', true, 10),
  ('a1ce1000-0000-4000-8000-000000000003', 'a1ce0110-0000-4000-8000-000000000005', false, 20),
  ('a1ce1000-0000-4000-8000-000000000003', 'a1ce0110-0000-4000-8000-000000000007', false, 30),
  ('a1ce1000-0000-4000-8000-000000000003', 'a1ce0110-0000-4000-8000-000000000009', false, 40),
  ('a1ce1000-0000-4000-8000-000000000003', 'a1ce0110-0000-4000-8000-000000000010', false, 50),
  ('a1ce1000-0000-4000-8000-000000000004', 'a1ce0110-0000-4000-8000-000000000006', true, 10),
  ('a1ce1000-0000-4000-8000-000000000004', 'a1ce0110-0000-4000-8000-000000000007', false, 20),
  ('a1ce1000-0000-4000-8000-000000000004', 'a1ce0110-0000-4000-8000-000000000009', false, 30),
  ('a1ce1000-0000-4000-8000-000000000004', 'a1ce0110-0000-4000-8000-000000000010', false, 40)
on conflict (product_id, taxonomy_term_id) do update set
  is_primary = excluded.is_primary,
  sort_order = excluded.sort_order;

insert into public.product_specifications (
  product_id, specification_group, name, value, unit, is_filterable, sort_order
)
values
  ('a1ce1000-0000-4000-8000-000000000001', 'Dimensions', 'Length', '6.34', 'in', true, 10),
  ('a1ce1000-0000-4000-8000-000000000001', 'Dimensions', 'Width', '3.19', 'in', true, 20),
  ('a1ce1000-0000-4000-8000-000000000001', 'Dimensions', 'Height', '4.17', 'in', true, 30),
  ('a1ce1000-0000-4000-8000-000000000001', 'Product details', 'Weight', '1.39', 'lbs', true, 40),
  ('a1ce1000-0000-4000-8000-000000000002', 'Dimensions', 'Length', '4.72', 'in', true, 10),
  ('a1ce1000-0000-4000-8000-000000000002', 'Dimensions', 'Width', '2.24', 'in', true, 20),
  ('a1ce1000-0000-4000-8000-000000000002', 'Dimensions', 'Height', '6.3', 'in', true, 30),
  ('a1ce1000-0000-4000-8000-000000000002', 'Product details', 'Weight', '0.07', 'lbs', true, 40),
  ('a1ce1000-0000-4000-8000-000000000003', 'Dimensions', 'Length', '5.12', 'in', true, 10),
  ('a1ce1000-0000-4000-8000-000000000003', 'Dimensions', 'Width', '1.38', 'in', true, 20),
  ('a1ce1000-0000-4000-8000-000000000003', 'Product details', 'Weight', '0.29', 'lbs', true, 30),
  ('a1ce1000-0000-4000-8000-000000000004', 'Capacity', 'Volume', '16', 'oz', true, 10),
  ('a1ce1000-0000-4000-8000-000000000004', 'Product details', 'Weight', '0.07', 'lbs', true, 20);

insert into public.product_services (product_id, service_code, is_available)
select product.id, service.code, true
from public.products as product
cross join public.services as service
where product.id in (
  'a1ce1000-0000-4000-8000-000000000001',
  'a1ce1000-0000-4000-8000-000000000002',
  'a1ce1000-0000-4000-8000-000000000003',
  'a1ce1000-0000-4000-8000-000000000004'
)
and service.code in ('sample', 'proof', 'design_support')
on conflict (product_id, service_code) do update set
  is_available = excluded.is_available;
