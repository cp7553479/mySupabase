-- Keep one permissive policy per role/action while retaining manager access to
-- drafts. This is a performance-only rewrite of policies created in the
-- preceding LogoPress migration.

do $$
declare
  managed_policy record;
  current_policy_name text;
  current_policy_qual text;
  current_policy_check text;
begin
  for managed_policy in
    select
      requested.policy_name,
      requested.table_name,
      policy.qual,
      policy.with_check
    from (
      values
        ('roles_manage', 'roles'),
        ('permissions_manage', 'permissions'),
        ('role_permissions_manage', 'role_permissions'),
        ('user_roles_manage', 'user_roles'),
        ('organization_addresses_manage', 'organization_addresses'),
        ('currencies_manage', 'currencies'),
        ('price_codes_manage', 'price_codes'),
        ('taxonomies_manage', 'taxonomies'),
        ('taxonomy_terms_manage', 'taxonomy_terms'),
        ('products_manage', 'products'),
        ('product_translations_manage', 'product_translations'),
        ('product_taxonomy_terms_manage', 'product_taxonomy_terms'),
        ('product_specifications_manage', 'product_specifications'),
        ('product_media_manage', 'product_media'),
        ('product_compliance_records_manage', 'product_compliance_records'),
        ('product_related_products_manage', 'product_related_products'),
        ('product_option_groups_manage', 'product_option_groups'),
        ('product_option_values_manage', 'product_option_values'),
        ('product_option_rules_manage', 'product_option_rules'),
        ('product_variants_manage', 'product_variants'),
        ('product_variant_values_manage', 'product_variant_option_values'),
        ('services_manage', 'services'),
        ('product_services_manage', 'product_services'),
        ('media_assets_manage', 'media_assets'),
        ('content_entries_manage', 'content_entries'),
        ('content_translations_manage', 'content_translations'),
        ('content_media_manage', 'content_media'),
        ('content_taxonomy_terms_manage', 'content_taxonomy_terms'),
        ('content_products_manage', 'content_products'),
        ('price_books_manage', 'price_books'),
        ('price_book_roles_manage', 'price_book_roles'),
        ('product_price_grids_manage', 'product_price_grids'),
        ('product_price_criteria_manage', 'product_price_criteria'),
        ('product_price_tiers_manage', 'product_price_tiers'),
        ('product_upcharge_grids_manage', 'product_upcharge_grids'),
        ('product_upcharge_criteria_manage', 'product_upcharge_criteria'),
        ('product_upcharge_tiers_manage', 'product_upcharge_tiers'),
        ('inquiry_item_options_manage', 'inquiry_item_option_selections'),
        ('inquiry_service_requests_manage', 'inquiry_item_service_requests'),
        ('inquiry_communications_manage', 'inquiry_communications'),
        ('quotes_manage', 'quotes'),
        ('quote_versions_manage', 'quote_versions'),
        ('quote_items_manage', 'quote_items'),
        ('quote_item_options_manage', 'quote_item_options'),
        ('quote_adjustments_manage', 'quote_adjustments')
    ) as requested(policy_name, table_name)
    join pg_policies as policy
      on policy.schemaname = 'public'
      and policy.tablename = requested.table_name
      and policy.policyname = requested.policy_name
      and policy.cmd = 'ALL'
  loop
    current_policy_name := null;
    current_policy_qual := null;
    current_policy_check := null;
    select policy.policyname, policy.qual, policy.with_check
    into current_policy_name, current_policy_qual, current_policy_check
    from pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = managed_policy.table_name
      and policy.cmd = 'SELECT'
      and policy.roles @> array['authenticated']::name[]
    order by policy.policyname
    limit 1;

    if current_policy_name is null then
      execute format(
        'create policy %I on public.%I for select to authenticated using ((%s))',
        managed_policy.policy_name || '_select',
        managed_policy.table_name,
        managed_policy.qual
      );
    else
      execute format(
        'alter policy %I on public.%I using ((%s) or (%s))',
        current_policy_name,
        managed_policy.table_name,
        current_policy_qual,
        managed_policy.qual
      );
    end if;

    current_policy_name := null;
    current_policy_qual := null;
    current_policy_check := null;
    select policy.policyname, policy.qual, policy.with_check
    into current_policy_name, current_policy_qual, current_policy_check
    from pg_policies as policy
    where policy.schemaname = 'public'
      and policy.tablename = managed_policy.table_name
      and policy.cmd = 'INSERT'
      and policy.roles @> array['authenticated']::name[]
    order by policy.policyname
    limit 1;

    if current_policy_name is null then
      execute format(
        'create policy %I on public.%I for insert to authenticated with check ((%s))',
        managed_policy.policy_name || '_insert',
        managed_policy.table_name,
        managed_policy.with_check
      );
    else
      execute format(
        'alter policy %I on public.%I with check ((%s) or (%s))',
        current_policy_name,
        managed_policy.table_name,
        current_policy_check,
        managed_policy.with_check
      );
    end if;

    execute format(
      'create policy %I on public.%I for update to authenticated '
      'using ((%s)) with check ((%s))',
      managed_policy.policy_name || '_update',
      managed_policy.table_name,
      managed_policy.qual,
      managed_policy.with_check
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using ((%s))',
      managed_policy.policy_name || '_delete',
      managed_policy.table_name,
      managed_policy.qual
    );

    execute format(
      'drop policy %I on public.%I',
      managed_policy.policy_name,
      managed_policy.table_name
    );
  end loop;
end;
$$;

-- Cache Auth UID once per statement in policies that compare it directly.

alter policy profiles_select
on public.profiles
using (
  id = (select auth.uid())
  or app_private.shares_organization(id)
  or app_private.has_permission('members.manage')
);

alter policy profiles_insert_own
on public.profiles
with check (id = (select auth.uid()));

alter policy profiles_update_own_or_manager
on public.profiles
using (
  id = (select auth.uid())
  or app_private.has_permission('members.manage')
)
with check (
  id = (select auth.uid())
  or app_private.has_permission('members.manage')
);

alter policy user_roles_select
on public.user_roles
using (
  user_id = (select auth.uid())
  or app_private.has_permission('members.manage')
);

alter policy organizations_select
on public.organizations
using (
  app_private.is_organization_member(id)
  or created_by = (select auth.uid())
  or app_private.has_permission('members.manage')
);

alter policy organizations_insert
on public.organizations
with check (created_by = (select auth.uid()));

alter policy organization_members_insert
on public.organization_members
with check (
  app_private.can_manage_organization(organization_id)
  or (
    user_id = (select auth.uid())
    and membership_role = 'owner'
    and exists (
      select 1
      from public.organizations as organization
      where organization.id = organization_id
        and organization.created_by = (select auth.uid())
    )
  )
);

alter policy inquiries_insert
on public.inquiries
with check (
  customer_user_id = (select auth.uid())
  and status = 'draft'
);

alter policy inquiries_delete
on public.inquiries
using (
  (
    customer_user_id = (select auth.uid())
    and status = 'draft'
  )
  or app_private.can_manage_inquiry(id)
);

alter policy inquiry_attachments_insert
on public.inquiry_attachments
with check (
  uploaded_by = (select auth.uid())
  and app_private.can_edit_inquiry(inquiry_id)
);

alter policy inquiry_attachments_delete
on public.inquiry_attachments
using (
  uploaded_by = (select auth.uid())
  or app_private.can_manage_inquiry(inquiry_id)
);

alter policy inquiry_communications_insert_customer
on public.inquiry_communications
with check (
  (
    created_by = (select auth.uid())
    and visible_to_customer
    and direction = 'inbound'
    and app_private.can_access_inquiry(inquiry_id)
  )
  or app_private.can_manage_inquiry(inquiry_id)
);

alter policy quote_responses_insert
on public.quote_responses
with check (
  user_id = (select auth.uid())
  and app_private.can_view_quote_version(quote_version_id)
);
