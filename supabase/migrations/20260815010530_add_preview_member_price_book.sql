-- A single member price book applies to every approved member. Preview prices
-- are intentionally distinct from public prices so the end-to-end flow can
-- verify the selected price book.

insert into public.price_books (
  id, code, name, description, currency_code, visibility, status
)
values (
  'a1ce3000-0000-4000-8000-000000000002',
  'member-usd',
  'Member USD',
  'Published preview price tiers for approved members.',
  'USD',
  'role',
  'active'
)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  currency_code = excluded.currency_code,
  visibility = excluded.visibility,
  status = excluded.status;

insert into public.price_book_roles (price_book_id, role_id)
select
  'a1ce3000-0000-4000-8000-000000000002',
  role.id
from public.roles as role
where role.code = 'approved_member'
on conflict do nothing;

insert into public.product_price_grids (
  id, product_id, price_book_id, code, name, price_type, is_default, is_active, sort_order
)
values
  ('a1ce4000-0000-4000-8000-000000000101', 'a1ce1000-0000-4000-8000-000000000001', 'a1ce3000-0000-4000-8000-000000000002', 'member-base', 'Member pricing', 'base', true, true, 10),
  ('a1ce4000-0000-4000-8000-000000000102', 'a1ce1000-0000-4000-8000-000000000002', 'a1ce3000-0000-4000-8000-000000000002', 'member-base', 'Member pricing', 'base', true, true, 10),
  ('a1ce4000-0000-4000-8000-000000000103', 'a1ce1000-0000-4000-8000-000000000003', 'a1ce3000-0000-4000-8000-000000000002', 'member-base', 'Member pricing', 'base', true, true, 10),
  ('a1ce4000-0000-4000-8000-000000000104', 'a1ce1000-0000-4000-8000-000000000004', 'a1ce3000-0000-4000-8000-000000000002', 'member-base', 'Member pricing', 'base', true, true, 10)
on conflict (id) do update set
  name = excluded.name,
  is_default = excluded.is_default,
  is_active = excluded.is_active;

insert into public.product_price_tiers (
  id, price_grid_id, minimum_quantity, maximum_quantity, unit_price, sort_order
)
values
  ('a1ce5000-0000-4000-8000-000000000101', 'a1ce4000-0000-4000-8000-000000000101', 50, 99, 12.5730, 10),
  ('a1ce5000-0000-4000-8000-000000000102', 'a1ce4000-0000-4000-8000-000000000101', 100, 199, 12.3390, 20),
  ('a1ce5000-0000-4000-8000-000000000103', 'a1ce4000-0000-4000-8000-000000000101', 200, null, 12.1140, 30),
  ('a1ce5000-0000-4000-8000-000000000104', 'a1ce4000-0000-4000-8000-000000000102', 500, 999, 0.3240, 10),
  ('a1ce5000-0000-4000-8000-000000000105', 'a1ce4000-0000-4000-8000-000000000102', 1000, 1999, 0.3060, 20),
  ('a1ce5000-0000-4000-8000-000000000106', 'a1ce4000-0000-4000-8000-000000000102', 2000, null, 0.2880, 30),
  ('a1ce5000-0000-4000-8000-000000000107', 'a1ce4000-0000-4000-8000-000000000103', 50, 99, 3.0510, 10),
  ('a1ce5000-0000-4000-8000-000000000108', 'a1ce4000-0000-4000-8000-000000000103', 100, 199, 2.9970, 20),
  ('a1ce5000-0000-4000-8000-000000000109', 'a1ce4000-0000-4000-8000-000000000103', 200, null, 2.9430, 30),
  ('a1ce5000-0000-4000-8000-000000000110', 'a1ce4000-0000-4000-8000-000000000104', 500, 999, 0.8190, 10),
  ('a1ce5000-0000-4000-8000-000000000111', 'a1ce4000-0000-4000-8000-000000000104', 1000, 1999, 0.7740, 20),
  ('a1ce5000-0000-4000-8000-000000000112', 'a1ce4000-0000-4000-8000-000000000104', 2000, null, 0.7110, 30)
on conflict (id) do update set
  minimum_quantity = excluded.minimum_quantity,
  maximum_quantity = excluded.maximum_quantity,
  unit_price = excluded.unit_price,
  sort_order = excluded.sort_order;
