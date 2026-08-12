import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type SubmitInquiryRequest = {
  contactEmail?: unknown;
  contactName?: unknown;
  contactPhone?: unknown;
  message?: unknown;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(
  request: Request,
  { params }: Readonly<{ params: Promise<{ inquiryId: string }> }>,
) {
  const { inquiryId } = await params;
  const payload = (await request.json()) as SubmitInquiryRequest;
  const contactName = text(payload.contactName);
  const contactEmail = text(payload.contactEmail);
  const contactPhone = text(payload.contactPhone);
  const message = text(payload.message);

  if (!contactName || !contactEmail) {
    return NextResponse.json(
      { error: "Contact name and email are required." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (typeof claimsData?.claims.sub !== "string") {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { data: items, error: itemsError } = await supabase
    .from("inquiry_items")
    .select("id")
    .eq("inquiry_id", inquiryId)
    .limit(1);

  if (itemsError || !items || items.length === 0) {
    return NextResponse.json(
      { error: "Add at least one product before submitting." },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("inquiries")
    .update({
      contact_email: contactEmail,
      contact_name: contactName,
      contact_phone: contactPhone,
      customer_message: message,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", inquiryId)
    .eq("customer_user_id", claimsData.claims.sub)
    .eq("status", "draft")
    .select("inquiry_number")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "Could not submit the enquiry." },
      { status: 500 },
    );
  }

  return NextResponse.json({ inquiryNumber: data.inquiry_number });
}
