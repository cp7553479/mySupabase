import { describe, expect, it } from "vitest";

import { validateProductOptionSelections } from "@/lib/catalogue/option-validation";

const groups = [
  {
    id: "imprint",
    isRequired: true,
    maximumSelections: 1,
    minimumSelections: 1,
  },
  {
    id: "finish",
    isRequired: false,
    maximumSelections: 2,
    minimumSelections: 0,
  },
];

const values = [
  { id: "full-color", optionGroupId: "imprint" },
  { id: "laser", optionGroupId: "imprint" },
  { id: "matte", optionGroupId: "finish" },
  { id: "gloss", optionGroupId: "finish" },
  { id: "foil", optionGroupId: "finish" },
];

function selectedValues(optionValueIds: string[]) {
  return values.filter((value) => optionValueIds.includes(value.id));
}

describe("validateProductOptionSelections", () => {
  it("accepts a required single selection and two allowed multi-selections", () => {
    expect(
      validateProductOptionSelections(
        groups,
        selectedValues(["full-color", "matte", "gloss"]),
        [
          { optionGroupId: "imprint", optionValueId: "full-color" },
          { optionGroupId: "finish", optionValueId: "matte" },
          { optionGroupId: "finish", optionValueId: "gloss" },
        ],
        [],
      ),
    ).toBeNull();
  });

  it("rejects a missing required selection, an over-limit group and incompatible values", () => {
    expect(validateProductOptionSelections(groups, [], [], [])).toContain(
      "unavailable",
    );
    expect(
      validateProductOptionSelections(
        groups,
        selectedValues(["full-color", "matte", "gloss", "foil"]),
        [
          { optionGroupId: "imprint", optionValueId: "full-color" },
          { optionGroupId: "finish", optionValueId: "matte" },
          { optionGroupId: "finish", optionValueId: "gloss" },
          { optionGroupId: "finish", optionValueId: "foil" },
        ],
        [],
      ),
    ).toContain("unavailable");
    expect(
      validateProductOptionSelections(
        groups,
        selectedValues(["full-color", "matte"]),
        [
          { optionGroupId: "imprint", optionValueId: "full-color" },
          { optionGroupId: "finish", optionValueId: "matte" },
        ],
        [
          {
            message: "Matte finish requires laser marking.",
            relatedOptionValueId: "laser",
            ruleType: "requires",
            subjectOptionValueId: "matte",
          },
        ],
      ),
    ).toBe("Matte finish requires laser marking.");
  });
});
