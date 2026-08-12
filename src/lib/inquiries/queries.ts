import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type DraftInquiryItem = {
  currencyCode: string;
  estimatedTotal: number | null;
  id: string;
  name: string;
  options: string[];
  productNumber: string;
  quantity: number;
  unitPrice: number | null;
};

export type DraftInquiry = {
  id: string;
  items: DraftInquiryItem[];
  number: string;
};

type InquiryRow = { id: string; inquiry_number: string };

type InquiryItemRow = {
  currency_code: string;
  estimated_total_snapshot: number | null;
  id: string;
  product_name_snapshot: string;
  product_number_snapshot: string;
  quantity: number;
  unit_price_snapshot: number | null;
};

type SelectionRow = {
  inquiry_item_id: string;
  option_value_snapshot: string | null;
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
      "id, product_number_snapshot, product_name_snapshot, quantity, currency_code, unit_price_snapshot, estimated_total_snapshot",
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
        .select("inquiry_item_id, option_value_snapshot")
        .in("inquiry_item_id", itemIds)
        .order("sort_order")
    : { data: [], error: null };
  const selections = selectionsData as SelectionRow[];

  if (selectionsError) {
    throw new Error(
      `Could not read draft enquiry options: ${selectionsError.message}`,
    );
  }

  return {
    id: inquiry.id,
    items: items.map((item) => ({
      currencyCode: item.currency_code,
      estimatedTotal:
        item.estimated_total_snapshot === null
          ? null
          : Number(item.estimated_total_snapshot),
      id: item.id,
      name: item.product_name_snapshot,
      options: selections
        .filter((selection) => selection.inquiry_item_id === item.id)
        .map((selection) => selection.option_value_snapshot)
        .filter((value): value is string => value !== null),
      productNumber: item.product_number_snapshot,
      quantity: item.quantity,
      unitPrice:
        item.unit_price_snapshot === null
          ? null
          : Number(item.unit_price_snapshot),
    })),
    number: inquiry.inquiry_number,
  };
}
