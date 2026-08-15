import { NextRequest, NextResponse } from "next/server";

import { requireAdminPermission } from "@/lib/admin/guards";
import { isLocale } from "@/lib/i18n";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const assignableRoles = ["admin", "buyer", "member"] as const;
const manageableStatuses = ["active", "suspended"] as const;

type MembershipRole = (typeof assignableRoles)[number];
type ManageableStatus = (typeof manageableStatuses)[number];

function textValue(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function isAssignableRole(value: unknown): value is MembershipRole {
  return assignableRoles.includes(value as MembershipRole);
}

function isManageableStatus(value: unknown): value is ManageableStatus {
  return manageableStatuses.includes(value as ManageableStatus);
}

async function ensureOrganizationExists(
  organizationId: string,
  adminClient: ReturnType<typeof createAdminSupabaseClient>,
) {
  const { data, error } = await adminClient
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) throw new Error(`Could not read company: ${error.message}`);
  return Boolean(data);
}

export async function POST(request: NextRequest) {
  const caller = await requireAdminPermission("members.manage");
  if ("status" in caller) {
    return NextResponse.json(
      { error: caller.error },
      { status: caller.status },
    );
  }

  const payload = (await request.json()) as {
    email?: unknown;
    locale?: unknown;
    membershipRole?: unknown;
    organizationId?: unknown;
  };
  const email = textValue(payload.email)?.toLowerCase();
  const organizationId = textValue(payload.organizationId);
  const locale = textValue(payload.locale);

  if (!email || !organizationId || !isAssignableRole(payload.membershipRole)) {
    return NextResponse.json(
      { error: "Email, company, and role are required." },
      { status: 400 },
    );
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const adminClient = createAdminSupabaseClient();
  if (!(await ensureOrganizationExists(organizationId, adminClient))) {
    return NextResponse.json(
      { error: "Company was not found." },
      { status: 404 },
    );
  }

  const { data: existingProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (profileError) {
    return NextResponse.json(
      { error: "Could not look up the account." },
      { status: 500 },
    );
  }

  if (existingProfile) {
    const { data: existingMembership, error: membershipReadError } =
      await adminClient
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("user_id", existingProfile.id)
        .maybeSingle();
    if (membershipReadError) {
      return NextResponse.json(
        { error: "Could not check the existing member." },
        { status: 500 },
      );
    }
    if (existingMembership) {
      return NextResponse.json(
        { error: "This account is already a member of the selected company." },
        { status: 409 },
      );
    }

    const { error: membershipError } = await adminClient
      .from("organization_members")
      .insert({
        invited_by: caller.userId,
        membership_role: payload.membershipRole,
        organization_id: organizationId,
        status: "active",
        user_id: existingProfile.id,
      });
    if (membershipError) {
      return NextResponse.json(
        { error: "Could not add the existing account to this company." },
        { status: 500 },
      );
    }
    return NextResponse.json({ outcome: "added" }, { status: 201 });
  }

  const resolvedLocale = locale && isLocale(locale) ? locale : "en";
  const redirectTo = new URL(
    `/${resolvedLocale}/account`,
    request.url,
  ).toString();
  const { data: invitation, error: invitationError } =
    await adminClient.auth.admin.inviteUserByEmail(email, { redirectTo });
  const invitedUser = invitation.user;

  if (invitationError || !invitedUser) {
    return NextResponse.json(
      { error: invitationError?.message ?? "Could not send the invitation." },
      { status: 500 },
    );
  }

  const { error: membershipError } = await adminClient
    .from("organization_members")
    .insert({
      invited_by: caller.userId,
      membership_role: payload.membershipRole,
      organization_id: organizationId,
      status: "invited",
      user_id: invitedUser.id,
    });
  if (membershipError) {
    return NextResponse.json(
      {
        error: "Invitation was sent, but company access could not be assigned.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ outcome: "invited" }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const caller = await requireAdminPermission("members.manage");
  if ("status" in caller) {
    return NextResponse.json(
      { error: caller.error },
      { status: caller.status },
    );
  }

  const payload = (await request.json()) as {
    membershipRole?: unknown;
    organizationId?: unknown;
    status?: unknown;
    userId?: unknown;
  };
  const organizationId = textValue(payload.organizationId);
  const userId = textValue(payload.userId);
  const roleIsPresent = payload.membershipRole !== undefined;
  const statusIsPresent = payload.status !== undefined;

  if (
    !organizationId ||
    !userId ||
    (!roleIsPresent && !statusIsPresent) ||
    (roleIsPresent && !isAssignableRole(payload.membershipRole)) ||
    (statusIsPresent && !isManageableStatus(payload.status))
  ) {
    return NextResponse.json(
      { error: "Invalid member update." },
      { status: 400 },
    );
  }

  const changes: {
    membership_role?: MembershipRole;
    status?: ManageableStatus;
  } = {};
  if (isAssignableRole(payload.membershipRole))
    changes.membership_role = payload.membershipRole;
  if (isManageableStatus(payload.status)) changes.status = payload.status;

  const { error } = await createAdminSupabaseClient()
    .from("organization_members")
    .update(changes)
    .eq("organization_id", organizationId)
    .eq("user_id", userId);
  return error
    ? NextResponse.json(
        { error: "Could not update the member." },
        { status: 500 },
      )
    : new NextResponse(null, { status: 204 });
}

export async function DELETE(request: NextRequest) {
  const caller = await requireAdminPermission("members.manage");
  if ("status" in caller) {
    return NextResponse.json(
      { error: caller.error },
      { status: caller.status },
    );
  }

  const organizationId = request.nextUrl.searchParams.get("organizationId");
  const userId = request.nextUrl.searchParams.get("userId");
  if (!organizationId || !userId) {
    return NextResponse.json({ error: "Member is required." }, { status: 400 });
  }

  const { error } = await createAdminSupabaseClient()
    .from("organization_members")
    .delete()
    .eq("organization_id", organizationId)
    .eq("user_id", userId);
  return error
    ? NextResponse.json(
        { error: "Could not remove the member." },
        { status: 500 },
      )
    : new NextResponse(null, { status: 204 });
}
