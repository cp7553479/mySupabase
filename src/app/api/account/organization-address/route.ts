import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type AddressPayload = {
  city?: unknown;
  contactName?: unknown;
  countryCode?: unknown;
  line1?: unknown;
  line2?: unknown;
  phone?: unknown;
  postalCode?: unknown;
  stateRegion?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() || null : null;
}

function countryCode(value: unknown) {
  return typeof value === "string" && /^[A-Za-z]{2}$/.test(value)
    ? value.toUpperCase()
    : null;
}

async function getOrganization() {
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (typeof userId !== "string") {
    return { organizationId: null, supabase };
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read organization membership: ${error.message}`);
  }

  return {
    organizationId:
      (data as { organization_id: string } | null)?.organization_id ?? null,
    supabase,
  };
}

export async function PUT(request: Request) {
  const payload = (await request.json()) as AddressPayload;
  const line1 = text(payload.line1);
  const city = text(payload.city);
  const deliveryCountryCode = countryCode(payload.countryCode);
  const { organizationId, supabase } = await getOrganization();

  if (!organizationId) {
    return NextResponse.json(
      { error: "Authentication and a company profile are required." },
      { status: 401 },
    );
  }

  if (!line1 || !city || !deliveryCountryCode) {
    return NextResponse.json(
      { error: "Address line, city and country code are required." },
      { status: 400 },
    );
  }

  const address = {
    address_type: "shipping",
    city,
    contact_name: text(payload.contactName),
    country_code: deliveryCountryCode,
    is_default: true,
    line1,
    line2: text(payload.line2),
    phone: text(payload.phone),
    postal_code: text(payload.postalCode),
    state_region: text(payload.stateRegion),
  };
  const { data: existing, error: existingError } = await supabase
    .from("organization_addresses")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("address_type", "shipping")
    .eq("is_default", true)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json(
      { error: "Could not read delivery address." },
      { status: 500 },
    );
  }

  const result = existing
    ? await supabase
        .from("organization_addresses")
        .update(address)
        .eq("id", (existing as { id: string }).id)
    : await supabase
        .from("organization_addresses")
        .insert({ ...address, organization_id: organizationId });

  return result.error
    ? NextResponse.json(
        { error: "Could not save delivery address." },
        { status: 500 },
      )
    : new NextResponse(null, { status: existing ? 204 : 201 });
}
