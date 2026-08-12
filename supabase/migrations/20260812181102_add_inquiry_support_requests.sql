alter table public.inquiries
  add column needs_sample boolean not null default false,
  add column needs_artwork_proof boolean not null default false,
  add column needs_design_support boolean not null default false;
