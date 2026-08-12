drop policy home_sections_manage on public.home_sections;
drop policy home_section_translations_manage on public.home_section_translations;

create policy home_sections_insert_manage
on public.home_sections for insert to authenticated
with check (app_private.has_permission('content.manage'));

create policy home_sections_update_manage
on public.home_sections for update to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));

create policy home_sections_delete_manage
on public.home_sections for delete to authenticated
using (app_private.has_permission('content.manage'));

create policy home_section_translations_insert_manage
on public.home_section_translations for insert to authenticated
with check (app_private.has_permission('content.manage'));

create policy home_section_translations_update_manage
on public.home_section_translations for update to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));

create policy home_section_translations_delete_manage
on public.home_section_translations for delete to authenticated
using (app_private.has_permission('content.manage'));
