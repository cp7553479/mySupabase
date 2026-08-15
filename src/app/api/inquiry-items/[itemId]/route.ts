import { NextResponse } from "next/server";

import { calculateProductEstimate } from "@/lib/catalogue/pricing";
import { getVisibleDefaultPriceGrid } from "@/lib/catalogue/server-price-grid";
import { getVisibleProductUpcharges } from "@/lib/catalogue/server-pricing";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type UpdateInquiryItemRequest = { quantity?: unknown };

type InquiryItemRow = { inquiry_id: string; product_id: string };

type ProductRow = {
  default_currency_code: string;
  minimum_order_quantity: number | null;
};

type PriceTierRow = {
  id: string;
  maximum_quantity: number | null;
  minimum_quantity: number;
  unit_price: number;
};

type SelectionRow = { option_value_id: string | null };

type ServiceRequestRow = { service_code: string };

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

export async function PATCH(
  request: Request,
  { params }: Readonly<{ params: Promise<{ itemId: string }> }>,
) {
  const { itemId } = await params;
  const payload = (await request.json()) as UpdateInquiryItemRequest;
  const quantity =
    typeof payload.quantity === "number" &&
    Number.isSafeInteger(payload.quantity) &&
    payload.quantity > 0
      ? payload.quantity
      : null;

  if (!quantity) {
    return NextResponse.json({ error: "Invalid quantity." }, { status: 400 });
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

  const { data: itemData, error: itemError } = await supabase
    .from("inquiry_items")
    .select("inquiry_id, product_id")
    .eq("id", itemId)
    .maybeSingle();
  const item = itemData as InquiryItemRow | null;

  if (itemError || !item) {
    return NextResponse.json(
      { error: "Draft enquiry item is unavailable." },
      { status: 404 },
    );
  }

  const { data: inquiry, error: inquiryError } = await supabase
    .from("inquiries")
    .select("id")
    .eq("id", item.inquiry_id)
    .eq("customer_user_id", userId)
    .eq("status", "draft")
    .maybeSingle();

  if (inquiryError || !inquiry) {
    return NextResponse.json(
      { error: "Draft enquiry item is unavailable." },
      { status: 404 },
    );
  }

  const { data: productData, error: productError } = await supabase
    .from("products")
    .select("default_currency_code, minimum_order_quantity")
    .eq("id", item.product_id)
    .eq("status", "published")
    .maybeSingle();
  const product = productData as ProductRow | null;

  if (productError || !product) {
    return NextResponse.json(
      { error: "Product is unavailable." },
      { status: 404 },
    );
  }

  if (
    product.minimum_order_quantity !== null &&
    quantity < product.minimum_order_quantity
  ) {
    return NextResponse.json(
      { error: "The quantity is below the minimum order quantity." },
      { status: 409 },
    );
  }

  let grid;

  try {
    grid = await getVisibleDefaultPriceGrid(supabase, item.product_id);
  } catch {
    return NextResponse.json(
      { error: "Product pricing is unavailable." },
      { status: 409 },
    );
  }

  if (!grid) {
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

  const [selectionsResult, servicesResult] = await Promise.all([
    supabase
      .from("inquiry_item_option_selections")
      .select("option_value_id")
      .eq("inquiry_item_id", itemId),
    supabase
      .from("inquiry_item_service_requests")
      .select("service_code")
      .eq("inquiry_item_id", itemId),
  ]);

  if (selectionsResult.error || servicesResult.error) {
    return NextResponse.json(
      { error: "Could not update the enquiry item." },
      { status: 500 },
    );
  }

  let upcharges;

  try {
    upcharges = await getVisibleProductUpcharges(supabase, item.product_id);
  } catch {
    return NextResponse.json(
      { error: "Product pricing is unavailable." },
      { status: 409 },
    );
  }

  const estimate = calculateProductEstimate({
    baseUnitPrice: Number(tier.unit_price),
    optionValueIds: ((selectionsResult.data ?? []) as SelectionRow[])
      .map((selection) => selection.option_value_id)
      .filter(
        (optionValueId): optionValueId is string => optionValueId !== null,
      ),
    quantity,
    serviceCodes: ((servicesResult.data ?? []) as ServiceRequestRow[]).map(
      (service) => service.service_code,
    ),
    upcharges,
  });

  const { error: updateError } = await supabase
    .from("inquiry_items")
    .update({
      currency_code: product.default_currency_code,
      estimated_total_snapshot: estimate.total,
      price_grid_id: grid.id,
      price_tier_id: tier.id,
      quantity,
      unit_price_snapshot: estimate.unitPrice,
    })
    .eq("id", itemId)
    .eq("inquiry_id", item.inquiry_id);

  return updateError
    ? NextResponse.json(
        { error: "Could not update the enquiry item." },
        { status: 500 },
      )
    : new NextResponse(null, { status: 204 });
}
