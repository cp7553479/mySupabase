-- Development preview only: a visible option-dependent per-unit adjustment.
insert into public.product_upcharge_grids (
  id,
  product_id,
  price_book_id,
  code,
  name,
  adjustment_type,
  application_level,
  is_active,
  sort_order
)
values (
  'a1ce8000-0000-4000-8000-000000000001',
  'a1ce1000-0000-4000-8000-000000000001',
  'a1ce3000-0000-4000-8000-000000000001',
  'full-color-imprint',
  'Full color imprint',
  'per_unit',
  'option',
  true,
  10
)
on conflict (product_id, price_book_id, code) do update set
  name = excluded.name,
  adjustment_type = excluded.adjustment_type,
  application_level = excluded.application_level,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

delete from public.product_upcharge_criteria
where upcharge_grid_id = 'a1ce8000-0000-4000-8000-000000000001';

insert into public.product_upcharge_criteria (
  upcharge_grid_id,
  criterion_key,
  operator,
  option_value_id
)
values (
  'a1ce8000-0000-4000-8000-000000000001',
  'imprint_method',
  'equals',
  'a1ce7000-0000-4000-8000-000000000001'
);

insert into public.product_upcharge_tiers (
  id,
  upcharge_grid_id,
  minimum_quantity,
  maximum_quantity,
  amount,
  sort_order
)
values
  ('a1ce8100-0000-4000-8000-000000000001', 'a1ce8000-0000-4000-8000-000000000001', 50, 99, 0.6500, 10),
  ('a1ce8100-0000-4000-8000-000000000002', 'a1ce8000-0000-4000-8000-000000000001', 100, 199, 0.4500, 20),
  ('a1ce8100-0000-4000-8000-000000000003', 'a1ce8000-0000-4000-8000-000000000001', 200, null, 0.3000, 30)
on conflict (id) do update set
  minimum_quantity = excluded.minimum_quantity,
  maximum_quantity = excluded.maximum_quantity,
  amount = excluded.amount,
  sort_order = excluded.sort_order;
