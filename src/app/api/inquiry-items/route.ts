import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type AddInquiryItemRequest = {
  productId?: unknown;
  quantity?: unknown;
  selections?: unknown;
};

type ProductRow = {
  default_currency_code: string;
  id: string;
  name: string;
  product_number: string;
};

type PriceGridRow = { id: string };

type PriceTierRow = {
  id: string;
  maximum_quantity: number | null;
  minimum_quantity: number;
  unit_price: number;
};

type OptionGroupRow = { id: string; is_required: boolean; name: string };

type OptionValueRow = { id: string; label: string; option_group_id: string };

type InquiryRow = { id: string; inquiry_number: string };

function isSelection(
  value: unknown,
): value is { optionGroupId: string; optionValueId: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const selection = value as Record<string, unknown>;

  return (
    typeof selection.optionGroupId === "string" &&
    typeof selection.optionValueId === "string"
  );
}

export async function POST(request: Request) {
  const payload = (await request.json()) as AddInquiryItemRequest;
  const productId =
    typeof payload.productId === "string" ? payload.productId : null;
  const quantity =
    typeof payload.quantity === "number" &&
    Number.isSafeInteger(payload.quantity) &&
    payload.quantity > 0
      ? payload.quantity
      : null;
  const selections = Array.isArray(payload.selections)
    ? payload.selections.filter(isSelection)
    : null;

  if (!productId || !quantity || selections === null) {
    return NextResponse.json(
      { error: "Invalid enquiry item." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (typeof userId !== "string") {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { data: productData, error: productError } = await supabase
    .from("products")
    .select("id, product_number, name, default_currency_code")
    .eq("id", productId)
    .eq("status", "published")
    .maybeSingle();
  const product = productData as ProductRow | null;

  if (productError || !product) {
    return NextResponse.json(
      { error: "Product is unavailable." },
      { status: 404 },
    );
  }

  const { data: gridData, error: gridError } = await supabase
    .from("product_price_grids")
    .select("id")
    .eq("product_id", product.id)
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle();
  const grid = gridData as PriceGridRow | null;

  if (gridError || !grid) {
    return NextResponse.json(
      { error: "Product pricing is unavailable." },
      { status: 409 },
    );
  }

  const { data: tiersData, error: tiersError } = await supabase
    .from("product_price_tiers")
    .select("id, minimum_quantity, maximum_quantity, unit_price")
    .eq("price_grid_id", grid.id)
    .order("minimum_quantity");
  const tier = (tiersData as PriceTierRow[] | null)?.find(
    (candidate) =>
      quantity >= candidate.minimum_quantity &&
      (candidate.maximum_quantity === null ||
        quantity <= candidate.maximum_quantity),
  );

  if (tiersError || !tier) {
    return NextResponse.json(
      { error: "The quantity does not match an available price tier." },
      { status: 409 },
    );
  }

  const uniqueSelections = new Map(
    selections.map((selection) => [selection.optionGroupId, selection]),
  );
  const selectedGroupIds = [...uniqueSelections.keys()];
  const selectedValueIds = [...uniqueSelections.values()].map(
    (selection) => selection.optionValueId,
  );
  const [groupsResult, valuesResult] = await Promise.all([
    selectedGroupIds.length
      ? supabase
          .from("product_option_groups")
          .select("id, name, is_required")
          .eq("product_id", product.id)
          .eq("is_active", true)
      : supabase
          .from("product_option_groups")
          .select("id, name, is_required")
          .eq("product_id", product.id)
          .eq("is_active", true),
    selectedValueIds.length
      ? supabase
          .from("product_option_values")
          .select("id, option_group_id, label")
          .in("id", selectedValueIds)
          .eq("is_active", true)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const groups = groupsResult.data as OptionGroupRow[];
  const values = valuesResult.data as OptionValueRow[];

  if (
    groupsResult.error ||
    valuesResult.error ||
    selectedGroupIds.some(
      (groupId) => !groups.some((group) => group.id === groupId),
    ) ||
    groups.some(
      (group) => group.is_required && !uniqueSelections.has(group.id),
    ) ||
    values.length !== selectedValueIds.length ||
    values.some(
      (value) =>
        uniqueSelections.get(value.option_group_id)?.optionValueId !== value.id,
    )
  ) {
    return NextResponse.json(
      { error: "One or more product options are unavailable." },
      { status: 409 },
    );
  }

  const { data: existingInquiryData, error: existingInquiryError } =
    await supabase
      .from("inquiries")
      .select("id, inquiry_number")
      .eq("customer_user_id", userId)
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (existingInquiryError) {
    return NextResponse.json(
      { error: "Could not prepare the enquiry." },
      { status: 500 },
    );
  }

  let inquiry = existingInquiryData as InquiryRow | null;

  if (!inquiry) {
    const { data: inquiryData, error: inquiryError } = await supabase
      .from("inquiries")
      .insert({ customer_user_id: userId, status: "draft" })
      .select("id, inquiry_number")
      .single();

    if (inquiryError || !inquiryData) {
      return NextResponse.json(
        { error: "Could not create the enquiry." },
        { status: 500 },
      );
    }

    inquiry = inquiryData as InquiryRow;
  }

  const { data: itemData, error: itemError } = await supabase
    .from("inquiry_items")
    .insert({
      currency_code: product.default_currency_code,
      estimated_total_snapshot: Number(tier.unit_price) * quantity,
      inquiry_id: inquiry.id,
      price_grid_id: grid.id,
      price_tier_id: tier.id,
      product_id: product.id,
      product_name_snapshot: product.name,
      product_number_snapshot: product.product_number,
      quantity,
      unit_price_snapshot: tier.unit_price,
    })
    .select("id")
    .single();

  if (itemError || !itemData) {
    return NextResponse.json(
      { error: "Could not add the product to the enquiry." },
      { status: 500 },
    );
  }

  if (groups.length > 0) {
    const groupNames = new Map(groups.map((group) => [group.id, group.name]));
    const optionRows = values.map((value, index) => ({
      inquiry_item_id: itemData.id,
      option_group_id: value.option_group_id,
      option_group_name_snapshot: groupNames.get(value.option_group_id) ?? "",
      option_value_id: value.id,
      option_value_snapshot: value.label,
      sort_order: index,
    }));
    const { error: optionError } = await supabase
      .from("inquiry_item_option_selections")
      .insert(optionRows);

    if (optionError) {
      await supabase.from("inquiry_items").delete().eq("id", itemData.id);
      return NextResponse.json(
        { error: "Could not save the product configuration." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    { inquiryNumber: inquiry.inquiry_number },
    { status: 201 },
  );
}
