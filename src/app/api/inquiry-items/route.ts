import { NextResponse } from "next/server";

import {
  type ProductOptionGroupConstraint,
  type ProductOptionRule,
  type ProductOptionSelection,
  type ProductOptionValueReference,
  validateProductOptionSelections,
} from "@/lib/catalogue/option-validation";
import { calculateProductEstimate } from "@/lib/catalogue/pricing";
import { getVisibleDefaultPriceGrid } from "@/lib/catalogue/server-price-grid";
import { getVisibleProductUpcharges } from "@/lib/catalogue/server-pricing";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type AddInquiryItemRequest = {
  customerNote?: unknown;
  enteredValues?: unknown;
  productId?: unknown;
  quantity?: unknown;
  requiredDate?: unknown;
  selections?: unknown;
  serviceCodes?: unknown;
};

type ProductRow = {
  default_currency_code: string;
  id: string;
  name: string;
  product_number: string;
};

type PriceTierRow = {
  id: string;
  maximum_quantity: number | null;
  minimum_quantity: number;
  unit_price: number;
};

type OptionGroupRow = {
  id: string;
  input_type: "file" | "multi_select" | "number" | "single_select" | "text";
  is_required: boolean;
  maximum_selections: number | null;
  minimum_selections: number;
  name: string;
};

type OptionValueRow = { id: string; label: string; option_group_id: string };

type EnteredValue = { enteredValue: string; optionGroupId: string };

type InquiryRow = { id: string; inquiry_number: string };

type CreatedInquiryItem = { id: string };

type ProductServiceRow = { service_code: string };

type ServiceRow = { code: string; name: string };

function isSelection(value: unknown): value is ProductOptionSelection {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const selection = value as Record<string, unknown>;

  return (
    typeof selection.optionGroupId === "string" &&
    typeof selection.optionValueId === "string"
  );
}

function isEnteredValue(value: unknown): value is EnteredValue {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const enteredValue = value as Record<string, unknown>;

  return (
    typeof enteredValue.optionGroupId === "string" &&
    typeof enteredValue.enteredValue === "string"
  );
}

export async function POST(request: Request) {
  const payload = (await request.json()) as AddInquiryItemRequest;
  const productId =
    typeof payload.productId === "string" ? payload.productId : null;
  const customerNote =
    typeof payload.customerNote === "string"
      ? payload.customerNote.trim()
      : null;
  const requiredDate =
    typeof payload.requiredDate === "string" ? payload.requiredDate : null;
  const quantity =
    typeof payload.quantity === "number" &&
    Number.isSafeInteger(payload.quantity) &&
    payload.quantity > 0
      ? payload.quantity
      : null;
  const selections = Array.isArray(payload.selections)
    ? payload.selections.filter(isSelection)
    : null;
  const enteredValues = Array.isArray(payload.enteredValues)
    ? payload.enteredValues
        .filter(isEnteredValue)
        .map((value) => ({
          enteredValue: value.enteredValue.trim(),
          optionGroupId: value.optionGroupId,
        }))
        .filter((value) => value.enteredValue)
    : [];
  const serviceCodes = Array.isArray(payload.serviceCodes)
    ? [
        ...new Set(
          payload.serviceCodes.filter(
            (code): code is string => typeof code === "string",
          ),
        ),
      ]
    : [];

  if (!productId || !quantity || selections === null) {
    return NextResponse.json(
      { error: "Invalid enquiry item." },
      { status: 400 },
    );
  }

  if (
    (customerNote !== null && customerNote.length > 2_000) ||
    (requiredDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(requiredDate))
  ) {
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

  let grid;

  try {
    grid = await getVisibleDefaultPriceGrid(supabase, product.id);
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

  const uniqueSelections = [
    ...new Map(
      selections.map((selection) => [
        `${selection.optionGroupId}:${selection.optionValueId}`,
        selection,
      ]),
    ).values(),
  ];
  const selectedValueIds = uniqueSelections.map(
    (selection) => selection.optionValueId,
  );
  const [groupsResult, valuesResult, rulesResult] = await Promise.all([
    supabase
      .from("product_option_groups")
      .select(
        "id, name, input_type, is_required, minimum_selections, maximum_selections",
      )
      .eq("product_id", product.id)
      .eq("is_active", true),
    selectedValueIds.length
      ? supabase
          .from("product_option_values")
          .select("id, option_group_id, label")
          .in("id", selectedValueIds)
          .eq("is_active", true)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("product_option_rules")
      .select(
        "subject_option_value_id, related_option_value_id, rule_type, message",
      )
      .eq("product_id", product.id),
  ]);
  const groups = (groupsResult.data ?? []) as OptionGroupRow[];
  const values = (valuesResult.data ?? []) as OptionValueRow[];
  const selectableGroups = groups.filter(
    (group) =>
      group.input_type === "single_select" ||
      group.input_type === "multi_select",
  );
  const enteredValuesByGroup = new Map(
    enteredValues.map((value) => [value.optionGroupId, value.enteredValue]),
  );
  const inputValidationError =
    groups.some((group) => {
      const enteredValue = enteredValuesByGroup.get(group.id);

      if (group.input_type === "text") {
        return (
          (group.is_required && !enteredValue) ||
          (enteredValue !== undefined && enteredValue.length > 2_000)
        );
      }

      if (group.input_type === "number") {
        return (
          (group.is_required && !enteredValue) ||
          (enteredValue !== undefined && !Number.isFinite(Number(enteredValue)))
        );
      }

      return enteredValue !== undefined;
    }) ||
    enteredValues.some(
      (value) => !groups.some((group) => group.id === value.optionGroupId),
    );
  const rules = (rulesResult.data ?? []).map((rule): ProductOptionRule => ({
    message: rule.message,
    relatedOptionValueId: rule.related_option_value_id,
    ruleType: rule.rule_type,
    subjectOptionValueId: rule.subject_option_value_id,
  }));
  const optionValidationError = validateProductOptionSelections(
    selectableGroups.map((group): ProductOptionGroupConstraint => ({
      id: group.id,
      isRequired: group.is_required,
      maximumSelections: group.maximum_selections,
      minimumSelections: group.minimum_selections,
    })),
    values.map((value): ProductOptionValueReference => ({
      id: value.id,
      optionGroupId: value.option_group_id,
    })),
    uniqueSelections,
    rules,
  );

  if (
    groupsResult.error ||
    valuesResult.error ||
    rulesResult.error ||
    inputValidationError ||
    optionValidationError
  ) {
    return NextResponse.json(
      {
        error:
          optionValidationError ??
          "One or more product options are unavailable or incompatible.",
      },
      { status: 409 },
    );
  }

  let upcharges;

  try {
    upcharges = await getVisibleProductUpcharges(supabase, product.id);
  } catch {
    return NextResponse.json(
      { error: "Product pricing is unavailable." },
      { status: 409 },
    );
  }
  const estimate = calculateProductEstimate({
    baseUnitPrice: Number(tier.unit_price),
    optionValueIds: uniqueSelections.map(
      (selection) => selection.optionValueId,
    ),
    quantity,
    serviceCodes,
    upcharges,
  });

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
      customer_note: customerNote || null,
      estimated_total_snapshot: estimate.total,
      inquiry_id: inquiry.id,
      price_grid_id: grid.id,
      price_tier_id: tier.id,
      product_id: product.id,
      product_name_snapshot: product.name,
      product_number_snapshot: product.product_number,
      quantity,
      required_date: requiredDate,
      unit_price_snapshot: estimate.unitPrice,
    })
    .select("id")
    .single();

  if (itemError || !itemData) {
    return NextResponse.json(
      { error: "Could not add the product to the enquiry." },
      { status: 500 },
    );
  }

  const item = itemData as CreatedInquiryItem;

  if (groups.length > 0) {
    const groupNames = new Map(groups.map((group) => [group.id, group.name]));
    const optionRows = [
      ...values.map((value, index) => ({
        inquiry_item_id: item.id,
        option_group_id: value.option_group_id,
        option_group_name_snapshot: groupNames.get(value.option_group_id) ?? "",
        option_value_id: value.id,
        option_value_snapshot: value.label,
        sort_order: index,
      })),
      ...enteredValues.map((value, index) => ({
        entered_value: value.enteredValue,
        inquiry_item_id: item.id,
        option_group_id: value.optionGroupId,
        option_group_name_snapshot: groupNames.get(value.optionGroupId) ?? "",
        sort_order: values.length + index,
      })),
    ];
    const { error: optionError } = await supabase
      .from("inquiry_item_option_selections")
      .insert(optionRows);

    if (optionError) {
      await supabase.from("inquiry_items").delete().eq("id", item.id);
      return NextResponse.json(
        { error: "Could not save the product configuration." },
        { status: 500 },
      );
    }
  }

  if (serviceCodes.length > 0) {
    const [productServicesResult, serviceDefinitionsResult] = await Promise.all(
      [
        supabase
          .from("product_services")
          .select("service_code")
          .eq("product_id", product.id)
          .eq("is_available", true)
          .in("service_code", serviceCodes),
        supabase
          .from("services")
          .select("code, name")
          .eq("is_active", true)
          .in("code", serviceCodes),
      ],
    );
    const availableServiceCodes = new Set(
      ((productServicesResult.data ?? []) as ProductServiceRow[]).map(
        (service) => service.service_code,
      ),
    );
    const serviceNamesByCode = new Map(
      ((serviceDefinitionsResult.data ?? []) as ServiceRow[]).map((service) => [
        service.code,
        service.name,
      ]),
    );

    if (
      productServicesResult.error ||
      serviceDefinitionsResult.error ||
      serviceCodes.some(
        (code) =>
          !availableServiceCodes.has(code) || !serviceNamesByCode.has(code),
      )
    ) {
      await supabase.from("inquiry_items").delete().eq("id", item.id);
      return NextResponse.json(
        { error: "One or more requested services are unavailable." },
        { status: 409 },
      );
    }

    const { error: serviceRequestError } = await supabase
      .from("inquiry_item_service_requests")
      .insert(
        serviceCodes.map((serviceCode) => ({
          inquiry_item_id: item.id,
          service_code: serviceCode,
          service_name_snapshot:
            serviceNamesByCode.get(serviceCode) ?? serviceCode,
        })),
      );

    if (serviceRequestError) {
      await supabase.from("inquiry_items").delete().eq("id", item.id);
      return NextResponse.json(
        { error: "Could not save the requested services." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    {
      inquiryId: inquiry.id,
      inquiryItemId: item.id,
      inquiryNumber: inquiry.inquiry_number,
    },
    { status: 201 },
  );
}
