alter table public.inquiries
  add column intended_use text,
  add column required_date date,
  add column delivery_country_code text;

create index inquiries_required_date_idx
  on public.inquiries (required_date)
  where required_date is not null;
