update storage.buckets
set allowed_mime_types = array_append(
  allowed_mime_types,
  'application/octet-stream'
)
where id = 'product-media'
  and not ('application/octet-stream' = any(allowed_mime_types));

update public.media_assets
set mime_type = 'application/octet-stream'
where id = 'e1ce5000-0000-4000-8000-000000000002'::uuid;
