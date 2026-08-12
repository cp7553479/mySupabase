import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: Readonly<{ params: Promise<{ itemId: string }> }>,
) {
  const { itemId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (typeof claimsData?.claims.sub !== "string") {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { error } = await supabase
    .from("inquiry_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    return NextResponse.json(
      { error: "Could not remove the enquiry item." },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
