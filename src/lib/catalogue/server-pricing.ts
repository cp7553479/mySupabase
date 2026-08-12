import "server-only";

import type { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CatalogueUpcharge,
  ProductUpchargeCriterion,
  ProductUpchargeTier,
} from "@/lib/catalogue/pricing";

type ServerSupabaseClient = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

type UpchargeGridRow = {
  adjustment_type: "fixed" | "per_unit" | "percentage";
  application_level: "item" | "option" | "service";
  id: string;
  name: string;
};

type UpchargeCriterionRow = {
  criterion_value: string | null;
  operator: "equals" | "excludes" | "includes" | "not_equals";
  option_value_id: string | null;
  taxonomy_term_id: string | null;
  upcharge_grid_id: string;
};

type UpchargeTierRow = {
  amount: number;
  maximum_quantity: number | null;
  minimum_quantity: number;
  upcharge_grid_id: string;
};

export async function getVisibleProductUpcharges(
  supabase: ServerSupabaseClient,
  productId: string,
): Promise<CatalogueUpcharge[]> {
  const { data: gridData, error: gridError } = await supabase
    .from("product_upcharge_grids")
    .select("id, name, adjustment_type, application_level")
    .eq("product_id", productId)
    .eq("is_active", true);

  if (gridError) {
    throw new Error(`Could not read product upcharges: ${gridError.message}`);
  }

  const grids = (gridData ?? []) as UpchargeGridRow[];
  const gridIds = grids.map((grid) => grid.id);

  if (!gridIds.length) return [];

  const [criteriaResult, tiersResult] = await Promise.all([
    supabase
      .from("product_upcharge_criteria")
      .select(
        "upcharge_grid_id, operator, option_value_id, taxonomy_term_id, criterion_value",
      )
      .in("upcharge_grid_id", gridIds),
    supabase
      .from("product_upcharge_tiers")
      .select("upcharge_grid_id, minimum_quantity, maximum_quantity, amount")
      .in("upcharge_grid_id", gridIds)
      .order("minimum_quantity"),
  ]);

  if (criteriaResult.error || tiersResult.error) {
    throw new Error("Could not read product upcharge tiers.");
  }

  const criteria = (criteriaResult.data ?? []) as UpchargeCriterionRow[];
  const tiers = (tiersResult.data ?? []) as UpchargeTierRow[];

  return grids.map((grid): CatalogueUpcharge => ({
    adjustmentType: grid.adjustment_type,
    applicationLevel: grid.application_level,
    criteria: criteria
      .filter((criterion) => criterion.upcharge_grid_id === grid.id)
      .map((criterion): ProductUpchargeCriterion => ({
        criterionValue: criterion.criterion_value,
        operator: criterion.operator,
        optionValueId: criterion.option_value_id,
        taxonomyTermId: criterion.taxonomy_term_id,
      })),
    id: grid.id,
    name: grid.name,
    tiers: tiers
      .filter((tier) => tier.upcharge_grid_id === grid.id)
      .map((tier): ProductUpchargeTier => ({
        amount: Number(tier.amount),
        maximumQuantity: tier.maximum_quantity,
        minimumQuantity: tier.minimum_quantity,
      })),
  }));
}
