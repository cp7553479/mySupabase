import { describe, expect, it } from "vitest";

import { calculateProductEstimate } from "@/lib/catalogue/pricing";

const fullColorUpcharge = {
  adjustmentType: "per_unit" as const,
  applicationLevel: "option" as const,
  criteria: [
    {
      criterionValue: null,
      operator: "equals" as const,
      optionValueId: "full-color",
      taxonomyTermId: null,
    },
  ],
  id: "full-color-upcharge",
  name: "Full color imprint",
  tiers: [
    { amount: 0.65, maximumQuantity: 99, minimumQuantity: 50 },
    { amount: 0.45, maximumQuantity: 199, minimumQuantity: 100 },
    { amount: 0.3, maximumQuantity: null, minimumQuantity: 200 },
  ],
};

describe("calculateProductEstimate", () => {
  it("includes an option upcharge and follows its quantity tier", () => {
    expect(
      calculateProductEstimate({
        baseUnitPrice: 13.97,
        optionValueIds: ["full-color"],
        quantity: 50,
        serviceCodes: [],
        upcharges: [fullColorUpcharge],
      }),
    ).toEqual({ adjustmentTotal: 32.5, total: 731, unitPrice: 14.62 });

    expect(
      calculateProductEstimate({
        baseUnitPrice: 13.71,
        optionValueIds: ["full-color"],
        quantity: 100,
        serviceCodes: [],
        upcharges: [fullColorUpcharge],
      }),
    ).toEqual({ adjustmentTotal: 45, total: 1416, unitPrice: 14.16 });
  });

  it("keeps the base price when the triggering option is not selected", () => {
    expect(
      calculateProductEstimate({
        baseUnitPrice: 13.97,
        optionValueIds: ["silkscreen"],
        quantity: 50,
        serviceCodes: [],
        upcharges: [fullColorUpcharge],
      }),
    ).toEqual({ adjustmentTotal: 0, total: 698.5, unitPrice: 13.97 });
  });
});
