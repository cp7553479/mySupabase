import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type OrganizationPayload = {
  industry?: unknown;
  name?: unknown;
  website?: unknown;
};

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() || null : null;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function getUserOrganization() {
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (typeof userId !== "string") return { supabase, userId: null };
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error)
    throw new Error(`Could not read organization membership: ${error.message}`);
  return {
    organizationId: (data as { organization_id: string } | null)
      ?.organization_id,
    supabase,
    userId,
  };
}

export async function POST(request: Request) {
  const payload = (await request.json()) as OrganizationPayload;
  const name = textValue(payload.name);
  const { organizationId, supabase, userId } = await getUserOrganization();
  if (!userId)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  if (!name)
    return NextResponse.json(
      { error: "Company name is required." },
      { status: 400 },
    );
  if (organizationId)
    return NextResponse.json(
      { error: "Company profile already exists." },
      { status: 409 },
    );
  const slug = `${toSlug(name) || "company"}-${crypto.randomUUID().slice(0, 8)}`;
  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({
      created_by: userId,
      industry: textValue(payload.industry),
      name,
      slug,
      website: textValue(payload.website),
    })
    .select("id")
    .single();
  if (organizationError || !organization)
    return NextResponse.json(
      { error: "Could not create company profile." },
      { status: 500 },
    );
  const { error: membershipError } = await supabase
    .from("organization_members")
    .insert({
      membership_role: "owner",
      organization_id: (organization as { id: string }).id,
      status: "active",
      user_id: userId,
    });
  return membershipError
    ? NextResponse.json(
        { error: "Could not activate company ownership." },
        { status: 500 },
      )
    : new NextResponse(null, { status: 201 });
}

export async function PUT(request: Request) {
  const payload = (await request.json()) as OrganizationPayload;
  const name = textValue(payload.name);
  const { organizationId, supabase, userId } = await getUserOrganization();
  if (!userId)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  if (!organizationId || !name)
    return NextResponse.json(
      { error: "Company profile is unavailable." },
      { status: 400 },
    );
  const { error } = await supabase
    .from("organizations")
    .update({
      industry: textValue(payload.industry),
      name,
      website: textValue(payload.website),
    })
    .eq("id", organizationId);
  return error
    ? NextResponse.json(
        { error: "Could not update company profile." },
        { status: 500 },
      )
    : new NextResponse(null, { status: 204 });
}
