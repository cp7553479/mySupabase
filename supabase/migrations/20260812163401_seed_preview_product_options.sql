-- The preview products expose the imprint methods supplied by the product
-- source as required customer-facing configuration choices.

insert into public.product_option_groups (
  id, product_id, code, name, description, input_type, is_required,
  minimum_selections, maximum_selections, sort_order, is_active
)
values
  ('a1ce6000-0000-4000-8000-000000000001', 'a1ce1000-0000-4000-8000-000000000001', 'imprint-method', 'Imprint method', 'Choose the preferred branding method for this item.', 'single_select', true, 1, 1, 10, true),
  ('a1ce6000-0000-4000-8000-000000000002', 'a1ce1000-0000-4000-8000-000000000002', 'imprint-method', 'Imprint method', 'Choose the preferred branding method for this item.', 'single_select', true, 1, 1, 10, true),
  ('a1ce6000-0000-4000-8000-000000000003', 'a1ce1000-0000-4000-8000-000000000003', 'imprint-method', 'Imprint method', 'Choose the preferred branding method for this item.', 'single_select', true, 1, 1, 10, true),
  ('a1ce6000-0000-4000-8000-000000000004', 'a1ce1000-0000-4000-8000-000000000004', 'imprint-method', 'Imprint method', 'Choose the preferred branding method for this item.', 'single_select', true, 1, 1, 10, true)
on conflict (product_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  input_type = excluded.input_type,
  is_required = excluded.is_required,
  minimum_selections = excluded.minimum_selections,
  maximum_selections = excluded.maximum_selections,
  is_active = excluded.is_active;

insert into public.product_option_values (
  id, option_group_id, code, label, sort_order, is_active
)
values
  ('a1ce7000-0000-4000-8000-000000000001', 'a1ce6000-0000-4000-8000-000000000001', 'full-color', 'Full Color', 10, true),
  ('a1ce7000-0000-4000-8000-000000000002', 'a1ce6000-0000-4000-8000-000000000001', 'silkscreen', 'Silkscreen', 20, true),
  ('a1ce7000-0000-4000-8000-000000000003', 'a1ce6000-0000-4000-8000-000000000002', 'full-color', 'Full Color', 10, true),
  ('a1ce7000-0000-4000-8000-000000000004', 'a1ce6000-0000-4000-8000-000000000002', 'silkscreen', 'Silkscreen', 20, true),
  ('a1ce7000-0000-4000-8000-000000000005', 'a1ce6000-0000-4000-8000-000000000003', 'full-color', 'Full Color', 10, true),
  ('a1ce7000-0000-4000-8000-000000000006', 'a1ce6000-0000-4000-8000-000000000003', 'silkscreen', 'Silkscreen', 20, true),
  ('a1ce7000-0000-4000-8000-000000000007', 'a1ce6000-0000-4000-8000-000000000004', 'full-color', 'Full Color', 10, true),
  ('a1ce7000-0000-4000-8000-000000000008', 'a1ce6000-0000-4000-8000-000000000004', 'silkscreen', 'Silkscreen', 20, true)
on conflict (option_group_id, code) do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
