import { notFound, redirect } from "next/navigation";

import { OrganizationMemberManager } from "@/components/admin/organization-member-manager";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentUserPermissionCodes } from "@/lib/auth/permissions";
import { isLocale } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RawMember = {
  membership_role: "owner" | "admin" | "buyer" | "member";
  status: "active" | "invited" | "left" | "suspended";
  user_id: string;
};

type RawOrganization = {
  id: string;
  name: string;
};

export const dynamic = "force-dynamic";

export default async function AdminMembersPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (typeof claimsData?.claims.sub !== "string")
    redirect(`/${locale}/account`);

  const permissions = await getCurrentUserPermissionCodes();
  if (!permissions.has("members.manage")) redirect(`/${locale}/admin`);

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name")
    .order("name");
  if (error) {
    throw new Error(`Could not read companies: ${error.message}`);
  }

  const rawOrganizations = (data ?? []) as RawOrganization[];
  const organizationIds = rawOrganizations.map(
    (organization) => organization.id,
  );
  const { data: memberships, error: membershipsError } = organizationIds.length
    ? await supabase
        .from("organization_members")
        .select("organization_id, user_id, membership_role, status")
        .in("organization_id", organizationIds)
    : { data: [], error: null };
  if (membershipsError) {
    throw new Error(
      `Could not read company members: ${membershipsError.message}`,
    );
  }

  const rawMembers = (memberships ?? []) as (RawMember & {
    organization_id: string;
  })[];
  const memberIds = rawMembers.map((member) => member.user_id);
  const { data: profiles, error: profilesError } = memberIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", memberIds)
    : { data: [], error: null };
  if (profilesError) {
    throw new Error(`Could not read member profiles: ${profilesError.message}`);
  }
  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );

  const organizations = rawOrganizations.map((organization) => ({
    id: organization.id,
    members: rawMembers
      .filter((member) => member.organization_id === organization.id)
      .map((member) => ({
        email: profilesById.get(member.user_id)?.email ?? null,
        fullName: profilesById.get(member.user_id)?.full_name ?? null,
        membershipRole: member.membership_role,
        status: member.status,
        userId: member.user_id,
      })),
    name: organization.name,
  }));

  return (
    <AdminShell locale={locale}>
      <OrganizationMemberManager
        locale={locale}
        organizations={organizations}
      />
    </AdminShell>
  );
}
