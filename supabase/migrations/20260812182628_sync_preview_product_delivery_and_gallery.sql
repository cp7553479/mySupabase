update public.products
set
  production_lead_time_min_days = 8,
  production_lead_time_max_days = 8
where product_number in ('LP0160', 'LP0251', 'LP0677', 'LP0690');

insert into public.services (code, name, description)
values (
  'rush_production',
  'Rush Production',
  'Available for eligible products with a five-day production window.'
)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;

insert into public.product_services (
  product_id,
  service_code,
  is_available,
  lead_time_days,
  description
)
select
  product.id,
  'rush_production',
  true,
  5,
  'Rush production is available for this product.'
from public.products as product
where product.product_number in ('LP0160', 'LP0251', 'LP0677', 'LP0690')
on conflict (product_id, service_code) do update
set
  is_available = excluded.is_available,
  lead_time_days = excluded.lead_time_days,
  description = excluded.description;

with preview_gallery (product_number, external_url, sort_order) as (
  values
    ('LP0160', 'https://media.asicdn.com/images/orig/359220000/359229768.jpg', 20),
    ('LP0160', 'https://media.asicdn.com/images/orig/359220000/359229769.jpg', 30),
    ('LP0160', 'https://media.asicdn.com/images/orig/359220000/359229770.jpg', 40),
    ('LP0160', 'https://media.asicdn.com/images/orig/359220000/359229771.jpg', 50),
    ('LP0160', 'https://media.asicdn.com/images/orig/359220000/359229772.jpg', 60),
    ('LP0160', 'https://media.asicdn.com/images/orig/365610000/365615921.png', 70),
    ('LP0251', 'https://media.asicdn.com/images/orig/359180000/359181865.jpg', 20),
    ('LP0251', 'https://media.asicdn.com/images/orig/359180000/359181867.jpg', 30),
    ('LP0251', 'https://media.asicdn.com/images/orig/359180000/359181868.jpg', 40),
    ('LP0677', 'https://media.asicdn.com/images/orig/352770000/352779037.jpg', 20),
    ('LP0677', 'https://media.asicdn.com/images/orig/352770000/352779038.jpg', 30),
    ('LP0677', 'https://media.asicdn.com/images/orig/352770000/352779039.jpg', 40),
    ('LP0677', 'https://media.asicdn.com/images/orig/352770000/352779041.jpg', 50),
    ('LP0690', 'https://media.asicdn.com/images/orig/365620000/365622142.png', 20),
    ('LP0690', 'https://media.asicdn.com/images/orig/365620000/365622143.png', 30),
    ('LP0690', 'https://media.asicdn.com/images/orig/365620000/365622144.png', 40),
    ('LP0690', 'https://media.asicdn.com/images/orig/365620000/365622145.png', 50)
), inserted_assets as (
  insert into public.media_assets (
    media_kind,
    external_url,
    filename,
    mime_type,
    title,
    alt_text,
    is_public
  )
  select
    'image',
    preview_gallery.external_url,
    split_part(preview_gallery.external_url, '/', 8),
    case
      when preview_gallery.external_url like '%.png' then 'image/png'
      else 'image/jpeg'
    end,
    product.name,
    product.name,
    true
  from preview_gallery
  join public.products as product
    on product.product_number = preview_gallery.product_number
  where not exists (
    select 1
    from public.media_assets as existing_asset
    where existing_asset.external_url = preview_gallery.external_url
  )
  on conflict (bucket_id, object_path) do nothing
  returning id, external_url
)
insert into public.product_media (
  product_id,
  media_asset_id,
  usage_type,
  sort_order
)
select
  product.id,
  media_asset.id,
  'gallery',
  preview_gallery.sort_order
from preview_gallery
join public.products as product
  on product.product_number = preview_gallery.product_number
join public.media_assets as media_asset
  on media_asset.external_url = preview_gallery.external_url
on conflict do nothing;
