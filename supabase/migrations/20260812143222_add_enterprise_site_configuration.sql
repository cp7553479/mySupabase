-- Enterprise pricing and review, plus public site configuration.

-- Enterprise pricing and review ---------------------------------------------

alter table public.organizations
  add column verification_status text not null default 'pending'
    check (verification_status in ('pending', 'in_review', 'approved', 'rejected')),
  add column verified_at timestamptz,
  add column verified_by uuid references auth.users(id) on delete set null,
  add column verification_note text;

create table public.organization_price_books (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  price_book_id uuid not null references public.price_books(id) on delete cascade,
  priority integer not null default 0,
  is_active boolean not null default true,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, price_book_id)
);

create index organization_price_books_active_idx
  on public.organization_price_books (organization_id, priority)
  where is_active;

create table public.organization_review_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null
    check (event_type in ('submitted', 'review_started', 'approved', 'changes_requested', 'rejected', 'suspended')),
  verification_status text not null
    check (verification_status in ('pending', 'in_review', 'approved', 'rejected')),
  note text,
  performed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index organization_review_events_organization_idx
  on public.organization_review_events (organization_id, created_at desc);

-- Site settings and language configuration ----------------------------------

create table public.site_settings (
  id boolean primary key default true check (id),
  site_name text not null,
  legal_name text,
  website_url text,
  logo_media_asset_id uuid references public.media_assets(id) on delete set null,
  favicon_media_asset_id uuid references public.media_assets(id) on delete set null,
  default_og_media_asset_id uuid references public.media_assets(id) on delete set null,
  contact_email text,
  contact_phone text,
  whatsapp_url text,
  business_hours text,
  social_links jsonb not null default '{}'::jsonb
    check (jsonb_typeof(social_links) = 'object'),
  default_seo_title text,
  default_seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.site_locales (
  code text primary key check (code ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  display_name text not null,
  native_name text not null,
  url_prefix text not null unique,
  fallback_locale_code text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (fallback_locale_code) references public.site_locales(code)
    on delete set null,
  check (fallback_locale_code is null or fallback_locale_code <> code)
);

create unique index site_locales_one_default
  on public.site_locales ((is_default))
  where is_default;

-- Public navigation ----------------------------------------------------------

create table public.navigation_menus (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  placement text not null
    check (placement in ('header', 'footer', 'utility')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index navigation_menus_public_idx
  on public.navigation_menus (placement, published_at)
  where status = 'published';

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.navigation_menus(id) on delete cascade,
  parent_id uuid references public.navigation_items(id) on delete cascade,
  target_type text not null
    check (target_type in ('path', 'external_url', 'content_entry', 'product', 'taxonomy_term')),
  target_path text,
  content_entry_id uuid references public.content_entries(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  taxonomy_term_id uuid references public.taxonomy_terms(id) on delete set null,
  open_in_new_tab boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (target_type in ('path', 'external_url') and target_path is not null
      and content_entry_id is null and product_id is null and taxonomy_term_id is null)
    or (target_type = 'content_entry' and content_entry_id is not null
      and target_path is null and product_id is null and taxonomy_term_id is null)
    or (target_type = 'product' and product_id is not null
      and target_path is null and content_entry_id is null and taxonomy_term_id is null)
    or (target_type = 'taxonomy_term' and taxonomy_term_id is not null
      and target_path is null and content_entry_id is null and product_id is null)
  )
);

create index navigation_items_menu_idx
  on public.navigation_items (menu_id, parent_id, sort_order)
  where is_active;

create table public.navigation_item_translations (
  navigation_item_id uuid not null references public.navigation_items(id) on delete cascade,
  locale text not null references public.site_locales(code) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (navigation_item_id, locale)
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organization_price_books', 'site_settings', 'site_locales',
    'navigation_menus', 'navigation_items', 'navigation_item_translations'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I '
      'for each row execute function app_private.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

-- RLS and API access ---------------------------------------------------------

alter table public.organization_price_books enable row level security;
alter table public.organization_review_events enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_locales enable row level security;
alter table public.navigation_menus enable row level security;
alter table public.navigation_items enable row level security;
alter table public.navigation_item_translations enable row level security;

create policy organization_price_books_select
on public.organization_price_books for select to authenticated
using (
  app_private.is_organization_member(organization_id)
  or app_private.has_permission('pricing.manage')
);

create policy organization_price_books_manage
on public.organization_price_books for all to authenticated
using (app_private.has_permission('pricing.manage'))
with check (app_private.has_permission('pricing.manage'));

create policy organization_review_events_manage
on public.organization_review_events for all to authenticated
using (app_private.has_permission('members.manage'))
with check (app_private.has_permission('members.manage'));

create policy site_settings_read_anon
on public.site_settings for select to anon using (true);
create policy site_settings_read_authenticated
on public.site_settings for select to authenticated using (true);
create policy site_settings_manage
on public.site_settings for all to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));

create policy site_locales_read_active_anon
on public.site_locales for select to anon using (is_active);
create policy site_locales_read_active_authenticated
on public.site_locales for select to authenticated using (is_active);
create policy site_locales_manage
on public.site_locales for all to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));

create policy navigation_menus_read_published_anon
on public.navigation_menus for select to anon
using (status = 'published' and (published_at is null or published_at <= now()));
create policy navigation_menus_read_published_authenticated
on public.navigation_menus for select to authenticated
using (status = 'published' and (published_at is null or published_at <= now()));
create policy navigation_menus_manage
on public.navigation_menus for all to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));

create policy navigation_items_read_published_anon
on public.navigation_items for select to anon
using (
  is_active and exists (
    select 1 from public.navigation_menus as menu
    where menu.id = menu_id
      and menu.status = 'published'
      and (menu.published_at is null or menu.published_at <= now())
  )
);
create policy navigation_items_read_published_authenticated
on public.navigation_items for select to authenticated
using (
  is_active and exists (
    select 1 from public.navigation_menus as menu
    where menu.id = menu_id
      and menu.status = 'published'
      and (menu.published_at is null or menu.published_at <= now())
  )
);
create policy navigation_items_manage
on public.navigation_items for all to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));

create policy navigation_item_translations_read_published_anon
on public.navigation_item_translations for select to anon
using (
  exists (
    select 1 from public.navigation_items as item
    join public.navigation_menus as menu on menu.id = item.menu_id
    join public.site_locales as locale on locale.code = navigation_item_translations.locale
    where item.id = navigation_item_id
      and item.is_active
      and menu.status = 'published'
      and (menu.published_at is null or menu.published_at <= now())
      and locale.is_active
  )
);
create policy navigation_item_translations_read_published_authenticated
on public.navigation_item_translations for select to authenticated
using (
  exists (
    select 1 from public.navigation_items as item
    join public.navigation_menus as menu on menu.id = item.menu_id
    join public.site_locales as locale on locale.code = navigation_item_translations.locale
    where item.id = navigation_item_id
      and item.is_active
      and menu.status = 'published'
      and (menu.published_at is null or menu.published_at <= now())
      and locale.is_active
  )
);
create policy navigation_item_translations_manage
on public.navigation_item_translations for all to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));

grant select on table
  public.site_settings,
  public.site_locales,
  public.navigation_menus,
  public.navigation_items,
  public.navigation_item_translations
to anon;

grant select, insert, update, delete on table
  public.organization_price_books,
  public.organization_review_events,
  public.site_settings,
  public.site_locales,
  public.navigation_menus,
  public.navigation_items,
  public.navigation_item_translations
to authenticated;

-- Enterprise-assigned price books participate in the existing price visibility
-- decision alongside public, authenticated, and role-visible price books.
create or replace function app_private.can_view_price_book(requested_price_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.price_books as price_book
    where price_book.id = requested_price_book_id
      and price_book.status = 'active'
      and (price_book.valid_from is null or price_book.valid_from <= now())
      and (price_book.valid_until is null or price_book.valid_until > now())
      and (
        price_book.visibility = 'public'
        or (price_book.visibility = 'authenticated' and auth.uid() is not null)
        or (
          price_book.visibility = 'role'
          and auth.uid() is not null
          and (
            exists (
              select 1
              from public.price_book_roles as price_book_role
              join public.user_roles as user_role
                on user_role.role_id = price_book_role.role_id
              where price_book_role.price_book_id = price_book.id
                and user_role.user_id = auth.uid()
                and (
                  user_role.organization_id is null
                  or exists (
                    select 1
                    from public.organization_members as member
                    where member.organization_id = user_role.organization_id
                      and member.user_id = auth.uid()
                      and member.status = 'active'
                  )
                )
            )
            or exists (
              select 1
              from public.organization_price_books as assignment
              join public.organization_members as member
                on member.organization_id = assignment.organization_id
              where assignment.price_book_id = price_book.id
                and assignment.is_active
                and member.user_id = auth.uid()
                and member.status = 'active'
            )
          )
        )
      )
  );
$$;

grant execute on function app_private.can_view_price_book(uuid) to authenticated;
grant all privileges on function app_private.can_view_price_book(uuid) to service_role;
