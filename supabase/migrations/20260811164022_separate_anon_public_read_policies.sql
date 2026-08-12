-- Anonymous policies contain only public catalogue/content/price predicates.
-- Authenticated policies retain their combined public + manager draft access.

revoke execute on function app_private.has_permission(text) from anon;

alter policy currencies_read_active on public.currencies to authenticated;
create policy currencies_read_active_anon
on public.currencies for select to anon
using (is_active);

alter policy price_codes_read_active on public.price_codes to authenticated;
create policy price_codes_read_active_anon
on public.price_codes for select to anon
using (is_active);

alter policy taxonomies_read_active on public.taxonomies to authenticated;
create policy taxonomies_read_active_anon
on public.taxonomies for select to anon
using (is_active);

alter policy taxonomy_terms_read_active on public.taxonomy_terms to authenticated;
create policy taxonomy_terms_read_active_anon
on public.taxonomy_terms for select to anon
using (
  is_active and exists (
    select 1
    from public.taxonomies as taxonomy
    where taxonomy.id = taxonomy_id
      and taxonomy.is_active
  )
);

alter policy services_read_active on public.services to authenticated;
create policy services_read_active_anon
on public.services for select to anon
using (is_active);

alter policy products_read_published on public.products to authenticated;
create policy products_read_published_anon
on public.products for select to anon
using (app_private.can_view_product(id));

alter policy product_translations_read_published
on public.product_translations to authenticated;
create policy product_translations_read_published_anon
on public.product_translations for select to anon
using (app_private.can_view_product(product_id));

alter policy product_taxonomy_terms_read_published
on public.product_taxonomy_terms to authenticated;
create policy product_taxonomy_terms_read_published_anon
on public.product_taxonomy_terms for select to anon
using (app_private.can_view_product(product_id));

alter policy product_specifications_read_published
on public.product_specifications to authenticated;
create policy product_specifications_read_published_anon
on public.product_specifications for select to anon
using (app_private.can_view_product(product_id));

alter policy product_media_read_published
on public.product_media to authenticated;
create policy product_media_read_published_anon
on public.product_media for select to anon
using (app_private.can_view_product(product_id));

alter policy product_compliance_records_read_published
on public.product_compliance_records to authenticated;
create policy product_compliance_records_read_published_anon
on public.product_compliance_records for select to anon
using (app_private.can_view_product(product_id));

alter policy product_related_products_read_published
on public.product_related_products to authenticated;
create policy product_related_products_read_published_anon
on public.product_related_products for select to anon
using (
  app_private.can_view_product(product_id)
  and app_private.can_view_product(related_product_id)
);

alter policy product_option_groups_read_published
on public.product_option_groups to authenticated;
create policy product_option_groups_read_published_anon
on public.product_option_groups for select to anon
using (app_private.can_view_product(product_id));

alter policy product_option_values_read_published
on public.product_option_values to authenticated;
create policy product_option_values_read_published_anon
on public.product_option_values for select to anon
using (
  exists (
    select 1
    from public.product_option_groups as option_group
    where option_group.id = option_group_id
      and app_private.can_view_product(option_group.product_id)
  )
);

alter policy product_option_rules_read_published
on public.product_option_rules to authenticated;
create policy product_option_rules_read_published_anon
on public.product_option_rules for select to anon
using (app_private.can_view_product(product_id));

alter policy product_variants_read_published
on public.product_variants to authenticated;
create policy product_variants_read_published_anon
on public.product_variants for select to anon
using (app_private.can_view_product(product_id));

alter policy product_variant_values_read_published
on public.product_variant_option_values to authenticated;
create policy product_variant_values_read_published_anon
on public.product_variant_option_values for select to anon
using (
  exists (
    select 1
    from public.product_variants as variant
    where variant.id = variant_id
      and app_private.can_view_product(variant.product_id)
  )
);

alter policy product_services_read_published
on public.product_services to authenticated;
create policy product_services_read_published_anon
on public.product_services for select to anon
using (
  app_private.can_view_product(product_id)
  and is_available
);

alter policy media_assets_read_public
on public.media_assets to authenticated;
create policy media_assets_read_public_anon
on public.media_assets for select to anon
using (app_private.can_view_media_asset(id));

alter policy content_entries_read_published
on public.content_entries to authenticated;
create policy content_entries_read_published_anon
on public.content_entries for select to anon
using (app_private.can_view_content(id));

alter policy content_translations_read_published
on public.content_translations to authenticated;
create policy content_translations_read_published_anon
on public.content_translations for select to anon
using (app_private.can_view_content(content_entry_id));

alter policy content_media_read_published
on public.content_media to authenticated;
create policy content_media_read_published_anon
on public.content_media for select to anon
using (app_private.can_view_content(content_entry_id));

alter policy content_taxonomy_terms_read_published
on public.content_taxonomy_terms to authenticated;
create policy content_taxonomy_terms_read_published_anon
on public.content_taxonomy_terms for select to anon
using (app_private.can_view_content(content_entry_id));

alter policy content_products_read_published
on public.content_products to authenticated;
create policy content_products_read_published_anon
on public.content_products for select to anon
using (
  app_private.can_view_content(content_entry_id)
  and app_private.can_view_product(product_id)
);

alter policy price_books_read_visible
on public.price_books to authenticated;
create policy price_books_read_visible_anon
on public.price_books for select to anon
using (app_private.can_view_price_book(id));

alter policy product_price_grids_read_visible
on public.product_price_grids to authenticated;
create policy product_price_grids_read_visible_anon
on public.product_price_grids for select to anon
using (
  is_active
  and app_private.can_view_product(product_id)
  and app_private.can_view_price_book(price_book_id)
);

alter policy product_price_criteria_read_visible
on public.product_price_criteria to authenticated;
create policy product_price_criteria_read_visible_anon
on public.product_price_criteria for select to anon
using (
  exists (
    select 1
    from public.product_price_grids as price_grid
    where price_grid.id = price_grid_id
      and price_grid.is_active
      and app_private.can_view_product(price_grid.product_id)
      and app_private.can_view_price_book(price_grid.price_book_id)
  )
);

alter policy product_price_tiers_read_visible
on public.product_price_tiers to authenticated;
create policy product_price_tiers_read_visible_anon
on public.product_price_tiers for select to anon
using (
  exists (
    select 1
    from public.product_price_grids as price_grid
    where price_grid.id = price_grid_id
      and price_grid.is_active
      and app_private.can_view_product(price_grid.product_id)
      and app_private.can_view_price_book(price_grid.price_book_id)
  )
);

alter policy product_upcharge_grids_read_visible
on public.product_upcharge_grids to authenticated;
create policy product_upcharge_grids_read_visible_anon
on public.product_upcharge_grids for select to anon
using (
  is_active
  and app_private.can_view_product(product_id)
  and app_private.can_view_price_book(price_book_id)
);

alter policy product_upcharge_criteria_read_visible
on public.product_upcharge_criteria to authenticated;
create policy product_upcharge_criteria_read_visible_anon
on public.product_upcharge_criteria for select to anon
using (
  exists (
    select 1
    from public.product_upcharge_grids as upcharge_grid
    where upcharge_grid.id = upcharge_grid_id
      and upcharge_grid.is_active
      and app_private.can_view_product(upcharge_grid.product_id)
      and app_private.can_view_price_book(upcharge_grid.price_book_id)
  )
);

alter policy product_upcharge_tiers_read_visible
on public.product_upcharge_tiers to authenticated;
create policy product_upcharge_tiers_read_visible_anon
on public.product_upcharge_tiers for select to anon
using (
  exists (
    select 1
    from public.product_upcharge_grids as upcharge_grid
    where upcharge_grid.id = upcharge_grid_id
      and upcharge_grid.is_active
      and app_private.can_view_product(upcharge_grid.product_id)
      and app_private.can_view_price_book(upcharge_grid.price_book_id)
  )
);
