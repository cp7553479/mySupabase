import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function PUT(request: Request) {
  const payload = (await request.json()) as {
    fullName?: unknown;
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

  const fullName =
    typeof payload.fullName === "string"
      ? payload.fullName.trim() || null
      : null;
  const phone =
    typeof payload.phone === "string" ? payload.phone.trim() || null : null;
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone })
    .eq("id", userId);

  return error
    ? NextResponse.json({ error: "Could not update profile." }, { status: 500 })
    : new NextResponse(null, { status: 204 });
}
