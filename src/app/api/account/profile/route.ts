import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PUT(request: Request) {
  const payload = (await request.json()) as {
    fullName?: unknown;
    jobTitle?: unknown;
    market?: unknown;
    preferences?: unknown;
    phone?: unknown;
  };
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  if (typeof userId !== "string") {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const normalize = (value: unknown, maximumLength: number) => {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized.length <= maximumLength ? normalized || null : undefined;
  };
  const fullName = normalize(payload.fullName, 120);
  const jobTitle = normalize(payload.jobTitle, 120);
  const market = normalize(payload.market, 120);
  const phone = normalize(payload.phone, 48);
  const preferences = normalize(payload.preferences, 2000);

  if (
    [fullName, jobTitle, market, phone, preferences].some(
      (value) => value === undefined,
    )
  ) {
    return NextResponse.json(
      { error: "Profile field is too long." },
      { status: 400 },
    );
  }
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      job_title: jobTitle,
      market,
      phone,
      preferences,
    })
    .eq("id", userId);

  return error
    ? NextResponse.json({ error: "Could not update profile." }, { status: 500 })
    : new NextResponse(null, { status: 204 });
}
