-- RLS, API grants, and Storage policies for LogoPress objects created by the
-- preceding migration. Existing remote helper functions and triggers are not
-- modified here.

-- Private authorization helpers ---------------------------------------------

create function app_private.has_permission(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.user_roles as user_role
      join public.role_permissions as role_permission
        on role_permission.role_id = user_role.role_id
      join public.permissions as permission
        on permission.id = role_permission.permission_id
      where user_role.user_id = auth.uid()
        and user_role.organization_id is null
        and permission.code = requested_permission
    );
$$;

create function app_private.is_organization_member(requested_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.organization_members as member
      where member.organization_id = requested_organization_id
        and member.user_id = auth.uid()
        and member.status = 'active'
    );
$$;

create function app_private.can_manage_organization(requested_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select app_private.has_permission('members.manage')
    or (
      auth.uid() is not null
      and exists (
        select 1
        from public.organization_members as member
        where member.organization_id = requested_organization_id
          and member.user_id = auth.uid()
          and member.status = 'active'
          and member.membership_role in ('owner', 'admin')
      )
    );
$$;

create function app_private.shares_organization(requested_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select auth.uid() is not null
    and (
      requested_user_id = auth.uid()
      or exists (
        select 1
        from public.organization_members as current_member
        join public.organization_members as requested_member
          on requested_member.organization_id = current_member.organization_id
        where current_member.user_id = auth.uid()
          and current_member.status = 'active'
          and requested_member.user_id = requested_user_id
          and requested_member.status = 'active'
      )
    );
$$;

create function app_private.can_view_product(requested_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.products as product
    where product.id = requested_product_id
      and product.status = 'published'
      and (product.published_at is null or product.published_at <= now())
  );
$$;

create function app_private.can_view_content(requested_content_entry_id uuid)
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
  );
$$;

create function app_private.can_view_price_book(requested_price_book_id uuid)
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
          and exists (
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
        )
      )
  );
$$;

create function app_private.can_access_inquiry(requested_inquiry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select auth.uid() is not null
    and (
      app_private.has_permission('inquiries.manage')
      or exists (
        select 1
        from public.inquiries as inquiry
        where inquiry.id = requested_inquiry_id
          and (
            inquiry.customer_user_id = auth.uid()
            or inquiry.assigned_to = auth.uid()
            or (
              inquiry.organization_id is not null
              and app_private.is_organization_member(inquiry.organization_id)
            )
          )
      )
    );
$$;

create function app_private.can_manage_inquiry(requested_inquiry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select auth.uid() is not null
    and (
      app_private.has_permission('inquiries.manage')
      or exists (
        select 1
        from public.inquiries as inquiry
        where inquiry.id = requested_inquiry_id
          and inquiry.assigned_to = auth.uid()
      )
    );
$$;

create function app_private.can_edit_inquiry(requested_inquiry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select app_private.can_manage_inquiry(requested_inquiry_id)
    or (
      auth.uid() is not null
      and exists (
        select 1
        from public.inquiries as inquiry
        where inquiry.id = requested_inquiry_id
          and inquiry.customer_user_id = auth.uid()
          and inquiry.status = 'draft'
      )
    );
$$;

create function app_private.can_view_quote_version(requested_quote_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.quote_versions as quote_version
    join public.quotes as quote on quote.id = quote_version.quote_id
    where quote_version.id = requested_quote_version_id
      and (
        app_private.can_manage_inquiry(quote.inquiry_id)
        or (
          quote_version.status in ('sent', 'accepted', 'rejected', 'expired', 'superseded')
          and app_private.can_access_inquiry(quote.inquiry_id)
        )
      )
  );
$$;

create function app_private.can_view_media_asset(requested_media_asset_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.media_assets as media_asset
    where media_asset.id = requested_media_asset_id
      and media_asset.is_public
      and (
        exists (
          select 1
          from public.product_media as product_media
          where product_media.media_asset_id = media_asset.id
            and app_private.can_view_product(product_media.product_id)
        )
        or exists (
          select 1
          from public.content_media as content_media
          where content_media.media_asset_id = media_asset.id
            and app_private.can_view_content(content_media.content_entry_id)
        )
      )
  );
$$;

create function app_private.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if auth.role() = 'authenticated'
     and not app_private.has_permission('members.manage')
     and (
       new.id is distinct from old.id
       or new.email is distinct from old.email
       or new.account_status is distinct from old.account_status
       or new.approved_at is distinct from old.approved_at
       or new.approved_by is distinct from old.approved_by
     ) then
    raise exception 'privileged profile fields require members.manage';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_privileged_fields
  before update on public.profiles
  for each row execute function app_private.protect_profile_privileged_fields();

create function app_private.protect_customer_inquiry_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if auth.role() = 'authenticated'
     and not app_private.can_manage_inquiry(old.id) then
    if new.customer_user_id is distinct from old.customer_user_id
       or new.assigned_to is distinct from old.assigned_to
       or new.internal_notes is distinct from old.internal_notes then
      raise exception 'staff inquiry fields require inquiries.manage';
    end if;

    if new.status is distinct from old.status
       and not (
         (old.status = 'draft' and new.status = 'submitted')
         or (old.status in ('submitted', 'reviewing', 'quoting', 'quoted', 'customer_review')
             and new.status = 'cancelled')
       ) then
      raise exception 'invalid customer inquiry status transition';
    end if;
  end if;
  return new;
end;
$$;

create trigger inquiries_protect_staff_fields
  before update on public.inquiries
  for each row execute function app_private.protect_customer_inquiry_fields();

revoke all on function app_private.has_permission(text) from public;
revoke all on function app_private.is_organization_member(uuid) from public;
revoke all on function app_private.can_manage_organization(uuid) from public;
revoke all on function app_private.shares_organization(uuid) from public;
revoke all on function app_private.can_view_product(uuid) from public;
revoke all on function app_private.can_view_content(uuid) from public;
revoke all on function app_private.can_view_price_book(uuid) from public;
revoke all on function app_private.can_access_inquiry(uuid) from public;
revoke all on function app_private.can_manage_inquiry(uuid) from public;
revoke all on function app_private.can_edit_inquiry(uuid) from public;
revoke all on function app_private.can_view_quote_version(uuid) from public;
revoke all on function app_private.can_view_media_asset(uuid) from public;
revoke all on function app_private.protect_profile_privileged_fields() from public;
revoke all on function app_private.protect_customer_inquiry_fields() from public;
revoke all on function app_private.set_updated_at() from public;
revoke all on function app_private.handle_new_user() from public;
revoke all on function app_private.record_inquiry_status_change() from public;

grant usage on schema app_private to anon, authenticated, service_role;
grant execute on function app_private.can_view_product(uuid) to anon, authenticated;
grant execute on function app_private.can_view_content(uuid) to anon, authenticated;
grant execute on function app_private.can_view_price_book(uuid) to anon, authenticated;
grant execute on function app_private.can_view_media_asset(uuid) to anon, authenticated;
grant execute on function app_private.has_permission(text) to authenticated;
grant execute on function app_private.is_organization_member(uuid) to authenticated;
grant execute on function app_private.can_manage_organization(uuid) to authenticated;
grant execute on function app_private.shares_organization(uuid) to authenticated;
grant execute on function app_private.can_access_inquiry(uuid) to authenticated;
grant execute on function app_private.can_manage_inquiry(uuid) to authenticated;
grant execute on function app_private.can_edit_inquiry(uuid) to authenticated;
grant execute on function app_private.can_view_quote_version(uuid) to authenticated;
grant all privileges on function app_private.has_permission(text) to service_role;
grant all privileges on function app_private.is_organization_member(uuid) to service_role;
grant all privileges on function app_private.can_manage_organization(uuid) to service_role;
grant all privileges on function app_private.shares_organization(uuid) to service_role;
grant all privileges on function app_private.can_view_product(uuid) to service_role;
grant all privileges on function app_private.can_view_content(uuid) to service_role;
grant all privileges on function app_private.can_view_price_book(uuid) to service_role;
grant all privileges on function app_private.can_access_inquiry(uuid) to service_role;
grant all privileges on function app_private.can_manage_inquiry(uuid) to service_role;
grant all privileges on function app_private.can_edit_inquiry(uuid) to service_role;
grant all privileges on function app_private.can_view_quote_version(uuid) to service_role;
grant all privileges on function app_private.can_view_media_asset(uuid) to service_role;
grant all privileges on function app_private.protect_profile_privileged_fields() to service_role;
grant all privileges on function app_private.protect_customer_inquiry_fields() to service_role;
grant all privileges on function app_private.set_updated_at() to service_role;
grant all privileges on function app_private.handle_new_user() to service_role;
grant all privileges on function app_private.record_inquiry_status_change() to service_role;

-- Enable RLS only on tables created for LogoPress by this migration set.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'organizations', 'organization_addresses', 'organization_members',
    'roles', 'permissions', 'role_permissions', 'user_roles', 'currencies',
    'price_codes', 'taxonomies', 'taxonomy_terms', 'products',
    'product_translations', 'product_taxonomy_terms', 'product_specifications',
    'media_assets', 'product_media', 'product_compliance_records',
    'product_related_products', 'product_option_groups',
    'product_option_values', 'product_option_rules', 'product_variants',
    'product_variant_option_values', 'services', 'product_services', 'price_books',
    'price_book_roles', 'product_price_grids', 'product_price_criteria',
    'product_price_tiers', 'product_upcharge_grids', 'product_upcharge_criteria',
    'product_upcharge_tiers', 'content_entries', 'content_translations',
    'content_media', 'content_taxonomy_terms', 'content_products', 'inquiries',
    'inquiry_items', 'inquiry_item_option_selections',
    'inquiry_item_service_requests', 'inquiry_attachments',
    'inquiry_status_history', 'inquiry_communications', 'quotes', 'quote_versions',
    'quote_items', 'quote_item_options', 'quote_adjustments', 'quote_responses'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

-- Identity and enterprise account policies ---------------------------------

create policy profiles_select
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or app_private.shares_organization(id)
  or app_private.has_permission('members.manage')
);

create policy profiles_insert_own
on public.profiles for insert to authenticated
with check (id = auth.uid());

create policy profiles_update_own_or_manager
on public.profiles for update to authenticated
using (id = auth.uid() or app_private.has_permission('members.manage'))
with check (id = auth.uid() or app_private.has_permission('members.manage'));

create policy roles_select
on public.roles for select to authenticated using (true);
create policy permissions_select
on public.permissions for select to authenticated using (true);
create policy role_permissions_select
on public.role_permissions for select to authenticated using (true);
create policy user_roles_select
on public.user_roles for select to authenticated
using (user_id = auth.uid() or app_private.has_permission('members.manage'));

create policy roles_manage
on public.roles for all to authenticated
using (app_private.has_permission('members.manage'))
with check (app_private.has_permission('members.manage'));
create policy permissions_manage
on public.permissions for all to authenticated
using (app_private.has_permission('members.manage'))
with check (app_private.has_permission('members.manage'));
create policy role_permissions_manage
on public.role_permissions for all to authenticated
using (app_private.has_permission('members.manage'))
with check (app_private.has_permission('members.manage'));
create policy user_roles_manage
on public.user_roles for all to authenticated
using (app_private.has_permission('members.manage'))
with check (app_private.has_permission('members.manage'));

create policy organizations_select
on public.organizations for select to authenticated
using (
  app_private.is_organization_member(id)
  or created_by = auth.uid()
  or app_private.has_permission('members.manage')
);

create policy organizations_insert
on public.organizations for insert to authenticated
with check (created_by = auth.uid());

create policy organizations_update
on public.organizations for update to authenticated
using (app_private.can_manage_organization(id))
with check (app_private.can_manage_organization(id));

create policy organization_addresses_select
on public.organization_addresses for select to authenticated
using (
  app_private.is_organization_member(organization_id)
  or app_private.has_permission('members.manage')
);

create policy organization_addresses_manage
on public.organization_addresses for all to authenticated
using (app_private.can_manage_organization(organization_id))
with check (app_private.can_manage_organization(organization_id));

create policy organization_members_select
on public.organization_members for select to authenticated
using (
  app_private.is_organization_member(organization_id)
  or app_private.has_permission('members.manage')
);

create policy organization_members_insert
on public.organization_members for insert to authenticated
with check (
  app_private.can_manage_organization(organization_id)
  or (
    user_id = auth.uid()
    and membership_role = 'owner'
    and exists (
      select 1 from public.organizations as organization
      where organization.id = organization_id
        and organization.created_by = auth.uid()
    )
  )
);

create policy organization_members_update
on public.organization_members for update to authenticated
using (app_private.can_manage_organization(organization_id))
with check (app_private.can_manage_organization(organization_id));

create policy organization_members_delete
on public.organization_members for delete to authenticated
using (app_private.can_manage_organization(organization_id));

-- Public catalogue and content policies -------------------------------------

create policy currencies_read_active
on public.currencies for select to anon, authenticated using (is_active);
create policy price_codes_read_active
on public.price_codes for select to anon, authenticated using (is_active);
create policy taxonomies_read_active
on public.taxonomies for select to anon, authenticated using (is_active);
create policy taxonomy_terms_read_active
on public.taxonomy_terms for select to anon, authenticated
using (
  is_active and exists (
    select 1 from public.taxonomies as taxonomy
    where taxonomy.id = taxonomy_id and taxonomy.is_active
  )
);
create policy services_read_active
on public.services for select to anon, authenticated using (is_active);

create policy products_read_published
on public.products for select to anon, authenticated
using (app_private.can_view_product(id));
create policy product_translations_read_published
on public.product_translations for select to anon, authenticated
using (app_private.can_view_product(product_id));
create policy product_taxonomy_terms_read_published
on public.product_taxonomy_terms for select to anon, authenticated
using (app_private.can_view_product(product_id));
create policy product_specifications_read_published
on public.product_specifications for select to anon, authenticated
using (app_private.can_view_product(product_id));
create policy product_media_read_published
on public.product_media for select to anon, authenticated
using (app_private.can_view_product(product_id));
create policy product_compliance_records_read_published
on public.product_compliance_records for select to anon, authenticated
using (app_private.can_view_product(product_id));
create policy product_related_products_read_published
on public.product_related_products for select to anon, authenticated
using (
  app_private.can_view_product(product_id)
  and app_private.can_view_product(related_product_id)
);
create policy product_option_groups_read_published
on public.product_option_groups for select to anon, authenticated
using (app_private.can_view_product(product_id));
create policy product_option_values_read_published
on public.product_option_values for select to anon, authenticated
using (
  exists (
    select 1 from public.product_option_groups as option_group
    where option_group.id = option_group_id
      and app_private.can_view_product(option_group.product_id)
  )
);
create policy product_option_rules_read_published
on public.product_option_rules for select to anon, authenticated
using (app_private.can_view_product(product_id));
create policy product_variants_read_published
on public.product_variants for select to anon, authenticated
using (app_private.can_view_product(product_id));
create policy product_variant_values_read_published
on public.product_variant_option_values for select to anon, authenticated
using (
  exists (
    select 1 from public.product_variants as variant
    where variant.id = variant_id
      and app_private.can_view_product(variant.product_id)
  )
);
create policy product_services_read_published
on public.product_services for select to anon, authenticated
using (app_private.can_view_product(product_id) and is_available);
create policy media_assets_read_public
on public.media_assets for select to anon, authenticated
using (app_private.can_view_media_asset(id));

create policy content_entries_read_published
on public.content_entries for select to anon, authenticated
using (app_private.can_view_content(id));
create policy content_translations_read_published
on public.content_translations for select to anon, authenticated
using (app_private.can_view_content(content_entry_id));
create policy content_media_read_published
on public.content_media for select to anon, authenticated
using (app_private.can_view_content(content_entry_id));
create policy content_taxonomy_terms_read_published
on public.content_taxonomy_terms for select to anon, authenticated
using (app_private.can_view_content(content_entry_id));
create policy content_products_read_published
on public.content_products for select to anon, authenticated
using (
  app_private.can_view_content(content_entry_id)
  and app_private.can_view_product(product_id)
);

-- Admin write policies are permission-specific and affect only new tables.

create policy currencies_manage
on public.currencies for all to authenticated
using (
  app_private.has_permission('catalog.manage')
  or app_private.has_permission('pricing.manage')
)
with check (
  app_private.has_permission('catalog.manage')
  or app_private.has_permission('pricing.manage')
);
create policy price_codes_manage
on public.price_codes for all to authenticated
using (app_private.has_permission('pricing.manage'))
with check (app_private.has_permission('pricing.manage'));
create policy taxonomies_manage
on public.taxonomies for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy taxonomy_terms_manage
on public.taxonomy_terms for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy products_manage
on public.products for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy product_translations_manage
on public.product_translations for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy product_taxonomy_terms_manage
on public.product_taxonomy_terms for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy product_specifications_manage
on public.product_specifications for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy product_media_manage
on public.product_media for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy product_compliance_records_manage
on public.product_compliance_records for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy product_related_products_manage
on public.product_related_products for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy product_option_groups_manage
on public.product_option_groups for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy product_option_values_manage
on public.product_option_values for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy product_option_rules_manage
on public.product_option_rules for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy product_variants_manage
on public.product_variants for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy product_variant_values_manage
on public.product_variant_option_values for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy services_manage
on public.services for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy product_services_manage
on public.product_services for all to authenticated
using (app_private.has_permission('catalog.manage'))
with check (app_private.has_permission('catalog.manage'));
create policy media_assets_manage
on public.media_assets for all to authenticated
using (
  app_private.has_permission('catalog.manage')
  or app_private.has_permission('content.manage')
)
with check (
  app_private.has_permission('catalog.manage')
  or app_private.has_permission('content.manage')
);

create policy content_entries_manage
on public.content_entries for all to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));
create policy content_translations_manage
on public.content_translations for all to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));
create policy content_media_manage
on public.content_media for all to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));
create policy content_taxonomy_terms_manage
on public.content_taxonomy_terms for all to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));
create policy content_products_manage
on public.content_products for all to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));

-- Price visibility and pricing administration -------------------------------

create policy price_books_read_visible
on public.price_books for select to anon, authenticated
using (app_private.can_view_price_book(id));
create policy product_price_grids_read_visible
on public.product_price_grids for select to anon, authenticated
using (
  is_active
  and app_private.can_view_product(product_id)
  and app_private.can_view_price_book(price_book_id)
);
create policy product_price_criteria_read_visible
on public.product_price_criteria for select to anon, authenticated
using (
  exists (
    select 1 from public.product_price_grids as price_grid
    where price_grid.id = price_grid_id
      and price_grid.is_active
      and app_private.can_view_product(price_grid.product_id)
      and app_private.can_view_price_book(price_grid.price_book_id)
  )
);
create policy product_price_tiers_read_visible
on public.product_price_tiers for select to anon, authenticated
using (
  exists (
    select 1 from public.product_price_grids as price_grid
    where price_grid.id = price_grid_id
      and price_grid.is_active
      and app_private.can_view_product(price_grid.product_id)
      and app_private.can_view_price_book(price_grid.price_book_id)
  )
);
create policy product_upcharge_grids_read_visible
on public.product_upcharge_grids for select to anon, authenticated
using (
  is_active
  and app_private.can_view_product(product_id)
  and app_private.can_view_price_book(price_book_id)
);
create policy product_upcharge_criteria_read_visible
on public.product_upcharge_criteria for select to anon, authenticated
using (
  exists (
    select 1 from public.product_upcharge_grids as upcharge_grid
    where upcharge_grid.id = upcharge_grid_id
      and upcharge_grid.is_active
      and app_private.can_view_product(upcharge_grid.product_id)
      and app_private.can_view_price_book(upcharge_grid.price_book_id)
  )
);
create policy product_upcharge_tiers_read_visible
on public.product_upcharge_tiers for select to anon, authenticated
using (
  exists (
    select 1 from public.product_upcharge_grids as upcharge_grid
    where upcharge_grid.id = upcharge_grid_id
      and upcharge_grid.is_active
      and app_private.can_view_product(upcharge_grid.product_id)
      and app_private.can_view_price_book(upcharge_grid.price_book_id)
  )
);

create policy price_books_manage
on public.price_books for all to authenticated
using (app_private.has_permission('pricing.manage'))
with check (app_private.has_permission('pricing.manage'));
create policy price_book_roles_manage
on public.price_book_roles for all to authenticated
using (app_private.has_permission('pricing.manage'))
with check (app_private.has_permission('pricing.manage'));
create policy product_price_grids_manage
on public.product_price_grids for all to authenticated
using (app_private.has_permission('pricing.manage'))
with check (app_private.has_permission('pricing.manage'));
create policy product_price_criteria_manage
on public.product_price_criteria for all to authenticated
using (app_private.has_permission('pricing.manage'))
with check (app_private.has_permission('pricing.manage'));
create policy product_price_tiers_manage
on public.product_price_tiers for all to authenticated
using (app_private.has_permission('pricing.manage'))
with check (app_private.has_permission('pricing.manage'));
create policy product_upcharge_grids_manage
on public.product_upcharge_grids for all to authenticated
using (app_private.has_permission('pricing.manage'))
with check (app_private.has_permission('pricing.manage'));
create policy product_upcharge_criteria_manage
on public.product_upcharge_criteria for all to authenticated
using (app_private.has_permission('pricing.manage'))
with check (app_private.has_permission('pricing.manage'));
create policy product_upcharge_tiers_manage
on public.product_upcharge_tiers for all to authenticated
using (app_private.has_permission('pricing.manage'))
with check (app_private.has_permission('pricing.manage'));

-- Inquiry and quote policies -------------------------------------------------

create policy inquiries_select
on public.inquiries for select to authenticated
using (app_private.can_access_inquiry(id));
create policy inquiries_insert
on public.inquiries for insert to authenticated
with check (customer_user_id = auth.uid() and status = 'draft');
create policy inquiries_update
on public.inquiries for update to authenticated
using (app_private.can_edit_inquiry(id) or app_private.can_manage_inquiry(id))
with check (app_private.can_access_inquiry(id));
create policy inquiries_delete
on public.inquiries for delete to authenticated
using (
  (customer_user_id = auth.uid() and status = 'draft')
  or app_private.can_manage_inquiry(id)
);

create policy inquiry_items_select
on public.inquiry_items for select to authenticated
using (app_private.can_access_inquiry(inquiry_id));
create policy inquiry_items_insert
on public.inquiry_items for insert to authenticated
with check (app_private.can_edit_inquiry(inquiry_id));
create policy inquiry_items_update
on public.inquiry_items for update to authenticated
using (app_private.can_edit_inquiry(inquiry_id))
with check (app_private.can_edit_inquiry(inquiry_id));
create policy inquiry_items_delete
on public.inquiry_items for delete to authenticated
using (app_private.can_edit_inquiry(inquiry_id));

create policy inquiry_item_options_select
on public.inquiry_item_option_selections for select to authenticated
using (
  exists (
    select 1 from public.inquiry_items as inquiry_item
    where inquiry_item.id = inquiry_item_id
      and app_private.can_access_inquiry(inquiry_item.inquiry_id)
  )
);
create policy inquiry_item_options_manage
on public.inquiry_item_option_selections for all to authenticated
using (
  exists (
    select 1 from public.inquiry_items as inquiry_item
    where inquiry_item.id = inquiry_item_id
      and app_private.can_edit_inquiry(inquiry_item.inquiry_id)
  )
)
with check (
  exists (
    select 1 from public.inquiry_items as inquiry_item
    where inquiry_item.id = inquiry_item_id
      and app_private.can_edit_inquiry(inquiry_item.inquiry_id)
  )
);

create policy inquiry_service_requests_select
on public.inquiry_item_service_requests for select to authenticated
using (
  exists (
    select 1 from public.inquiry_items as inquiry_item
    where inquiry_item.id = inquiry_item_id
      and app_private.can_access_inquiry(inquiry_item.inquiry_id)
  )
);
create policy inquiry_service_requests_manage
on public.inquiry_item_service_requests for all to authenticated
using (
  exists (
    select 1 from public.inquiry_items as inquiry_item
    where inquiry_item.id = inquiry_item_id
      and app_private.can_edit_inquiry(inquiry_item.inquiry_id)
  )
)
with check (
  exists (
    select 1 from public.inquiry_items as inquiry_item
    where inquiry_item.id = inquiry_item_id
      and app_private.can_edit_inquiry(inquiry_item.inquiry_id)
  )
);

create policy inquiry_attachments_select
on public.inquiry_attachments for select to authenticated
using (app_private.can_access_inquiry(inquiry_id));
create policy inquiry_attachments_insert
on public.inquiry_attachments for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and app_private.can_edit_inquiry(inquiry_id)
);
create policy inquiry_attachments_delete
on public.inquiry_attachments for delete to authenticated
using (
  uploaded_by = auth.uid()
  or app_private.can_manage_inquiry(inquiry_id)
);

create policy inquiry_status_history_select
on public.inquiry_status_history for select to authenticated
using (
  app_private.can_manage_inquiry(inquiry_id)
  or (visible_to_customer and app_private.can_access_inquiry(inquiry_id))
);

create policy inquiry_communications_select
on public.inquiry_communications for select to authenticated
using (
  app_private.can_manage_inquiry(inquiry_id)
  or (visible_to_customer and app_private.can_access_inquiry(inquiry_id))
);
create policy inquiry_communications_insert_customer
on public.inquiry_communications for insert to authenticated
with check (
  created_by = auth.uid()
  and visible_to_customer
  and direction = 'inbound'
  and app_private.can_access_inquiry(inquiry_id)
);
create policy inquiry_communications_manage
on public.inquiry_communications for all to authenticated
using (app_private.can_manage_inquiry(inquiry_id))
with check (app_private.can_manage_inquiry(inquiry_id));

create policy quotes_select
on public.quotes for select to authenticated
using (app_private.can_access_inquiry(inquiry_id));
create policy quotes_manage
on public.quotes for all to authenticated
using (app_private.can_manage_inquiry(inquiry_id))
with check (app_private.can_manage_inquiry(inquiry_id));
create policy quote_versions_select
on public.quote_versions for select to authenticated
using (app_private.can_view_quote_version(id));
create policy quote_versions_manage
on public.quote_versions for all to authenticated
using (
  exists (
    select 1 from public.quotes as quote
    where quote.id = quote_id
      and app_private.can_manage_inquiry(quote.inquiry_id)
  )
)
with check (
  exists (
    select 1 from public.quotes as quote
    where quote.id = quote_id
      and app_private.can_manage_inquiry(quote.inquiry_id)
  )
);
create policy quote_items_select
on public.quote_items for select to authenticated
using (app_private.can_view_quote_version(quote_version_id));
create policy quote_items_manage
on public.quote_items for all to authenticated
using (
  exists (
    select 1
    from public.quote_versions as quote_version
    join public.quotes as quote on quote.id = quote_version.quote_id
    where quote_version.id = quote_version_id
      and app_private.can_manage_inquiry(quote.inquiry_id)
  )
)
with check (
  exists (
    select 1
    from public.quote_versions as quote_version
    join public.quotes as quote on quote.id = quote_version.quote_id
    where quote_version.id = quote_version_id
      and app_private.can_manage_inquiry(quote.inquiry_id)
  )
);
create policy quote_item_options_select
on public.quote_item_options for select to authenticated
using (
  exists (
    select 1 from public.quote_items as quote_item
    where quote_item.id = quote_item_id
      and app_private.can_view_quote_version(quote_item.quote_version_id)
  )
);
create policy quote_item_options_manage
on public.quote_item_options for all to authenticated
using (
  exists (
    select 1
    from public.quote_items as quote_item
    join public.quote_versions as quote_version
      on quote_version.id = quote_item.quote_version_id
    join public.quotes as quote on quote.id = quote_version.quote_id
    where quote_item.id = quote_item_id
      and app_private.can_manage_inquiry(quote.inquiry_id)
  )
)
with check (
  exists (
    select 1
    from public.quote_items as quote_item
    join public.quote_versions as quote_version
      on quote_version.id = quote_item.quote_version_id
    join public.quotes as quote on quote.id = quote_version.quote_id
    where quote_item.id = quote_item_id
      and app_private.can_manage_inquiry(quote.inquiry_id)
  )
);
create policy quote_adjustments_select
on public.quote_adjustments for select to authenticated
using (app_private.can_view_quote_version(quote_version_id));
create policy quote_adjustments_manage
on public.quote_adjustments for all to authenticated
using (
  exists (
    select 1
    from public.quote_versions as quote_version
    join public.quotes as quote on quote.id = quote_version.quote_id
    where quote_version.id = quote_version_id
      and app_private.can_manage_inquiry(quote.inquiry_id)
  )
)
with check (
  exists (
    select 1
    from public.quote_versions as quote_version
    join public.quotes as quote on quote.id = quote_version.quote_id
    where quote_version.id = quote_version_id
      and app_private.can_manage_inquiry(quote.inquiry_id)
  )
);
create policy quote_responses_select
on public.quote_responses for select to authenticated
using (app_private.can_view_quote_version(quote_version_id));
create policy quote_responses_insert
on public.quote_responses for insert to authenticated
with check (
  user_id = auth.uid()
  and app_private.can_view_quote_version(quote_version_id)
);

-- Explicit Data API grants. RLS remains the row-level authorization boundary.

grant select on table
  public.currencies,
  public.price_codes,
  public.taxonomies,
  public.taxonomy_terms,
  public.products,
  public.product_translations,
  public.product_taxonomy_terms,
  public.product_specifications,
  public.media_assets,
  public.product_media,
  public.product_compliance_records,
  public.product_related_products,
  public.product_option_groups,
  public.product_option_values,
  public.product_option_rules,
  public.product_variants,
  public.product_variant_option_values,
  public.services,
  public.product_services,
  public.price_books,
  public.product_price_grids,
  public.product_price_criteria,
  public.product_price_tiers,
  public.product_upcharge_grids,
  public.product_upcharge_criteria,
  public.product_upcharge_tiers,
  public.content_entries,
  public.content_translations,
  public.content_media,
  public.content_taxonomy_terms,
  public.content_products
to anon;

grant select, insert, update, delete on table
  public.profiles,
  public.organizations,
  public.organization_addresses,
  public.organization_members,
  public.roles,
  public.permissions,
  public.role_permissions,
  public.user_roles,
  public.currencies,
  public.price_codes,
  public.taxonomies,
  public.taxonomy_terms,
  public.products,
  public.product_translations,
  public.product_taxonomy_terms,
  public.product_specifications,
  public.media_assets,
  public.product_media,
  public.product_compliance_records,
  public.product_related_products,
  public.product_option_groups,
  public.product_option_values,
  public.product_option_rules,
  public.product_variants,
  public.product_variant_option_values,
  public.services,
  public.product_services,
  public.price_books,
  public.price_book_roles,
  public.product_price_grids,
  public.product_price_criteria,
  public.product_price_tiers,
  public.product_upcharge_grids,
  public.product_upcharge_criteria,
  public.product_upcharge_tiers,
  public.content_entries,
  public.content_translations,
  public.content_media,
  public.content_taxonomy_terms,
  public.content_products,
  public.inquiries,
  public.inquiry_items,
  public.inquiry_item_option_selections,
  public.inquiry_item_service_requests,
  public.inquiry_attachments,
  public.inquiry_status_history,
  public.inquiry_communications,
  public.quotes,
  public.quote_versions,
  public.quote_items,
  public.quote_item_options,
  public.quote_adjustments,
  public.quote_responses
to authenticated;

grant all privileges on table
  public.profiles,
  public.organizations,
  public.organization_addresses,
  public.organization_members,
  public.roles,
  public.permissions,
  public.role_permissions,
  public.user_roles,
  public.currencies,
  public.price_codes,
  public.taxonomies,
  public.taxonomy_terms,
  public.products,
  public.product_translations,
  public.product_taxonomy_terms,
  public.product_specifications,
  public.media_assets,
  public.product_media,
  public.product_compliance_records,
  public.product_related_products,
  public.product_option_groups,
  public.product_option_values,
  public.product_option_rules,
  public.product_variants,
  public.product_variant_option_values,
  public.services,
  public.product_services,
  public.price_books,
  public.price_book_roles,
  public.product_price_grids,
  public.product_price_criteria,
  public.product_price_tiers,
  public.product_upcharge_grids,
  public.product_upcharge_criteria,
  public.product_upcharge_tiers,
  public.content_entries,
  public.content_translations,
  public.content_media,
  public.content_taxonomy_terms,
  public.content_products,
  public.inquiries,
  public.inquiry_items,
  public.inquiry_item_option_selections,
  public.inquiry_item_service_requests,
  public.inquiry_attachments,
  public.inquiry_status_history,
  public.inquiry_communications,
  public.quotes,
  public.quote_versions,
  public.quote_items,
  public.quote_item_options,
  public.quote_adjustments,
  public.quote_responses
to service_role;

-- Storage: public catalogue media, private inquiry files ---------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values
  (
    'product-media',
    'product-media',
    true,
    26214400,
    array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      'application/pdf', 'video/mp4'
    ]::text[]
  ),
  (
    'inquiry-attachments',
    'inquiry-attachments',
    false,
    26214400,
    array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      'application/pdf', 'application/postscript', 'application/octet-stream',
      'application/zip', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]::text[]
  )
on conflict (id) do nothing;

create policy product_media_objects_read
on storage.objects for select to anon, authenticated
using (bucket_id = 'product-media');

create policy product_media_objects_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-media'
  and (
    app_private.has_permission('catalog.manage')
    or app_private.has_permission('content.manage')
  )
);

create policy product_media_objects_update
on storage.objects for update to authenticated
using (
  bucket_id = 'product-media'
  and (
    app_private.has_permission('catalog.manage')
    or app_private.has_permission('content.manage')
  )
)
with check (
  bucket_id = 'product-media'
  and (
    app_private.has_permission('catalog.manage')
    or app_private.has_permission('content.manage')
  )
);

create policy product_media_objects_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-media'
  and (
    app_private.has_permission('catalog.manage')
    or app_private.has_permission('content.manage')
  )
);

create policy inquiry_attachment_objects_read
on storage.objects for select to authenticated
using (
  bucket_id = 'inquiry-attachments'
  and (
    owner_id = auth.uid()::text
    or app_private.has_permission('inquiries.manage')
    or exists (
      select 1
      from public.inquiry_attachments as attachment
      where attachment.object_path = name
        and app_private.can_access_inquiry(attachment.inquiry_id)
    )
  )
);

create policy inquiry_attachment_objects_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'inquiry-attachments'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy inquiry_attachment_objects_update
on storage.objects for update to authenticated
using (
  bucket_id = 'inquiry-attachments'
  and (
    owner_id = auth.uid()::text
    or app_private.has_permission('inquiries.manage')
  )
)
with check (
  bucket_id = 'inquiry-attachments'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or app_private.has_permission('inquiries.manage')
  )
);

create policy inquiry_attachment_objects_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'inquiry-attachments'
  and (
    owner_id = auth.uid()::text
    or app_private.has_permission('inquiries.manage')
  )
);
