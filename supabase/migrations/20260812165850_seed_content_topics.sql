insert into public.taxonomies (id, code, name, description, is_hierarchical, is_active, sort_order)
values (
  'e1ce9100-0000-4000-8000-000000000001',
  'content_topic',
  'Content topics',
  'Topics used to organise published editorial content.',
  false, true, 100
)
on conflict (code) do update
set name = excluded.name, description = excluded.description,
    is_hierarchical = excluded.is_hierarchical, is_active = excluded.is_active,
    sort_order = excluded.sort_order;

insert into public.taxonomy_terms (id, taxonomy_id, code, slug, name, description, is_active, sort_order)
values
  ('e1ce9100-0000-4000-8000-000000000011', 'e1ce9100-0000-4000-8000-000000000001', 'enquiry-preparation', 'enquiry-preparation', 'Enquiry preparation', 'Guidance for preparing a clear custom-product enquiry.', true, 10),
  ('e1ce9100-0000-4000-8000-000000000012', 'e1ce9100-0000-4000-8000-000000000001', 'pricing-guidance', 'pricing-guidance', 'Pricing guidance', 'Guidance for understanding quantity-tier pricing.', true, 20)
on conflict (taxonomy_id, code) do update
set slug = excluded.slug, name = excluded.name, description = excluded.description,
    is_active = excluded.is_active, sort_order = excluded.sort_order;

insert into public.content_taxonomy_terms (content_entry_id, taxonomy_term_id)
values
  ('e1ce4000-0000-4000-8000-000000000001', 'e1ce9100-0000-4000-8000-000000000011'),
  ('e1ce4000-0000-4000-8000-000000000002', 'e1ce9100-0000-4000-8000-000000000012')
on conflict do nothing;
