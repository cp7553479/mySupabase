-- Development content assets live in the existing public bucket. Paths are
-- separated from catalogue media so they can later be managed independently.
update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'text/plain')
where id = 'product-media'
  and not ('text/plain' = any(allowed_mime_types));

insert into public.media_assets (
  id,
  media_kind,
  bucket_id,
  object_path,
  filename,
  mime_type,
  title,
  alt_text,
  is_public
)
values
  (
    'e1ce5000-0000-4000-8000-000000000001'::uuid,
    'image',
    'product-media',
    'content-preview/case-studies/event-ready-brand-kits.png',
    'event-ready-brand-kits.png',
    'image/png',
    'Event-ready brand kits',
    'A curated set of custom merchandise for an event',
    true
  ),
  (
    'e1ce5000-0000-4000-8000-000000000002'::uuid,
    'document',
    'product-media',
    'content-preview/resources/custom-product-enquiry-checklist.txt',
    'custom-product-enquiry-checklist.txt',
    'text/plain',
    'Custom product enquiry checklist',
    null,
    true
  )
on conflict (id) do update set
  bucket_id = excluded.bucket_id,
  object_path = excluded.object_path,
  filename = excluded.filename,
  mime_type = excluded.mime_type,
  title = excluded.title,
  alt_text = excluded.alt_text,
  is_public = excluded.is_public;

insert into public.content_media (
  content_entry_id,
  media_asset_id,
  usage_type,
  sort_order
)
values
  (
    'e1ce9000-0000-4000-8000-000000000001'::uuid,
    'e1ce5000-0000-4000-8000-000000000001'::uuid,
    'cover',
    10
  ),
  (
    'e1ce9000-0000-4000-8000-000000000004'::uuid,
    'e1ce5000-0000-4000-8000-000000000002'::uuid,
    'attachment',
    10
  )
on conflict (content_entry_id, media_asset_id, usage_type) do update set
  sort_order = excluded.sort_order;
