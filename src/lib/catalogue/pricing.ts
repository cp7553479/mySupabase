export type ProductUpchargeCriterion = {
  criterionValue: string | null;
  operator: "equals" | "excludes" | "includes" | "not_equals";
  optionValueId: string | null;
  taxonomyTermId: string | null;
};

export type ProductUpchargeTier = {
  amount: number;
  maximumQuantity: number | null;
  minimumQuantity: number;
};

export type CatalogueUpcharge = {
  adjustmentType: "fixed" | "per_unit" | "percentage";
  applicationLevel: "item" | "option" | "service";
  criteria: ProductUpchargeCriterion[];
  id: string;
  name: string;
  tiers: ProductUpchargeTier[];
};

export type ProductEstimate = {
  adjustmentTotal: number;
  total: number;
  unitPrice: number;
};

function criterionMatches(
  criterion: ProductUpchargeCriterion,
  applicationLevel: CatalogueUpcharge["applicationLevel"],
  optionValueIds: Set<string>,
  serviceCodes: Set<string>,
) {
  if (criterion.optionValueId) {
    const selected = optionValueIds.has(criterion.optionValueId);

    return criterion.operator === "equals" || criterion.operator === "includes"
      ? selected
      : !selected;
  }

  if (criterion.criterionValue && applicationLevel === "service") {
    const selected = serviceCodes.has(criterion.criterionValue);

    return criterion.operator === "equals" || criterion.operator === "includes"
      ? selected
      : !selected;
  }

  return false;
}

function activeAmount(tiers: ProductUpchargeTier[], quantity: number) {
  return tiers.find(
    (tier) =>
      quantity >= tier.minimumQuantity &&
      (tier.maximumQuantity === null || quantity <= tier.maximumQuantity),
  )?.amount;
}

function toMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

export function calculateProductEstimate({
  baseUnitPrice,
  optionValueIds,
  quantity,
  serviceCodes,
  upcharges,
}: {
  baseUnitPrice: number;
  optionValueIds: string[];
  quantity: number;
  serviceCodes: string[];
  upcharges: CatalogueUpcharge[];
}): ProductEstimate {
  const options = new Set(optionValueIds);
  const services = new Set(serviceCodes);
  const baseTotal = baseUnitPrice * quantity;
  const adjustmentTotal = toMoney(
    upcharges.reduce((total, upcharge) => {
      if (
        !upcharge.criteria.length ||
        !upcharge.criteria.every((criterion) =>
          criterionMatches(
            criterion,
            upcharge.applicationLevel,
            options,
            services,
          ),
        )
      ) {
        return total;
      }

      const amount = activeAmount(upcharge.tiers, quantity);

      if (amount === undefined) return total;

      if (upcharge.adjustmentType === "fixed") return total + amount;
      if (upcharge.adjustmentType === "percentage") {
        return total + baseTotal * (amount / 100);
      }

      return total + amount * quantity;
    }, 0),
  );
  const total = toMoney(baseTotal + adjustmentTotal);

  return {
    adjustmentTotal,
    total,
    unitPrice: toMoney(total / quantity),
  };
}
