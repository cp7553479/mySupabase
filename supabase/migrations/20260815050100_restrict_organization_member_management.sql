-- Enterprise members are assigned only by platform administrators.
drop policy if exists organization_members_insert on public.organization_members;
drop policy if exists organization_members_update on public.organization_members;
drop policy if exists organization_members_delete on public.organization_members;

create policy organization_members_insert
on public.organization_members for insert to authenticated
with check (
  app_private.has_permission('members.manage')
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

create policy organization_members_update
on public.organization_members for update to authenticated
using (app_private.has_permission('members.manage'))
with check (app_private.has_permission('members.manage'));

create policy organization_members_delete
on public.organization_members for delete to authenticated
using (app_private.has_permission('members.manage'));
