import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type DraftInquiryItem = {
  customerNote: string | null;
  currencyCode: string;
  estimatedTotal: number | null;
  id: string;
  name: string;
  options: string[];
  productNumber: string;
  quantity: number;
  requiredDate: string | null;
  services: string[];
  unitPrice: number | null;
};

export type DraftInquiry = {
  attachments: DraftInquiryAttachment[];
  id: string;
  items: DraftInquiryItem[];
  number: string;
};

export type DraftInquiryAttachment = {
  filename: string;
  id: string;
  inquiryItemId: string | null;
};

export type SubmittedInquiry = {
  history: InquiryStatusEvent[];
  number: string;
  status: string;
  submittedAt: string | null;
};

export type InquiryStatusEvent = {
  createdAt: string;
  fromStatus: string | null;
  toStatus: string;
};

type InquiryRow = { id: string; inquiry_number: string };

type InquiryItemRow = {
  customer_note: string | null;
  currency_code: string;
  estimated_total_snapshot: number | null;
  id: string;
  product_name_snapshot: string;
  product_number_snapshot: string;
  quantity: number;
  required_date: string | null;
  unit_price_snapshot: number | null;
};

type SelectionRow = {
  entered_value: string | null;
  inquiry_item_id: string;
  option_group_name_snapshot: string;
  option_value_snapshot: string | null;
};

type ServiceRequestRow = {
  inquiry_item_id: string;
  service_name_snapshot: string;
};

type AttachmentRow = {
  filename: string;
  id: string;
  inquiry_item_id: string | null;
};

export async function getCurrentDraftInquiry(): Promise<DraftInquiry | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (typeof userId !== "string") {
    return null;
  }

  const { data: inquiryData, error: inquiryError } = await supabase
    .from("inquiries")
    .select("id, inquiry_number")
    .eq("customer_user_id", userId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const inquiry = inquiryData as InquiryRow | null;

  if (inquiryError) {
    throw new Error(`Could not read draft enquiry: ${inquiryError.message}`);
  }

  if (!inquiry) {
    return null;
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from("inquiry_items")
    .select(
      "id, product_number_snapshot, product_name_snapshot, quantity, currency_code, unit_price_snapshot, estimated_total_snapshot, customer_note, required_date",
    )
    .eq("inquiry_id", inquiry.id)
    .order("sort_order");
  const items = itemsData as InquiryItemRow[];

  if (itemsError) {
    throw new Error(
      `Could not read draft enquiry items: ${itemsError.message}`,
    );
  }

  const itemIds = items.map((item) => item.id);
  const { data: selectionsData, error: selectionsError } = itemIds.length
    ? await supabase
        .from("inquiry_item_option_selections")
        .select(
          "inquiry_item_id, option_group_name_snapshot, option_value_snapshot, entered_value",
        )
        .in("inquiry_item_id", itemIds)
        .order("sort_order")
    : { data: [], error: null };
  const selections = selectionsData as SelectionRow[];

  if (selectionsError) {
    throw new Error(
      `Could not read draft enquiry options: ${selectionsError.message}`,
    );
  }

  const { data: serviceRequestsData, error: serviceRequestsError } =
    itemIds.length
      ? await supabase
          .from("inquiry_item_service_requests")
          .select("inquiry_item_id, service_name_snapshot")
          .in("inquiry_item_id", itemIds)
          .order("created_at")
      : { data: [], error: null };

  if (serviceRequestsError) {
    throw new Error(
      `Could not read draft enquiry services: ${serviceRequestsError.message}`,
    );
  }

  const { data: attachmentsData, error: attachmentsError } = await supabase
    .from("inquiry_attachments")
    .select("id, filename, inquiry_item_id")
    .eq("inquiry_id", inquiry.id)
    .order("created_at");

  if (attachmentsError) {
    throw new Error(
      `Could not read enquiry attachments: ${attachmentsError.message}`,
    );
  }

  return {
    attachments: (attachmentsData as AttachmentRow[]).map((attachment) => ({
      filename: attachment.filename,
      id: attachment.id,
      inquiryItemId: attachment.inquiry_item_id,
    })),
    id: inquiry.id,
    items: items.map((item) => ({
      customerNote: item.customer_note,
      currencyCode: item.currency_code,
      estimatedTotal:
        item.estimated_total_snapshot === null
          ? null
          : Number(item.estimated_total_snapshot),
      id: item.id,
      name: item.product_name_snapshot,
      options: selections
        .filter((selection) => selection.inquiry_item_id === item.id)
        .map((selection) =>
          (selection.option_value_snapshot ?? selection.entered_value)
            ? `${selection.option_group_name_snapshot}: ${selection.option_value_snapshot ?? selection.entered_value}`
            : null,
        )
        .filter((value): value is string => value !== null),
      productNumber: item.product_number_snapshot,
      quantity: item.quantity,
      requiredDate: item.required_date,
      services: (serviceRequestsData as ServiceRequestRow[])
        .filter((service) => service.inquiry_item_id === item.id)
        .map((service) => service.service_name_snapshot),
      unitPrice:
        item.unit_price_snapshot === null
          ? null
          : Number(item.unit_price_snapshot),
    })),
    number: inquiry.inquiry_number,
  };
}

export async function getSubmittedInquiries(): Promise<SubmittedInquiry[]> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (typeof userId !== "string") {
    return [];
  }

  const { data, error } = await supabase
    .from("inquiries")
    .select("id, inquiry_number, status, submitted_at")
    .eq("customer_user_id", userId)
    .neq("status", "draft")
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error(`Could not read submitted enquiries: ${error.message}`);
  }

  const inquiries = data as {
    id: string;
    inquiry_number: string;
    status: string;
    submitted_at: string | null;
  }[];
  const inquiryIds = inquiries.map((inquiry) => inquiry.id);
  const { data: historyData, error: historyError } = inquiryIds.length
    ? await supabase
        .from("inquiry_status_history")
        .select("inquiry_id, from_status, to_status, created_at")
        .in("inquiry_id", inquiryIds)
        .eq("visible_to_customer", true)
        .order("created_at")
    : { data: [], error: null };

  if (historyError) {
    throw new Error(`Could not read enquiry history: ${historyError.message}`);
  }

  const historyByInquiryId = new Map<string, InquiryStatusEvent[]>();
  for (const event of historyData as {
    created_at: string;
    from_status: string | null;
    inquiry_id: string;
    to_status: string;
  }[]) {
    const history = historyByInquiryId.get(event.inquiry_id) ?? [];
    history.push({
      createdAt: event.created_at,
      fromStatus: event.from_status,
      toStatus: event.to_status,
    });
    historyByInquiryId.set(event.inquiry_id, history);
  }

  return inquiries.map((inquiry) => ({
    history: historyByInquiryId.get(inquiry.id) ?? [],
    number: inquiry.inquiry_number,
    status: inquiry.status,
    submittedAt: inquiry.submitted_at,
  }));
}
