alter table public.content_entries
  add column access_scope text not null default 'public'
    check (access_scope in ('public', 'authenticated'));

create or replace function app_private.can_view_content(requested_content_entry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.content_entries as content_entry
    where content_entry.id = requested_content_entry_id
      and content_entry.status = 'published'
      and (content_entry.published_at is null or content_entry.published_at <= now())
      and (
        content_entry.access_scope = 'public'
        or auth.uid() is not null
      )
  );
$$;
