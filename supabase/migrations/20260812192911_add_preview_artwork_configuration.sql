-- Development-only configuration data for the preview catalogue. It exercises
-- the same artwork collection path used by customisable goods without treating
-- the sample product as an authoritative production record.
insert into public.product_option_groups (
  id,
  product_id,
  code,
  name,
  description,
  input_type,
  is_required,
  minimum_selections,
  sort_order,
  is_active
)
values (
  'a1ce6001-0000-4000-8000-000000000001',
  'a1ce1000-0000-4000-8000-000000000001',
  'artwork-file',
  'Artwork file',
  'Upload the logo or artwork that should be used for this custom product.',
  'file',
  true,
  0,
  10,
  true
)
on conflict (product_id, code) do update set
  name = excluded.name,
  description = excluded.description,
  input_type = excluded.input_type,
  is_required = excluded.is_required,
  minimum_selections = excluded.minimum_selections,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
