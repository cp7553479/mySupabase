-- Keep one SELECT policy per role and table while preserving existing access.

drop policy organization_price_books_select on public.organization_price_books;
drop policy organization_price_books_manage on public.organization_price_books;
create policy organization_price_books_select
on public.organization_price_books for select to authenticated
using (
  app_private.is_organization_member(organization_id)
  or app_private.has_permission('pricing.manage')
);
create policy organization_price_books_insert
on public.organization_price_books for insert to authenticated
with check (app_private.has_permission('pricing.manage'));
create policy organization_price_books_update
on public.organization_price_books for update to authenticated
using (app_private.has_permission('pricing.manage'))
with check (app_private.has_permission('pricing.manage'));
create policy organization_price_books_delete
on public.organization_price_books for delete to authenticated
using (app_private.has_permission('pricing.manage'));

drop policy site_settings_manage on public.site_settings;
create policy site_settings_insert
on public.site_settings for insert to authenticated
with check (app_private.has_permission('content.manage'));
create policy site_settings_update
on public.site_settings for update to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));
create policy site_settings_delete
on public.site_settings for delete to authenticated
using (app_private.has_permission('content.manage'));

drop policy site_locales_manage on public.site_locales;
create policy site_locales_insert
on public.site_locales for insert to authenticated
with check (app_private.has_permission('content.manage'));
create policy site_locales_update
on public.site_locales for update to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));
create policy site_locales_delete
on public.site_locales for delete to authenticated
using (app_private.has_permission('content.manage'));

drop policy navigation_menus_manage on public.navigation_menus;
create policy navigation_menus_insert
on public.navigation_menus for insert to authenticated
with check (app_private.has_permission('content.manage'));
create policy navigation_menus_update
on public.navigation_menus for update to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));
create policy navigation_menus_delete
on public.navigation_menus for delete to authenticated
using (app_private.has_permission('content.manage'));

drop policy navigation_items_manage on public.navigation_items;
create policy navigation_items_insert
on public.navigation_items for insert to authenticated
with check (app_private.has_permission('content.manage'));
create policy navigation_items_update
on public.navigation_items for update to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));
create policy navigation_items_delete
on public.navigation_items for delete to authenticated
using (app_private.has_permission('content.manage'));

drop policy navigation_item_translations_manage on public.navigation_item_translations;
create policy navigation_item_translations_insert
on public.navigation_item_translations for insert to authenticated
with check (app_private.has_permission('content.manage'));
create policy navigation_item_translations_update
on public.navigation_item_translations for update to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));
create policy navigation_item_translations_delete
on public.navigation_item_translations for delete to authenticated
using (app_private.has_permission('content.manage'));
