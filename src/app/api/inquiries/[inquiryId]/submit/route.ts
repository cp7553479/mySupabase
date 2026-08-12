import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type SubmitInquiryRequest = {
  contactEmail?: unknown;
  contactName?: unknown;
  contactPhone?: unknown;
  deliveryCountryCode?: unknown;
  intendedUse?: unknown;
  message?: unknown;
  needsArtworkProof?: unknown;
  needsDesignSupport?: unknown;
  needsSample?: unknown;
  requiredDate?: unknown;
};

type InquiryItemReference = { id: string; product_id: string };

type RequiredFileOptionGroup = { product_id: string };

type ItemAttachmentReference = { inquiry_item_id: string | null };

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function date(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) ? null : value;
}

function countryCode(value: unknown): string | null {
  if (typeof value !== "string" || !/^[A-Za-z]{2}$/.test(value)) {
    return null;
  }

  return value.toUpperCase();
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
  const deliveryCountryCode = countryCode(payload.deliveryCountryCode);
  const intendedUse = text(payload.intendedUse);
  const message = text(payload.message);
  const requiredDate = date(payload.requiredDate);

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

  const { data: itemsData, error: itemsError } = await supabase
    .from("inquiry_items")
    .select("id, product_id")
    .eq("inquiry_id", inquiryId)
    .order("created_at");
  const items = (itemsData ?? []) as InquiryItemReference[];

  if (itemsError || items.length === 0) {
    return NextResponse.json(
      { error: "Add at least one product before submitting." },
      { status: 409 },
    );
  }

  const [
    { data: requiredFileGroupsData, error: requiredFileGroupsError },
    { data: attachmentsData, error: attachmentsError },
  ] = await Promise.all([
    supabase
      .from("product_option_groups")
      .select("product_id")
      .in("product_id", [...new Set(items.map((item) => item.product_id))])
      .eq("input_type", "file")
      .eq("is_required", true)
      .eq("is_active", true),
    supabase
      .from("inquiry_attachments")
      .select("inquiry_item_id")
      .eq("inquiry_id", inquiryId),
  ]);
  const requiredFileProductIds = new Set(
    ((requiredFileGroupsData ?? []) as RequiredFileOptionGroup[]).map(
      (group) => group.product_id,
    ),
  );
  const attachedItemIds = new Set(
    ((attachmentsData ?? []) as ItemAttachmentReference[])
      .map((attachment) => attachment.inquiry_item_id)
      .filter((itemId): itemId is string => itemId !== null),
  );

  if (
    requiredFileGroupsError ||
    attachmentsError ||
    items.some(
      (item) =>
        requiredFileProductIds.has(item.product_id) &&
        !attachedItemIds.has(item.id),
    )
  ) {
    return NextResponse.json(
      { error: "Upload the required item files before submitting." },
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
      delivery_country_code: deliveryCountryCode,
      intended_use: intendedUse,
      needs_artwork_proof: payload.needsArtworkProof === true,
      needs_design_support: payload.needsDesignSupport === true,
      needs_sample: payload.needsSample === true,
      required_date: requiredDate,
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
